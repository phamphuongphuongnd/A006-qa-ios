import { t } from '..';

// Copy fixed during P5 that must match product.md v2 word for word.
describe('product.md v2 copy', () => {
  // B-39 · TC-218: S-01b UK card names MTD, not only SA103
  it('S-01b region cards', () => {
    expect(t('onboarding.regionUKSub')).toBe('£ · Tax year 6 Apr – 5 Apr · Self Assessment & MTD');
  });
});
