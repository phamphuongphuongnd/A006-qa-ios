import { createEntry, getEntry, listReceipts } from '@/db/entriesRepo';
import { makeTestDb } from '@/db/testing/testDb';
import { signalsOf } from '@/domain/receiptSignal';

import { allowanceResetsOn, mergeReadings, photoSlots, planFill, planIsEmpty, receiptAt } from '../fill';
import type { ParsedReceipt } from '../parseReceipt';
import { attachReadings } from '../reader';
import { afterSave, rulesHook } from '../rulesHook';
import { fillEntryOcr, OCR_TEXT_MAX, setReceiptOcrText } from '../repo';

const NOW = new Date(2026, 10, 13, 18, 0).getTime();
const NOV9 = new Date(2026, 10, 9).getTime();

const reading = (p: Partial<ParsedReceipt> = {}): ParsedReceipt => ({
  amountMinor: 7240,
  merchant: 'Shell',
  date: NOV9,
  minutes: 6 * 60 + 12,
  confidence: { amount: 0.95, merchant: 0.92, date: 0.9 },
  ...p,
});

describe('planFill (P1-12)', () => {
  const empty = { amountMinor: 0, note: '', at: null };

  it('empty form: fills amount, note and date + printed time', () => {
    expect(planFill(empty, reading(), NOW)).toEqual({ amountMinor: 7240, note: 'Shell', at: NOV9 + (6 * 60 + 12) * 60_000 });
  });

  it('a different typed amount → chip only; the same amount → nothing', () => {
    expect(planFill({ ...empty, amountMinor: 7000 }, reading(), NOW)).toMatchObject({ chipMinor: 7240 });
    expect(planFill({ ...empty, amountMinor: 7000 }, reading(), NOW).amountMinor).toBeUndefined();
    expect(planFill({ ...empty, amountMinor: 7240 }, reading(), NOW).chipMinor).toBeUndefined();
  });

  it('never overwrites a typed note or a picked date', () => {
    const p = planFill({ amountMinor: 0, note: 'M62 fuel', at: NOW - 3600_000 }, reading(), NOW);
    expect(p.note).toBeUndefined();
    expect(p.at).toBeUndefined();
  });

  it('low-confidence fields stay silent', () => {
    const p = planFill(empty, reading({ confidence: { amount: 0.4, merchant: 0.5, date: 0.3 } }), NOW);
    expect(planIsEmpty(p)).toBe(true);
  });

  it('receipt dated today: keeps "Now" unless the printed time is clearly earlier', () => {
    const today = new Date(2026, 10, 13).getTime();
    expect(receiptAt(today, null, NOW)).toBeNull();
    expect(receiptAt(today, 17 * 60 + 55, NOW)).toBeNull();
    expect(receiptAt(today, 7 * 60, NOW)).toBe(today + 7 * 3600_000);
    expect(receiptAt(today, 19 * 60, NOW)).toBeNull();
  });

  it('older receipt without a time lands at midday; a future date never moves the entry', () => {
    expect(receiptAt(NOV9, null, NOW)).toBe(NOV9 + 12 * 3600_000);
    expect(receiptAt(new Date(2026, 10, 20).getTime(), null, NOW)).toBeNull();
    // A receipt from the tax year before last (catching up before 31 Jan): keeps its own date, not "Now".
    const may2025 = new Date(2025, 4, 2).getTime();
    expect(receiptAt(may2025, 9 * 60, NOW)).toBe(may2025 + 9 * 3600_000);
  });
});

describe('mergeReadings (several photos)', () => {
  it('takes each field from the first photo that read it, the photo with the total first', () => {
    const a = reading({ amountMinor: null, confidence: { amount: 0, merchant: 0.92, date: 0.9 } });
    const b = reading({ amountMinor: 1500, merchant: 'Tesco', date: null, confidence: { amount: 0.9, merchant: 0.9, date: 0 } });
    expect(mergeReadings([null, a, b])).toEqual({ ocrAmountMinor: 1500, ocrMerchant: 'Tesco', ocrDate: NOV9 });
    expect(mergeReadings([null, a])).toEqual({ ocrAmountMinor: null, ocrMerchant: 'Shell', ocrDate: NOV9 });
    expect(mergeReadings([])).toEqual({ ocrAmountMinor: null, ocrMerchant: null, ocrDate: null });
  });

  it('shop and date come from the photo that gave the total (A13: Tesco photo without total + FreshHarvest)', () => {
    const tesco = reading({ amountMinor: null, merchant: 'Tesco', confidence: { amount: 0.4, merchant: 0.92, date: 0.9 } });
    const fresh = reading({ amountMinor: 2174, merchant: 'FreshHarvest Market', date: null, confidence: { amount: 0.9, merchant: 0.62, date: 0 } });
    expect(mergeReadings([tesco, fresh])).toEqual({ ocrAmountMinor: 2174, ocrMerchant: 'FreshHarvest Market', ocrDate: NOV9 });
  });
});

describe('planFill with a second photo', () => {
  it('a photo with the total replaces the shop a photo without total put there, unless the driver edited it', () => {
    const fresh = reading({ amountMinor: 2174, merchant: 'FreshHarvest Market', date: null, confidence: { amount: 0.9, merchant: 0.62, date: 0 } });
    const form = { amountMinor: 0, note: 'Tesco', at: null };
    expect(planFill({ ...form, weak: { note: true, at: false } }, fresh, NOW).note).toBe('FreshHarvest Market');
    expect(planFill({ ...form, weak: { note: false, at: false } }, fresh, NOW).note).toBeUndefined();
    expect(planFill(form, fresh, NOW).note).toBeUndefined();
  });
});

describe('photoSlots (P1-4, Q21)', () => {
  it('free: counts photos waiting in this capture', () => {
    expect(photoSlots(14, 0)).toEqual({ canAdd: 3, locked: false, left: 14, low: false });
    expect(photoSlots(14, 2)).toEqual({ canAdd: 1, locked: false, left: 12, low: false });
    expect(photoSlots(4, 1)).toEqual({ canAdd: 2, locked: false, left: 3, low: true });
    expect(photoSlots(1, 1)).toEqual({ canAdd: 0, locked: true, left: 0, low: true });
    expect(photoSlots(0, 0)).toMatchObject({ canAdd: 0, locked: true, left: 0 });
  });

  it('Pro: no limit, only 3 per entry', () => {
    expect(photoSlots(null, 0)).toEqual({ canAdd: 3, locked: false, left: null, low: false });
    expect(photoSlots(null, 3)).toEqual({ canAdd: 0, locked: false, left: null, low: false });
  });

  it('allowance resets on the 1st of next month', () => {
    expect(allowanceResetsOn(NOW)).toBe(new Date(2026, 11, 1).getTime());
    expect(allowanceResetsOn(new Date(2026, 11, 31).getTime())).toBe(new Date(2027, 0, 1).getTime());
  });
});

describe('OCR persistence', () => {
  const base = { type: 'expense' as const, amountMinor: 7240, currency: 'GBP' as const };

  it('stores text per photo and fills only empty ocr_* columns', () => {
    const db = makeTestDb();
    const e = createEntry(db, { ...base, receiptPaths: ['a.jpg', 'b.jpg'], ocrMerchant: 'Shell' }, NOW);
    setReceiptOcrText(db, e.id, 'a.jpg', 'SHELL\nTOTAL 72.40');
    setReceiptOcrText(db, e.id, 'b.jpg', 'x'.repeat(OCR_TEXT_MAX + 50));
    const rs = listReceipts(db, e.id);
    expect(rs.find((r) => r.filePath === 'a.jpg')!.ocrText).toBe('SHELL\nTOTAL 72.40');
    expect(rs.find((r) => r.filePath === 'b.jpg')!.ocrText!.length).toBe(OCR_TEXT_MAX);

    expect(fillEntryOcr(db, e.id, { ocrAmountMinor: 7240, ocrMerchant: 'Tesco', ocrDate: NOV9 })).toBe(true);
    const row = getEntry(db, e.id)!;
    expect(row).toMatchObject({ ocrAmountMinor: 7240, ocrMerchant: 'Shell', ocrDate: NOV9, updatedAt: NOW });
    // S2 reads it through the shared contract.
    expect(signalsOf(row).merchantKey).toBe('shell');
    expect(fillEntryOcr(db, e.id, { ocrAmountMinor: 1, ocrMerchant: 'X', ocrDate: 1 })).toBe(false);
    expect(fillEntryOcr(db, 'missing', { ocrAmountMinor: 1, ocrMerchant: null, ocrDate: null })).toBe(false);
  });

  it('attachReadings writes late readings after Save and survives a deleted entry', async () => {
    const db = makeTestDb();
    const e = createEntry(db, { ...base, receiptPaths: ['a.jpg'] }, NOW);
    await attachReadings(db, e.id, [{ filePath: 'a.jpg', read: Promise.resolve({ reading: reading(), text: 'SHELL' }) }]);
    expect(getEntry(db, e.id)).toMatchObject({ ocrAmountMinor: 7240, ocrMerchant: 'Shell', ocrDate: NOV9 });
    expect(listReceipts(db, e.id)[0].ocrText).toBe('SHELL');
    await expect(attachReadings(db, 'gone', [{ filePath: 'a.jpg', read: Promise.reject(new Error('x')) }])).resolves.toBeUndefined();
  });
});

describe('rules hook (S2 applyRulesOnSave seam)', () => {
  afterEach(() => {
    rulesHook.apply = null;
    rulesHook.undo = null;
  });

  it('is a no-op until S2 plugs in, never throws', () => {
    const db = makeTestDb();
    expect(afterSave(db, 'x')).toBeNull();
    rulesHook.apply = () => {
      throw new Error('boom');
    };
    expect(afterSave(db, 'x')).toBeNull();
  });

  it('re-applies rules after a late reading filled the merchant', async () => {
    const db = makeTestDb();
    const e = createEntry(db, { type: 'expense', amountMinor: 7240, currency: 'GBP', receiptPaths: ['a.jpg'] }, NOW);
    const seen: (string | null)[] = [];
    rulesHook.apply = (d, id) => {
      seen.push(getEntry(d, id)!.ocrMerchant);
      return null;
    };
    await attachReadings(db, e.id, [{ filePath: 'a.jpg', read: Promise.resolve({ reading: reading(), text: 'SHELL' }) }], afterSave);
    expect(seen).toEqual(['Shell']);
    // Nothing new filled → rules not run again.
    await attachReadings(db, e.id, [{ filePath: 'a.jpg', read: Promise.resolve({ reading: reading(), text: 'SHELL' }) }], afterSave);
    expect(seen).toHaveLength(1);
  });
});
