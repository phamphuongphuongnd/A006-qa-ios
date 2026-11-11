import { DEFAULT_CATEGORIES } from '../categories';
import { normaliseNote, suggest, type SortedEntry, type SuggestCategory } from '../suggest';

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

  it('matches multi-word keywords as phrases only', () => {
    expect(suggest({ type: 'expense', note: 'Kwik Fit tyres', amountMinor: 18999 }, cats, []).categoryIds[0]).toBe('repairs');
    expect(suggest({ type: 'income', note: 'flexible hours', amountMinor: 100 }, cats, []).categoryIds[0]).not.toBe('tips');
  });
});
