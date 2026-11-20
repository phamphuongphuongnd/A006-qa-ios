// B-154 (Phương 2026-11-20): the mileage allowance must match the miles the files print. Each trip is fixed to 0.1 mi
// once; totals add the fixed values; the money is the fixed miles × rate, rounded to the penny / cent once per rate
// line. Business use prints 2 decimals. These tests play the accountant: add up the CSV's miles column, multiply by the
// rates, and expect the app's figure and the MTD allowance row to the penny.
import { addManualTrip, businessTripMiles, mileageTotals } from '@/db/tripsRepo';
import { makeTestDb } from '@/db/testing/testDb';
import type { AppDb } from '@/db/types';
import { mileageCsv } from '@/domain/csv';
import {
  DEFAULT_RATES,
  formatDistanceNumber,
  mileageBreakdown,
  mileageEstimate,
  mileageEstimateByDate,
  roundTenth,
  sumTenths,
  toTenths,
  tripMiles,
} from '@/domain/mileage';
import { taxYearOf } from '@/domain/taxYear';
import type { Period } from '@/domain/types';
import { businessUse, percentText } from '@/domain/vehicleCosts';

import { mileageDescription, mtdRecords, mtdRecordsCsv, vehicleNote } from '../mtdFiles';
import { finishedTrips, tripSummary } from '../queries';
import { mileageWindow, rangeMileageEstimate } from '../series';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const lines = (doc: string) => doc.replace(/^﻿/, '').trim().split('\r\n');

/** Deterministic odd distances: 0.31 … 179.99 mi with two or three decimals (never round numbers). */
function oddMiles(seed: number, n: number): number[] {
  let x = seed;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out.push(0.31 + ((x % 1796800) / 10000) + (i % 3 === 0 ? 0.005 : 0));
  }
  return out;
}

/** Work + personal trips spread over [start, end), one or two a day, in date order. */
function seedTrips(db: AppDb, start: number, end: number, miles: number[]): void {
  const step = (end - start) / (miles.length + 1);
  miles.forEach((mi, i) => {
    addManualTrip(db, { date: Math.round(start + step * (i + 1)), scope: i % 7 === 3 ? 'personal' : 'work', purpose: `Route ${i}`, miles: mi });
  });
}

/** The mileage log CSV for a period, built the way buildExport builds it. */
function mileageLog(db: AppDb, p: Period): string {
  return mileageCsv(
    finishedTrips(db, p)
      .filter((t) => t.scope === 'work')
      .map((t) => ({
        startedAt: t.startedAt,
        endedAt: t.endedAt,
        miles: tripMiles(t.distanceM),
        scope: t.scope,
        purpose: t.purpose,
        source: t.source,
        startedBy: t.startedBy,
        edited: t.edited,
        originalMiles: null,
        odoStart: t.odoStart,
        odoEnd: t.odoEnd,
      })),
  );
}

/** Rows of the CSV as {date, tenths}: what the accountant reads (miles column, whole tenths). */
function csvMiles(doc: string): { date: string; tenths: number }[] {
  const [head, ...rows] = lines(doc);
  const col = head.split(',').indexOf('miles');
  return rows.map((r) => {
    const cells = r.split(',');
    const v = cells[col];
    expect(v).toMatch(/^\d+\.\d$/); // always one decimal
    return { date: cells[0], tenths: Math.round(Number(v) * 10) };
  });
}

/** Pence for whole tenths at a rate, rounded once (half up) — integers only, no float. */
const lineMoney = (tenths: number, minorPerMile: number) => Math.round((tenths * minorPerMile) / 10);

describe('B-154 helpers', () => {
  it('fixes a value to 0.1 once and adds fixed values without float drift', () => {
    expect(toTenths(12.34)).toBe(123);
    expect(toTenths(12.35)).toBe(124); // 12.35 * 10 = 123.49999… in float
    expect(toTenths(0.04)).toBe(0);
    expect(roundTenth(1.25)).toBe(1.3);
    expect(sumTenths([0.1, 0.1, 0.1])).toBe(0.3);
    expect(tripMiles(19_795)).toBe(12.3); // 12.3 mi stored as metres
    expect(formatDistanceNumber(12.35, 1)).toBe('12.4');
    expect(formatDistanceNumber(8477.5, 1)).toBe('8,477.5');
  });

  it('rounds each rate line once: 12.3 mi × 55p = 676.5p → £6.77; 0.1 mi × 72.5¢ = 7.25¢ → 7¢', () => {
    expect(mileageEstimate(12.3, DEFAULT_RATES.UK.slice(2))).toBe(677);
    expect(mileageEstimateByDate([{ at: at(2026, 3, 1), miles: 0.1 }], DEFAULT_RATES.US)).toBe(7);
    // Two trips of 12.34 and 12.34 mi: fixed 12.3 + 12.3 = 24.6 mi × 55p = 1353p (raw 24.68 would give 1357p).
    expect(mileageEstimateByDate([{ at: at(2026, 5, 1), miles: 12.34 }, { at: at(2026, 5, 2), miles: 12.34 }], DEFAULT_RATES.UK)).toBe(1353);
  });

  it('splits the trip that crosses 10,000 mi between 55p and 25p, in whole tenths', () => {
    const b = mileageBreakdown(
      [
        { at: at(2026, 5, 1), miles: 9_990.04 }, // fixed 9,990.0
        { at: at(2026, 5, 2), miles: 20.06 }, // fixed 20.1: 10.0 at 55p, 10.1 at 25p
      ],
      DEFAULT_RATES.UK,
    );
    expect(b.lines.map((l) => [l.minorPerMile, l.miles])).toEqual([
      [55, 10_000],
      [25, 10.1],
    ]);
    expect(b.minor).toBe(550_000 + lineMoney(101, 25));
    expect(b.miles).toBe(10_010.1);
  });

  it('a range is priced on its own trips, earlier trips only move the tier counter', () => {
    const trips = [
      { at: at(2026, 5, 1), miles: 9_999.9 },
      { at: at(2026, 7, 1), miles: 0.3 }, // 0.1 at 55p, 0.2 at 25p
      { at: at(2026, 8, 1), miles: 12.3 }, // all at 25p
    ];
    const q = mileageBreakdown(trips, DEFAULT_RATES.UK, { start: at(2026, 6, 6, 0), end: at(2026, 9, 6, 0) });
    expect(q.miles).toBe(12.6);
    expect(q.minor).toBe(lineMoney(1, 55) + lineMoney(125, 25)); // 0.1 mi: 5.5p → 6p; 12.5 mi: 312.5p → 313p
  });

  it('business use keeps the exact share and prints 2 decimals', () => {
    expect(businessUse(49, 400)).toEqual({ share: 0.1225, percent: 12.25 });
    expect(percentText(12.25)).toBe('12.25');
    expect(percentText(businessUse(1, 3)!.percent)).toBe('33.33');
    expect(percentText(businessUse(2, 3)!.percent)).toBe('66.67');
    expect(percentText(businessUse(400, 400)!.percent)).toBe('100.00');
  });
});

describe('B-154 UK: CSV miles × HMRC rates = app = MTD, across 10,000 mi', () => {
  const year = taxYearOf(at(2026, 6, 1), 'UK'); // 6 Apr 2026 – 5 Apr 2027, 55p / 25p
  const rates = DEFAULT_RATES.UK;
  const db = makeTestDb();
  seedTrips(db, year.start, year.end, oddMiles(7, 200)); // ≈ 15,500 work miles: crosses 10,000

  /** The accountant: rows in date order, cumulative from the tax year start, 55p up to 10,000.0 then 25p. */
  const accountant = (rows: { tenths: number }[], before = 0) => {
    let used = before;
    const t = { at55: 0, at25: 0 };
    for (const r of rows) {
      const room = Math.max(0, 100_000 - used);
      t.at55 += Math.min(room, r.tenths);
      t.at25 += r.tenths - Math.min(room, r.tenths);
      used += r.tenths;
    }
    return { money: lineMoney(t.at55, 55) + lineMoney(t.at25, 25), ...t };
  };

  it('whole tax year', () => {
    const rows = csvMiles(mileageLog(db, year));
    const tenths = rows.reduce((n, r) => n + r.tenths, 0);
    const want = accountant(rows);
    expect(want.at55).toBe(100_000);
    expect(want.at25).toBeGreaterThan(0);

    // Miles screen (estimate + business total) and Reports / MTD (range estimate + trip summary).
    expect(mileageEstimateByDate(businessTripMiles(db, year), rates)).toBe(want.money);
    expect(mileageTotals(db, year).work * 10).toBe(tenths);
    const win = mileageWindow(year.start, year.end, 'UK');
    const minor = rangeMileageEstimate(businessTripMiles(db, win), year.start, year.end, rates, 'UK');
    expect(minor).toBe(want.money);
    const summary = tripSummary(db, year);
    expect(Math.round(summary.workMiles * 10)).toBe(tenths);

    // MTD: allowance row = the money; its description prints the same miles with 1 decimal.
    const mileage = { minor, miles: summary.workMiles, ratesText: '55p / 25p' };
    const set = mtdRecords([], [], year, { method: 'mileage', mileage });
    const row = set.records.find((r) => r.description.startsWith('Mileage allowance'))!;
    expect(row.amountMinor).toBe(want.money);
    expect(mileageDescription(mileage)).toBe(`Mileage allowance: ${formatDistanceNumber(tenths / 10, 1)} business miles at 55p / 25p`);
    expect(lines(mtdRecordsCsv(set)).some((l) => l.includes(`${formatDistanceNumber(tenths / 10, 1)} business miles`))).toBe(true);
  });

  it('every MTD quarter, including the one that crosses 10,000 mi', () => {
    const win = mileageWindow(year.start, year.end, 'UK');
    const work = businessTripMiles(db, win);
    const quarters: Period[] = [
      { start: year.start, end: at(2026, 7, 6, 0) },
      { start: at(2026, 7, 6, 0), end: at(2026, 10, 6, 0) },
      { start: at(2026, 10, 6, 0), end: at(2027, 1, 6, 0) },
      { start: at(2027, 1, 6, 0), end: year.end },
    ];
    let before = 0;
    let crossed = false;
    for (const q of quarters) {
      const rows = csvMiles(mileageLog(db, q));
      const want = accountant(rows, before);
      if (want.at55 > 0 && want.at25 > 0) crossed = true;
      expect(rangeMileageEstimate(work, q.start, q.end, rates, 'UK')).toBe(want.money);
      expect(Math.round(tripSummary(db, q).workMiles * 10)).toBe(rows.reduce((n, r) => n + r.tenths, 0));
      before += rows.reduce((n, r) => n + r.tenths, 0);
    }
    expect(crossed).toBe(true);
  });

  it('business use: 2 decimals, matching the miles printed with it', () => {
    const s = tripSummary(db, year);
    const total = sumTenths([s.workMiles, s.personalMiles, s.unsortedMiles]);
    const bu = businessUse(s.workMiles, total)!;
    expect(bu.share).toBe(s.workMiles / total);
    expect(bu.percent).toBe(Math.round((s.workMiles / total) * 10_000) / 100);
    const note = vehicleNote('actual', { mileage: null, coveredMinor: 0, businessUse: { percent: bu.percent, workMiles: s.workMiles, totalMiles: total } }, 'GBP');
    const m = /Business use (\d+\.\d{2})% \(([\d,]+\.\d) of ([\d,]+\.\d) mi\)/.exec(note)!;
    expect(m).not.toBeNull();
    const [w, tot] = [Number(m[2].replace(/,/g, '')), Number(m[3].replace(/,/g, ''))];
    expect(m[1]).toBe((Math.round((w / tot) * 10_000) / 100).toFixed(2));
  });
});

describe('B-154 US: CSV miles × IRS rate = app, across the 1 July rate change', () => {
  const year = taxYearOf(at(2026, 6, 1), 'US'); // calendar 2026: 72.5¢ to 30 Jun, 76¢ from 1 Jul
  const rates = DEFAULT_RATES.US;
  const db = makeTestDb();
  seedTrips(db, year.start, year.end, oddMiles(11, 160));

  it('two rate lines, each rounded to the cent once', () => {
    const rows = csvMiles(mileageLog(db, year));
    const julyFirst = '2026-07-01';
    const early = rows.filter((r) => r.date < julyFirst).reduce((n, r) => n + r.tenths, 0);
    const late = rows.filter((r) => r.date >= julyFirst).reduce((n, r) => n + r.tenths, 0);
    expect(early).toBeGreaterThan(0);
    expect(late).toBeGreaterThan(0);
    const want = lineMoney(early, 72.5) + lineMoney(late, 76);
    expect(mileageEstimateByDate(businessTripMiles(db, year), rates)).toBe(want);
    expect(rangeMileageEstimate(businessTripMiles(db, year), year.start, year.end, rates, 'US')).toBe(want);
    expect(Math.round(tripSummary(db, year).workMiles * 10)).toBe(early + late);
  });
});

describe('B-154 km on screen', () => {
  it('km totals add each trip fixed to 0.1 km', () => {
    const db = makeTestDb();
    const d = at(2026, 6, 1);
    addManualTrip(db, { date: d, scope: 'work', purpose: '', miles: 3.07 }); // 4,941 m → 4.9 km
    addManualTrip(db, { date: d + 1, scope: 'work', purpose: '', miles: 3.07 });
    const p = { start: d - 1, end: d + 10 };
    expect(mileageTotals(db, p, 'km').work).toBe(9.8);
    expect(tripSummary(db, p, 'km').workMiles).toBe(9.8);
    expect(mileageTotals(db, p).work).toBe(6.2); // 3.1 + 3.1 mi
  });
});
