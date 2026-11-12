import { checkTripForm, type TripFormValues } from '../tripFormCheck';

const base: TripFormValues = { mode: 'odometer', start: '', end: '', distance: '', date: 0, scope: 'work', purpose: '' };

describe('checkTripForm', () => {
  it('waits silently while fields are empty', () => {
    expect(checkTripForm(base, 'mi')).toEqual({ ok: false, error: null });
    expect(checkTripForm({ ...base, mode: 'distance' }, 'mi')).toEqual({ ok: false, error: null });
  });

  it('computes odometer miles', () => {
    const r = checkTripForm({ ...base, start: '48,210', end: '48,338' }, 'mi');
    expect(r).toEqual({ ok: true, miles: 128, odo: { start: 48210, end: 48338 } });
  });

  it('rejects end before start with the product wording', () => {
    expect(checkTripForm({ ...base, start: '48,338', end: '48,210' }, 'mi')).toEqual({
      ok: false,
      error: 'End reading must be higher than start',
    });
    expect(checkTripForm({ ...base, start: '100', end: '100' }, 'mi').ok).toBe(false);
  });

  it('rejects junk numbers', () => {
    expect(checkTripForm({ ...base, start: 'abc', end: '5' }, 'mi')).toEqual({ ok: false, error: 'Enter a number' });
    expect(checkTripForm({ ...base, mode: 'distance', distance: '0' }, 'mi')).toEqual({ ok: false, error: 'Enter a number' });
  });

  it('converts km input to miles', () => {
    const r = checkTripForm({ ...base, mode: 'distance', distance: '160.9344' }, 'km');
    expect(r.ok && r.miles).toBeCloseTo(100, 6);
  });
});
