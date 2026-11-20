import { DEFAULT_CATEGORIES } from '../categories';
import { amountClose, mostUsed, normaliseNote, sortChoice, suggest, type SortedEntry, type SuggestCategory } from '../suggest';

const cats: SuggestCategory[] = DEFAULT_CATEGORIES.UK.map((c, i) => ({ id: c.key, type: c.type, key: c.key, hidden: false, order: i }));

describe('normaliseNote', () => {
  it('lowercases and strips punctuation', () => {
    expect(normaliseNote('  Shell, M62!! ')).toBe('shell m62');
    expect(normaliseNote('AT&T')).toBe('at&t');
  });
});

describe('suggest', () => {
  it('uses built-in keywords with no history', () => {
    expect(suggest({ type: 'expense', note: 'Shell M62', amountMinor: 7240 }, cats, []).categoryIds[0]).toBe('fuel');
    expect(suggest({ type: 'expense', note: 'RingGo Leeds', amountMinor: 350 }, cats, []).categoryIds[0]).toBe('parking');
    expect(suggest({ type: 'income', note: 'Amazon Flex payout', amountMinor: 18650 }, cats, []).categoryIds[0]).toBe('delivery_income');
  });

  it('only suggests categories of the entry type, max 3, never hidden', () => {
    const hidden = cats.map((c) => (c.id === 'fuel' ? { ...c, hidden: true } : c));
    const s = suggest({ type: 'expense', note: 'Shell', amountMinor: 100 }, hidden, []);
    expect(s.categoryIds).toHaveLength(3);
    expect(s.categoryIds).not.toContain('fuel');
    expect(s.categoryIds.every((id) => cats.find((c) => c.id === id)?.type === 'expense')).toBe(true);
  });

  it("the user's own history beats built-in keywords", () => {
    // This user files Tesco under "equipment" (bought gloves there), even though no keyword says so.
    const history: SortedEntry[] = [
      { type: 'expense', note: 'Tesco', amountMinor: 1500, categoryId: 'equipment', scope: 'work' },
      { type: 'expense', note: 'tesco express', amountMinor: 1200, categoryId: 'equipment', scope: 'work' },
    ];
    expect(suggest({ type: 'expense', note: 'Tesco', amountMinor: 1400 }, cats, history).categoryIds[0]).toBe('equipment');
    // History also outranks the "fuel" keyword when the user consistently recategorises.
    const shellHistory: SortedEntry[] = Array.from({ length: 3 }, () => ({
      type: 'expense' as const, note: 'Shell snacks', amountMinor: 300, categoryId: 'other_expense', scope: 'personal' as const,
    }));
    const s = suggest({ type: 'expense', note: 'Shell snacks', amountMinor: 300 }, cats, shellHistory);
    expect(s.categoryIds[0]).toBe('other_expense');
    expect(s.scope).toBe('personal');
  });

  it('falls back to most used, then default order', () => {
    const history: SortedEntry[] = [
      { type: 'expense', note: 'x', amountMinor: 1, categoryId: 'phone', scope: 'work' },
      { type: 'expense', note: 'y', amountMinor: 1, categoryId: 'phone', scope: 'work' },
    ];
    const s = suggest({ type: 'expense', note: '', amountMinor: 500 }, cats, history);
    expect(s.categoryIds[0]).toBe('phone');
    expect(s.categoryIds[1]).toBe('fuel');
    expect(s.scope).toBeNull();
  });

  // Step 4 · TC-100
  it('ignores case and punctuation in the note', () => {
    expect(suggest({ type: 'expense', note: 'SHELL, M62!', amountMinor: 7240 }, cats, []).categoryIds[0]).toBe('fuel');
  });

  // Step 4 · TC-104: a matching amount (±10%) tips the balance between two categories with the same note.
  it('a matching amount (within 10%) beats an equally recent different amount', () => {
    const history: SortedEntry[] = [
      { type: 'expense', note: 'Tesco', amountMinor: 1500, categoryId: 'equipment', scope: 'work' },
      { type: 'expense', note: 'Tesco', amountMinor: 6000, categoryId: 'fuel', scope: 'work' },
    ];
    // 5,800 is within 10% of 6,000 → fuel; 1,450 is within 10% of 1,500 → equipment.
    expect(suggest({ type: 'expense', note: 'Tesco', amountMinor: 5800 }, cats, history).categoryIds[0]).toBe('fuel');
    expect(suggest({ type: 'expense', note: 'Tesco', amountMinor: 1450 }, cats, history).categoryIds[0]).toBe('equipment');
  });

  // Step 4 · TC-105
  it('suggests work/personal from history, and nothing on a tie', () => {
    const work: SortedEntry = { type: 'expense', note: 'Greggs', amountMinor: 420, categoryId: 'other_expense', scope: 'work' };
    const personal: SortedEntry = { ...work, scope: 'personal' };
    expect(suggest({ type: 'expense', note: 'Greggs', amountMinor: 420 }, cats, [personal, personal]).scope).toBe('personal');
    expect(suggest({ type: 'expense', note: 'Greggs', amountMinor: 420 }, cats, [work]).scope).toBe('work');
    // Same note, same amount, one each: the newer one weighs a bit more, so a pure tie only happens with no signal.
    expect(suggest({ type: 'expense', note: 'Unrelated', amountMinor: 420 }, cats, [work, personal]).scope).toBeNull();
  });

  it('matches multi-word keywords as phrases only', () => {
    expect(suggest({ type: 'expense', note: 'Kwik Fit tyres', amountMinor: 18999 }, cats, []).categoryIds[0]).toBe('repairs');
    expect(suggest({ type: 'income', note: 'flexible hours', amountMinor: 100 }, cats, []).categoryIds[0]).not.toBe('tips');
  });
});

describe('suggest — bản 2 signals (F-07)', () => {
  const h = (note: string, amountMinor: number, categoryId: string, merchant: string | null = null): SortedEntry => ({
    type: 'expense', note, amountMinor, categoryId, scope: 'work', merchant,
  });

  it('the amount alone (±2%) points to what was sorted at that price', () => {
    const history = [h('weekly thing', 2499, 'phone')];
    expect(suggest({ type: 'expense', note: 'Direct debit', amountMinor: 2499 }, cats, history).categoryIds[0]).toBe('phone');
    expect(suggest({ type: 'expense', note: 'Direct debit', amountMinor: 2540 }, cats, history).categoryIds[0]).toBe('phone'); // +1.6%
    // +4%: no amount signal, same ranking as a far-off amount.
    expect(suggest({ type: 'expense', note: 'Direct debit', amountMinor: 2600 }, cats, history)).toEqual(
      suggest({ type: 'expense', note: 'Direct debit', amountMinor: 99999 }, cats, history),
    );
    expect(amountClose(1000, 1020)).toBe(true);
    expect(amountClose(1000, 1021)).toBe(false);
  });

  it('the OCR total counts as a second amount, the OCR merchant as words', () => {
    const history = [h('Kwik Fit', 18999, 'repairs')];
    expect(suggest({ type: 'expense', note: '', amountMinor: 100, ocrAmountMinor: 18999 }, cats, history).categoryIds[0]).toBe('repairs');
    const viaMerchant = [h('', 6000, 'equipment', 'TESCO STORES LTD')];
    expect(suggest({ type: 'expense', note: 'shop', amountMinor: 900, merchant: 'Tesco Express' }, cats, viaMerchant).categoryIds[0]).toBe('equipment');
  });

  it('Most used = 90-day usage, then category order', () => {
    const usage = [
      { categoryId: 'parking', count: 5 },
      { categoryId: 'fuel', count: 9 },
      { categoryId: 'delivery_income', count: 20 },
    ];
    const top = mostUsed('expense', cats, usage);
    expect(top.slice(0, 2)).toEqual(['fuel', 'parking']);
    expect(top).toHaveLength(3);
    expect(mostUsed('expense', cats, [])).toEqual(cats.filter((c) => c.type === 'expense').slice(0, 3).map((c) => c.id));
  });
});

// L1 (verify dev 049dff0, 2026-11-20): an entry nothing is known about must not get a gold "Suggested" chip, nor be
// swept into "Accept all suggestions" — a first "Greggs" was offered Fuel only because Fuel heads the list.
describe('suggest — only a real signal is a suggestion (L1)', () => {
  const sorted = (note: string, amountMinor: number, categoryId: string): SortedEntry => ({
    type: 'expense', note, amountMinor, categoryId, scope: 'work',
  });
  // Two Shell receipts already filed under Fuel (what the emulator run had when Greggs came up).
  const history = [sorted('Shell', 3810, 'fuel'), sorted('Shell', 4520, 'fuel')];
  const usage = [{ categoryId: 'fuel', count: 2 }];

  it('a never-sorted note with no keyword, amount or receipt match is not confident', () => {
    const s = suggest({ type: 'expense', note: 'Greggs', amountMinor: 420 }, cats, history);
    expect(s.confident).toBe(false);
    expect(s.categoryIds[0]).toBe('fuel'); // ranking unchanged: frequency still orders the chips
    expect(suggest({ type: 'expense', note: '', amountMinor: 500 }, cats, []).confident).toBe(false);
  });

  it('sortChoice falls back to "Most used" (90-day usage) for it', () => {
    const c = sortChoice({ type: 'expense', note: 'Greggs', amountMinor: 420 }, cats, history, usage);
    expect(c.kind).toBe('mostUsed');
    expect(c.categoryIds).toEqual(mostUsed('expense', cats, usage));
    expect(c.scope).toBeNull();
  });

  it('history, keyword, amount and OCR signals stay "Suggested"', () => {
    const viaHistory = sortChoice({ type: 'expense', note: 'Shell M62', amountMinor: 5230 }, cats, history, usage);
    expect(viaHistory).toEqual({ categoryIds: expect.arrayContaining(['fuel']), scope: 'work', kind: 'suggested' });
    expect(viaHistory.categoryIds[0]).toBe('fuel');
    expect(suggest({ type: 'expense', note: 'RingGo Leeds', amountMinor: 350 }, cats, []).confident).toBe(true); // keyword
    expect(suggest({ type: 'expense', note: 'Direct debit', amountMinor: 3810 }, cats, history).confident).toBe(true); // amount ±2%
    const ocr = [sorted('Kwik Fit', 18999, 'repairs')];
    expect(suggest({ type: 'expense', note: '', amountMinor: 100, ocrAmountMinor: 18999 }, cats, ocr).confident).toBe(true);
    expect(suggest({ type: 'expense', note: 'x', amountMinor: 1, merchant: 'Shell UK' }, cats, history).confident).toBe(true);
  });

  it('a real signal outranks any usage count (Phương 2026-11-20)', () => {
    // 499 Fuel sorts (usage) vs one Phone bill at the same price (amount signal): Phone is the suggestion, Fuel second.
    const heavy = [sorted('bill', 2499, 'phone'), ...Array.from({ length: 499 }, () => sorted('fill up', 5000, 'fuel'))];
    const s = suggest({ type: 'expense', note: 'Direct debit', amountMinor: 2499 }, cats, heavy);
    expect(s.categoryIds.slice(0, 2)).toEqual(['phone', 'fuel']);
    expect(s.confident).toBe(true);
    const c = sortChoice({ type: 'expense', note: 'Direct debit', amountMinor: 2499 }, cats, heavy, [{ categoryId: 'fuel', count: 499 }]);
    expect(c.kind).toBe('suggested');
    expect(c.categoryIds[0]).toBe('phone');
    // Same history, no signal at all: usage orders the chips and it stays "Most used".
    expect(sortChoice({ type: 'expense', note: 'Greggs', amountMinor: 420 }, cats, heavy, [{ categoryId: 'fuel', count: 499 }]).kind).toBe('mostUsed');
  });

  it('two signalled categories: the stronger signal wins, usage only breaks a tie', () => {
    // Keyword "Shell" → Fuel (2) vs one same-note history entry for Other expenses (3 × 1 × 2 + 2 = 8): history wins even
    // though Fuel was used far more.
    const h = [sorted('Shell snacks', 300, 'other_expense'), ...Array.from({ length: 200 }, () => sorted('diesel', 6000, 'fuel'))];
    expect(suggest({ type: 'expense', note: 'Shell snacks', amountMinor: 300 }, cats, h).categoryIds.slice(0, 2)).toEqual(['other_expense', 'fuel']);
  });
});
