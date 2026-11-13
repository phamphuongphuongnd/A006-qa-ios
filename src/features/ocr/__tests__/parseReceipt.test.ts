import { OCR_FILL_CONFIDENCE } from '@/domain/receiptSignal';

import { moneyIn, parseReceipt, type RawLine, type RawOcr } from '../parseReceipt';

const NOW = new Date(2026, 10, 13, 18, 0).getTime(); // Fri 13 Nov 2026 18:00
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d).getTime();

/**
 * Builds OCR output the way ML Kit returns a till roll: each row is a left label and an optional right-hand figure
 * in a separate block, blocks out of order (all right column first) to prove the parser re-sorts by position.
 */
function receipt(rows: (string | [string, string])[], opts: { h?: number; shuffle?: boolean; noBoxes?: boolean; tilt?: number } = {}): RawOcr {
  const h = opts.h ?? 0.025;
  const left: RawLine[] = [];
  const right: RawLine[] = [];
  rows.forEach((r, i) => {
    const y = 0.05 + i * 0.04;
    const [l, rt] = typeof r === 'string' ? [r, null] : r;
    left.push({ text: l, box: opts.noBoxes ? null : { x: 0.08, y, w: 0.4, h } });
    if (rt) right.push({ text: rt, box: opts.noBoxes ? null : { x: 0.7, y: y + (opts.tilt ?? 0.002), w: 0.2, h } });
  });
  const lines = opts.noBoxes
    ? rows.flatMap((r) => (typeof r === 'string' ? [{ text: r, box: null }] : [{ text: r[0], box: null }, { text: r[1], box: null }]))
    : opts.shuffle === false
      ? left.concat(right)
      : right.concat(left);
  return { text: lines.map((l) => l.text).join('\n'), lines };
}

describe('moneyIn', () => {
  it('finds prices and skips dates, litres, rates and per-litre prices', () => {
    expect(moneyIn('TOTAL £72.40').map((m) => m.minor)).toEqual([7240]);
    expect(moneyIn('1,250.50').map((m) => m.minor)).toEqual([125050]);
    expect(moneyIn('72,40').map((m) => m.minor)).toEqual([7240]);
    expect(moneyIn('12.11.26')).toEqual([]);
    expect(moneyIn('45.20L UNLEADED')).toEqual([]);
    expect(moneyIn('VAT 20.00%')).toEqual([]);
    expect(moneyIn('1.429/L')).toEqual([]);
    expect(moneyIn('13:05')).toEqual([]);
    expect(moneyIn('$ 9.99').map((m) => m.minor)).toEqual([999]);
  });
});

describe('parseReceipt — UK fuel receipt', () => {
  const shell = receipt([
    'SHELL',
    'M62 J25 BRIGHOUSE',
    'HD6 4JX',
    'VAT REG NO 235 7632 55',
    ['PUMP 3 UNLEADED', '£72.40'],
    '50.70 L @ 142.9p/L',
    ['SUBTOTAL', '£60.33'],
    ['VAT @ 20%', '£12.07'],
    ['TOTAL', '£72.40'],
    ['VISA CONTACTLESS', '£72.40'],
    '09/11/26 06:12',
    'THANK YOU',
  ]);

  it('reads total, merchant and date confidently', () => {
    const r = parseReceipt(shell, 'UK', NOW);
    expect(r.amountMinor).toBe(7240);
    expect(r.confidence.amount).toBeGreaterThanOrEqual(0.9);
    expect(r.merchant).toBe('Shell');
    expect(r.confidence.merchant).toBeGreaterThanOrEqual(OCR_FILL_CONFIDENCE);
    expect(r.date).toBe(day(2026, 11, 9));
    expect(r.minutes).toBe(6 * 60 + 12);
    expect(r.confidence.date).toBeGreaterThanOrEqual(OCR_FILL_CONFIDENCE);
  });

  it('pairs labels with figures on a tilted photo (figure column ~half a line lower)', () => {
    const tilted = receipt([['SUBTOTAL', '£60.33'], ['VAT @ 20%', '£12.07'], ['TOTAL', '£72.40'], ['CARD', '£72.40'], 'SHELL'], { tilt: 0.018 });
    expect(parseReceipt(tilted, 'UK', NOW).amountMinor).toBe(7240);
    const up = receipt([['SUBTOTAL', '£60.33'], ['TOTAL', '£72.40'], ['CASH', '£80.00']], { tilt: -0.018 });
    expect(parseReceipt(up, 'UK', NOW).amountMinor).toBe(7240);
  });

  it('works without boxes (line order only)', () => {
    const r = parseReceipt(receipt([['TOTAL', '£72.40'], ['CARD', '£72.40'], 'SHELL M62', '09/11/2026'], { noBoxes: true }), 'UK', NOW);
    expect(r.amountMinor).toBe(7240);
    expect(r.merchant).toBe('Shell');
    expect(r.date).toBe(day(2026, 11, 9));
  });
});

describe('parseReceipt — supermarket with cash and change', () => {
  it('takes TOTAL, not the cash tendered or the change', () => {
    const r = parseReceipt(
      receipt([
        'TESCO EXPRESS',
        'LEEDS ROAD',
        ['MEAL DEAL', '3.85'],
        ['WATER 1.5L', '1.10'],
        ['TOTAL TO PAY', '£4.95'],
        ['CASH', '£10.00'],
        ['CHANGE DUE', '£5.05'],
        '13 Nov 2026 12:41',
      ]),
      'UK',
      NOW,
    );
    expect(r.amountMinor).toBe(495);
    expect(r.confidence.amount).toBeGreaterThanOrEqual(0.9);
    expect(r.merchant).toBe('Tesco');
    expect(r.date).toBe(day(2026, 11, 13));
    expect(r.minutes).toBe(12 * 60 + 41);
  });

  it('total savings and item counts are never the total', () => {
    const r = parseReceipt(receipt(['ASDA', ['TOTAL SAVINGS', '£12.00'], ['ITEMS 4', ''], ['BALANCE DUE', '£8.40']]), 'UK', NOW);
    expect(r.amountMinor).toBe(840);
  });

  it('"TOTAL INC VAT" is the total, "TOTAL VAT" is not', () => {
    const r = parseReceipt(receipt(['HALFORDS', ['TOTAL VAT', '£4.00'], ['TOTAL INC VAT', '£24.00']]), 'UK', NOW);
    expect(r.amountMinor).toBe(2400);
  });
});

describe('parseReceipt — unknown merchant and labels', () => {
  it('uses the first plausible top line for an unknown shop, title-cased', () => {
    const r = parseReceipt(receipt(['BRIGHOUSE VAN PARTS', '12 BRADFORD ROAD', 'TEL 01484 123456', ['TOTAL', '£18.99'], '10/11/2026']), 'UK', NOW);
    expect(r.merchant).toBe('Brighouse Van Parts');
    expect(r.confidence.merchant).toBeGreaterThanOrEqual(OCR_FILL_CONFIDENCE);
    expect(r.amountMinor).toBe(1899);
  });

  it('a single unlabelled figure (parking ticket) is probably the amount', () => {
    const r = parseReceipt(receipt(['PAY AND DISPLAY', 'VALID UNTIL 14:30', '£3.50']), 'UK', NOW);
    expect(r.amountMinor).toBe(350);
    expect(r.confidence.amount).toBeGreaterThanOrEqual(OCR_FILL_CONFIDENCE);
  });

  it('several unlabelled figures: not confident enough to fill', () => {
    const r = parseReceipt(receipt(['ITEM A 2.00', 'ITEM B 3.00', 'ITEM C 9.00']), 'UK', NOW);
    expect(r.confidence.amount).toBeLessThan(OCR_FILL_CONFIDENCE);
  });

  it('nothing readable → empty, zero confidence (silent)', () => {
    expect(parseReceipt({ text: '', lines: [] }, 'UK', NOW)).toMatchObject({ amountMinor: null, merchant: null, date: null });
    expect(parseReceipt(null, 'UK', NOW).confidence).toEqual({ amount: 0, merchant: 0, date: 0 });
    const blur = parseReceipt(receipt(['~~ ..', '#@!']), 'UK', NOW);
    expect(blur.amountMinor).toBeNull();
    expect(blur.merchant).toBeNull();
    expect(blur.date).toBeNull();
  });
});

describe('parseReceipt — dates', () => {
  const dateOf = (line: string, region: 'UK' | 'US' = 'UK') => parseReceipt(receipt(['X', line]), region, NOW);

  it('reads UK day-first and US month-first, swapping impossible orders', () => {
    expect(dateOf('03/11/26').date).toBe(day(2026, 11, 3));
    expect(dateOf('11/03/26', 'US').date).toBe(day(2026, 11, 3));
    expect(dateOf('11/13/2026', 'UK').date).toBe(day(2026, 11, 13));
    expect(dateOf('13/11/2026', 'US').date).toBe(day(2026, 11, 13));
    expect(dateOf('2026-11-09').date).toBe(day(2026, 11, 9));
    expect(dateOf('9 Nov 2026').date).toBe(day(2026, 11, 9));
    expect(dateOf('Nov 9, 2026', 'US').date).toBe(day(2026, 11, 9));
    expect(dateOf('09-NOV-26').date).toBe(day(2026, 11, 9));
  });

  it('no year → latest such day not in the future', () => {
    expect(dateOf('9 Nov').date).toBe(day(2026, 11, 9));
    expect(dateOf('20 Dec').date).toBe(day(2025, 12, 20));
  });

  it('future or very old dates are not trusted; card expiry lines are skipped', () => {
    expect(dateOf('01/01/2027').confidence.date).toBeLessThan(OCR_FILL_CONFIDENCE);
    expect(dateOf('01/01/2024').confidence.date).toBeLessThan(OCR_FILL_CONFIDENCE);
    expect(dateOf('EXP 12/11/29').date).toBeNull();
    expect(dateOf('31/02/2026').date).toBeNull();
  });

  it('reads 12-hour times', () => {
    expect(dateOf('11/09/2026 3:05 PM', 'US').minutes).toBe(15 * 60 + 5);
    expect(dateOf('11/09/2026 12:10 AM', 'US').minutes).toBe(10);
  });
});

describe('parseReceipt — US', () => {
  it('reads a US gas receipt', () => {
    const r = parseReceipt(
      receipt(['CHEVRON', '1234 MAIN ST', 'DALLAS TX 75201', ['REGULAR 12.345 GAL', ''], ['PRICE/GAL', '$3.199'], ['FUEL SALE', '$39.49'], ['TOTAL', '$39.49'], ['MASTERCARD', '$39.49'], '11/12/2026 07:15 AM']),
      'US',
      NOW,
    );
    expect(r.amountMinor).toBe(3949);
    expect(r.confidence.amount).toBeGreaterThanOrEqual(0.95);
    expect(r.merchant).toBe('Chevron');
    expect(r.date).toBe(day(2026, 11, 12));
    expect(r.minutes).toBe(7 * 60 + 15);
  });
});
