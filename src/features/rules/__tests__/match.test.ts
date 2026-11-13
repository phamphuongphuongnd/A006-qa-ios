import { checkRule, offerFrom, offerKey, offerLabel, pickRule, ruleMatches, textMatches, type RuleLike, type SortedForOffer } from '../match';
import { routeScope, sameRoute } from '../knownRoutes';

const rule = (p: Partial<RuleLike>): RuleLike => ({
  id: p.matchText ?? 'r',
  matchText: 'Shell',
  type: 'expense',
  minMinor: null,
  maxMinor: null,
  categoryId: 'fuel',
  scope: 'work',
  enabled: true,
  hits: 0,
  createdAt: 0,
  ...p,
});
const entry = (note: string, amountMinor = 5000, ocrMerchant: string | null = null) => ({ type: 'expense' as const, note, amountMinor, ocrMerchant });

describe('rule matching', () => {
  it('matches whole words, case-insensitive, in note or receipt merchant', () => {
    expect(textMatches('Shell', 'shell m62')).toBe(true);
    expect(textMatches('shell', 'shellfish')).toBe(false);
    expect(textMatches('Kwik Fit', 'kwik fit tyres')).toBe(true);
    expect(ruleMatches(rule({}), entry('SHELL, M62'))).toBe(true);
    expect(ruleMatches(rule({}), entry('', 5000, 'SHELL UK OIL PRODUCTS LTD'))).toBe(true);
    expect(ruleMatches(rule({}), entry('Tesco'))).toBe(false);
  });

  it('respects type, amount range, enabled and a missing category', () => {
    expect(ruleMatches(rule({ type: 'income' }), entry('Shell'))).toBe(false);
    expect(ruleMatches(rule({ minMinor: 2000, maxMinor: 15000 }), entry('Shell', 1999))).toBe(false);
    expect(ruleMatches(rule({ minMinor: 2000, maxMinor: 15000 }), entry('Shell', 2000))).toBe(true);
    expect(ruleMatches(rule({ minMinor: 2000, maxMinor: 15000 }), entry('Shell', 15001))).toBe(false);
    expect(ruleMatches(rule({ enabled: false }), entry('Shell'))).toBe(false);
    expect(ruleMatches(rule({ enabled: false }), entry('Shell'), { ignoreEnabled: true })).toBe(true);
    expect(ruleMatches(rule({ categoryId: null }), entry('Shell'))).toBe(false);
  });

  it('picks the most specific rule', () => {
    const general = rule({ id: 'g', matchText: 'Shell', categoryId: 'fuel', hits: 50 });
    const specific = rule({ id: 's', matchText: 'Shell shop', categoryId: 'other', hits: 1 });
    expect(pickRule([general, specific], entry('Shell shop sandwich'))?.id).toBe('s');
    expect(pickRule([general, specific], entry('Shell M62'))?.id).toBe('g');
    const ranged = rule({ id: 'rg', matchText: 'Shell', minMinor: 3000, categoryId: 'fuel' });
    expect(pickRule([general, ranged], entry('Shell', 4000))?.id).toBe('rg');
    expect(pickRule([general, ranged], entry('Shell', 400))?.id).toBe('g');
    expect(pickRule([], entry('Shell'))).toBeNull();
  });

  it('validates the rule sheet', () => {
    const d = { matchText: 'Shell', type: 'expense' as const, minMinor: null, maxMinor: null, categoryId: 'fuel', scope: 'work' as const };
    expect(checkRule(d)).toBeNull();
    expect(checkRule({ ...d, matchText: '  !! ' })).toBe('empty_text');
    expect(checkRule({ ...d, categoryId: null })).toBe('no_category');
    expect(checkRule({ ...d, minMinor: 500, maxMinor: 100 })).toBe('bad_range');
  });
});

describe('rule offers', () => {
  it('keys a place by the first merchant word', () => {
    expect(offerKey('Shell M62', null)).toBe('shell');
    expect(offerKey('Shell Leeds', null)).toBe('shell');
    expect(offerKey('DPD weekly payout', null)).toBe('dpd');
    expect(offerKey('random', 'SHELL UK OIL PRODUCTS LTD #4521')).toBe('shell');
    expect(offerKey('', null)).toBe('');
    expect(offerKey('£4.20', null)).toBe('');
  });

  it('labels the offer with the shared leading words', () => {
    expect(offerLabel(['Kwik Fit tyres', 'Kwik Fit', 'kwik fit wipers'], 'kwik')).toBe('Kwik Fit');
    expect(offerLabel(['Shell M62', 'Shell Leeds'], 'shell')).toBe('Shell');
    expect(offerLabel(['DPD weekly payout', 'DPD weekly payout'], 'dpd')).toBe('DPD weekly');
    expect(offerLabel(['SHELL UK OIL'], 'shell')).toBe('Shell');
    expect(offerLabel([], 'shell')).toBe('shell');
  });

  it('offers only after 3 sorts in a row to one category', () => {
    const s = (categoryId: string, note = 'DPD payout'): SortedForOffer => ({ note, ocrMerchant: null, categoryId, scope: 'work' });
    expect(offerFrom('dpd', [s('delivery'), s('delivery')])).toBeNull();
    expect(offerFrom('dpd', [s('delivery'), s('delivery'), s('tips')])).toBeNull();
    expect(offerFrom('dpd', [s('delivery'), s('delivery'), s('delivery'), s('tips')])).toEqual({ matchText: 'DPD payout', categoryId: 'delivery', scope: 'work' });
    expect(offerFrom('', [s('a'), s('a'), s('a')])).toBeNull();
  });
});

describe('known routes', () => {
  const depot = { lat: 53.7997, lng: -1.5492 };
  const wakefield = { lat: 53.6833, lng: -1.4977 };
  const near = (p: { lat: number; lng: number }) => ({ lat: p.lat + 0.001, lng: p.lng + 0.001 }); // ~130 m
  const route = (scope: 'work' | 'personal', count: number) => ({ startLat: depot.lat, startLng: depot.lng, endLat: wakefield.lat, endLng: wakefield.lng, scope, count });

  it('matches the same pair of areas either way round', () => {
    expect(sameRoute(route('work', 1), near(depot), near(wakefield))).toBe(true);
    expect(sameRoute(route('work', 1), wakefield, depot)).toBe(true);
    expect(sameRoute(route('work', 1), depot, { lat: 53.9, lng: -1.5 })).toBe(false);
  });

  it('is sure only after 3 sorts and no real conflict', () => {
    expect(routeScope([route('work', 2)], depot, wakefield)).toBeNull();
    expect(routeScope([route('work', 3)], depot, wakefield)).toBe('work');
    expect(routeScope([route('work', 3), route('personal', 2)], depot, wakefield)).toBeNull();
    expect(routeScope([route('work', 6), route('personal', 2)], depot, wakefield)).toBe('work');
    expect(routeScope([route('personal', 4)], wakefield, depot)).toBe('personal');
  });
});
