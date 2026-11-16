import { t, tn } from '..';

// Copy fixed during P5 that must match product.md v2 word for word.
describe('product.md v2 copy', () => {
  // B-39 · TC-218: S-01b UK card names MTD, not only SA103
  it('S-01b region cards', () => {
    expect(t('onboarding.regionUKSub')).toBe('£ · Tax year 6 Apr – 5 Apr · Self Assessment & MTD');
  });
});

// B-42 · TC-248 / TC-249: never "1 entries".
describe('singular counts', () => {
  it('uses the One string for a count of 1', () => {
    expect(tn('sort.acceptAllConfirm', 1)).toBe('Apply the suggested category to 1 entry?');
    expect(tn('sort.acceptAllConfirm', 3)).toBe('Apply suggested categories to 3 entries?');
    expect(tn('sort.sortedMany', 1)).toBe('Sorted 1 entry');
    expect(tn('sortV2.autoAndRecurring', 1, { auto: 1, recurring: 1 })).toBe('1 auto-sorted · 1 recurring entry added');
    expect(tn('sortV2.autoAndRecurring', 2, { auto: 1, recurring: 2 })).toBe('1 auto-sorted · 2 recurring entries added');
    expect(tn('sortV2.recurringOnly', 1, { recurring: 1 })).toBe('1 recurring entry added');
    expect(tn('sortV2.undoneAll', 1)).toBe('1 entry back in the Sort queue');
    expect(tn('entries.categorySet', 1)).toBe('Category set on 1 entry');
    expect(tn('entries.scopeSet', 1, { scope: 'Work' })).toBe('1 entry set to Work');
    expect(tn('settings.backupDays', 1, { days: 1 })).toBe('1 day');
  });

  it('falls back to the plural string when no One string exists', () => {
    expect(tn('sortV2.autoOnly', 1, { auto: 1 })).toBe('1 auto-sorted');
  });
});
