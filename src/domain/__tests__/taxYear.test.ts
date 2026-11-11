import { inPeriod, quartersOf, taxYearFor, taxYearOf } from '../taxYear';
import { weekLabel, weekOf } from '../week';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe('UK tax year', () => {
  it('5 April belongs to the previous year, 6 April starts a new one', () => {
    expect(taxYearOf(at(2027, 4, 5, 23), 'UK').label).toBe('2026/27');
    expect(taxYearOf(at(2027, 4, 6, 0), 'UK').label).toBe('2027/28');
    expect(taxYearOf(at(2026, 11, 11), 'UK').startYear).toBe(2026);
    expect(taxYearOf(at(2027, 1, 1), 'UK').startYear).toBe(2026);
  });
  it('labels century rollover', () => {
    expect(taxYearFor(2099, 'UK').label).toBe('2099/00');
  });
  it('quarters are the MTD standard periods and tile the year', () => {
    const y = taxYearFor(2026, 'UK');
    const q = quartersOf(y, 'UK');
    expect(q.map((x) => x.label)).toEqual(['6 Apr – 5 Jul', '6 Jul – 5 Oct', '6 Oct – 5 Jan', '6 Jan – 5 Apr']);
    expect(q[0].start).toBe(y.start);
    expect(q[3].end).toBe(y.end);
    for (let i = 1; i < 4; i++) expect(q[i].start).toBe(q[i - 1].end);
    expect(inPeriod(at(2026, 7, 5, 23), q[0])).toBe(true);
    expect(inPeriod(at(2026, 7, 6, 0), q[1])).toBe(true);
  });
});

describe('US tax year', () => {
  it('is the calendar year with calendar quarters', () => {
    const y = taxYearOf(at(2026, 12, 31, 23), 'US');
    expect(y.label).toBe('2026');
    expect(taxYearOf(at(2027, 1, 1, 0), 'US').label).toBe('2027');
    expect(quartersOf(y, 'US').map((x) => x.label)).toEqual(['1 Jan – 31 Mar', '1 Apr – 30 Jun', '1 Jul – 30 Sep', '1 Oct – 31 Dec']);
  });
});

describe('week', () => {
  it('runs Monday to Sunday', () => {
    const w = weekOf(at(2026, 11, 15, 23)); // Sunday
    expect(new Date(w.start).getDay()).toBe(1);
    expect(new Date(w.start).getDate()).toBe(9);
    expect(weekLabel(w)).toBe('9–15 Nov');
    expect(weekOf(at(2026, 11, 16, 0)).start).toBe(w.end); // next Monday
  });
  it('labels a week across months', () => {
    expect(weekLabel(weekOf(at(2026, 12, 2)))).toBe('30 Nov – 6 Dec');
  });
});
