import { odometerMiles } from '@/domain/mileage';
import type { Scope } from '@/domain/types';
import { t } from '@/i18n';

import { inputToMiles, parseNumberInput, type DistanceUnit } from './format';

export type TripInputMode = 'odometer' | 'distance';

export interface TripFormValues {
  mode: TripInputMode;
  start: string;
  end: string;
  distance: string;
  date: number;
  scope: Scope;
  purpose: string;
}

export interface TripFormResult {
  date: number;
  scope: Scope;
  purpose: string;
  miles: number;
  odoStart?: number;
  odoEnd?: number;
}

type Check = { ok: true; miles: number; odo?: { start: number; end: number } } | { ok: false; error: string | null };

/** Validates the form; `error` is null while a field is just empty (no red text yet). */
export function checkTripForm(v: TripFormValues, unit: DistanceUnit): Check {
  if (v.mode === 'odometer') {
    const s = parseNumberInput(v.start);
    const e = parseNumberInput(v.end);
    if (v.start.trim() === '' || v.end.trim() === '') return { ok: false, error: null };
    if (s === null || e === null) return { ok: false, error: t('trip.invalidNumber') };
    const r = odometerMiles(s, e);
    if (!r.ok) return { ok: false, error: r.reason === 'end_before_start' ? t('miles.endBeforeStart') : t('trip.invalidNumber') };
    return { ok: true, miles: inputToMiles(r.miles, unit), odo: { start: s, end: e } };
  }
  if (v.distance.trim() === '') return { ok: false, error: null };
  const d = parseNumberInput(v.distance);
  if (d === null || d <= 0) return { ok: false, error: t('trip.invalidNumber') };
  return { ok: true, miles: inputToMiles(d, unit) };
}
