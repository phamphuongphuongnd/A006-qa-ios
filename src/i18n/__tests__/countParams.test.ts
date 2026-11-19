import { t, tn } from '..';

describe('count params (B-132)', () => {
  it('groups thousands in counts', () => {
    expect(t('reports.unsortedWarn', { count: 1620 })).toContain('1,620');
    expect(tn('reports.unsortedWarn', 20011)).toContain('20,011');
  });
  it('leaves small counts and non-count numbers alone', () => {
    expect(t('reports.unsortedWarn', { count: 12 })).toContain('12 ');
    expect(t('autoTrip.agoMin', { n: 1500 })).toBe('1500 min ago');
  });
});
