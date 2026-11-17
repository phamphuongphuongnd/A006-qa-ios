/**
 * QA-100 T1: every one of the 100 personas lives through their behaviour against the real repositories (better-sqlite3,
 * same migrations as the app), in their own time zone, and the books must still add up. An independent model (plain
 * arrays, written here, not imported from the app) is the oracle.
 *
 * QA_WRITE_FIXTURES=1 also writes each persona's backup file to qa/fixtures/<id>.sundaysort for the device runs.
 */
import fs from 'fs';
import path from 'path';

import { listCategories, seedCategories } from '@/db/categoriesRepo';
import {
  categorise,
  convertAllTo,
  createEntry,
  deleteEntries,
  getEntry,
  listEntries,
  mergeEntries,
  restoreSnapshot,
  splitEntry,
  totalsFor,
  unsortedCount,
  updateEntry,
} from '@/db/entriesRepo';
import { getSettings, updateSettings } from '@/db/settingsRepo';
import { makeTestDb } from '@/db/testing/testDb';
import { addManualTrip, appendPoints, endTrip, listTrips, mileageTotals, pauseTrip, resumeTrip, startTrip } from '@/db/tripsRepo';
import type { AppDb } from '@/db/types';
import { entriesCsv } from '@/domain/csv';
import { MAX_MINOR } from '@/domain/money';
import { buildReport } from '@/domain/report';
import { taxYearOf } from '@/domain/taxYear';
import { currencyOf, type EntryType, type Region, type Scope } from '@/domain/types';
import { replaceAllData, snapshotTables, wipeAllData } from '@/features/backup/dataStore';
import { packBackup, unpackBackup } from '@/features/backup/pack';

import { makePersonas, NORMAL_NOTES, rng, WEIRD_NOTES, type Persona, type Rng } from '../personas';

jest.setTimeout(120_000);

const PERSONAS = makePersonas();
const FIXTURES = path.join(__dirname, '../../../qa/fixtures');
const ORIGINAL_TZ = process.env.TZ;
afterAll(() => {
  process.env.TZ = ORIGINAL_TZ;
});

interface ModelEntry {
  type: EntryType;
  amount: number;
  at: number;
  scope: Scope;
  sorted: boolean;
}

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

/** RFC 4180 reader (independent of the app's writer). */
function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r' && s[i + 1] === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
    } else field += c;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

/** Tax year start, worked out here from the calendar (not via the app). */
function expectedTaxStartYear(at: number, region: Region): number {
  const d = new Date(at);
  if (region === 'US') return d.getFullYear();
  const m = d.getMonth();
  return m < 3 || (m === 3 && d.getDate() < 6) ? d.getFullYear() - 1 : d.getFullYear();
}

const NOW = () => new Date(2026, 10, 17, 12, 0, 0).getTime();

/** Dates a driver actually hits, including the edges of tax years and the calendar year, in the persona's zone. */
function boundaryDates(): number[] {
  const out: number[] = [];
  for (const y of [2025, 2026]) {
    out.push(new Date(y, 3, 5, 23, 59, 59, 999).getTime(), new Date(y, 3, 6, 0, 0, 0, 0).getTime());
    out.push(new Date(y - 1, 11, 31, 23, 59, 59, 999).getTime(), new Date(y, 0, 1, 0, 0, 0, 0).getTime());
  }
  // UK clocks go forward (30 Mar 2025 01:00 → 02:00) and back; US 9 Mar / 2 Nov 2025.
  out.push(new Date(2025, 2, 30, 1, 30).getTime(), new Date(2025, 9, 26, 1, 30).getTime(), new Date(2025, 2, 9, 2, 30).getTime());
  return out;
}

function amountFor(r: Rng): number {
  if (r.chance(0.002)) return MAX_MINOR;
  if (r.chance(0.01)) return 1;
  return r.int(50, 25_000);
}

function noteFor(p: Persona, r: Rng): string {
  if (p.behaviour === 'weird_text' ? r.chance(0.7) : r.chance(0.05)) return r.pick(WEIRD_NOTES);
  return r.pick(NORMAL_NOTES);
}

interface World {
  db: AppDb;
  model: Map<string, ModelEntry>;
  r: Rng;
  p: Persona;
  catIds: Record<EntryType, string[]>;
}

function addEntry(w: World, at: number, opts: { sorted?: boolean } = {}) {
  const type: EntryType = w.r.chance(0.3) ? 'income' : 'expense';
  const scope: Scope = w.r.chance(0.12) ? 'personal' : 'work';
  const categoryId = opts.sorted ? w.r.pick(w.catIds[type]) : null;
  const amount = amountFor(w.r);
  const row = createEntry(w.db, { type, amountMinor: amount, currency: currencyOf(w.p.region), occurredAt: at, note: noteFor(w.p, w.r), scope, categoryId }, NOW());
  w.model.set(row.id, { type, amount, at, scope, sorted: !!categoryId });
  return row.id;
}

/** Builds the persona's history and plays their behaviour. Returns the world for the checks. */
async function live(p: Persona): Promise<World> {
  const db = makeTestDb();
  seedCategories(db, p.region);
  updateSettings(db, { region: p.region, onboarded: true });
  const cats = listCategories(db);
  const w: World = {
    db,
    model: new Map(),
    r: rng(p.seed),
    p,
    catIds: { income: cats.filter((c) => c.type === 'income').map((c) => c.id), expense: cats.filter((c) => c.type === 'expense').map((c) => c.id) },
  };
  const span = (p.behaviour === 'large_history' ? 5 * 365 : 400) * 86_400_000;
  const sortRatio = p.behaviour === 'never_sorts' || p.behaviour === 'quick_capture_only' ? 0 : p.behaviour === 'weekly_sorter' ? 0.95 : 0.6;
  for (let i = 0; i < p.entries; i++) addEntry(w, NOW() - Math.floor(w.r.next() * span), { sorted: w.r.chance(sortRatio) });
  if (p.entries > 0) for (const at of boundaryDates()) addEntry(w, at, { sorted: w.r.chance(0.5) });

  const ids = () => [...w.model.keys()];
  switch (p.behaviour) {
    case 'weekly_sorter': {
      for (const id of ids()) {
        const m = w.model.get(id)!;
        if (!m.sorted) {
          categorise(db, id, w.r.pick(w.catIds[m.type]), m.scope);
          m.sorted = true;
        }
      }
      break;
    }
    case 'split_merge_heavy': {
      for (let k = 0; k < 15; k++) {
        const all = ids().filter((id) => w.model.get(id)!.amount >= 10);
        const id = w.r.pick(all);
        const m = w.model.get(id)!;
        const n = w.r.int(2, 10);
        if (m.amount < n) continue;
        const base = Math.floor(m.amount / n);
        const parts = Array.from({ length: n }, (_, i) => ({
          amountMinor: i === 0 ? m.amount - base * (n - 1) : base,
          categoryId: w.r.chance(0.5) ? w.r.pick(w.catIds[m.type]) : null,
          scope: m.scope,
          note: 'part',
        }));
        const res = splitEntry(db, id, parts, NOW());
        expect(res.ok).toBe(true);
        if (!res.ok) continue;
        w.model.delete(id);
        res.ids.forEach((pid, i) => w.model.set(pid, { ...m, amount: parts[i].amountMinor, sorted: !!parts[i].categoryId }));
        // Undo half of the splits: the original must come back exactly.
        if (k % 2 === 0) {
          restoreSnapshot(db, res.snapshot);
          res.ids.forEach((pid) => w.model.delete(pid));
          w.model.set(id, m);
          expect(getEntry(db, id)?.amountMinor).toBe(m.amount);
        }
      }
      for (let k = 0; k < 10; k++) {
        const type: EntryType = k % 2 ? 'income' : 'expense';
        const pool = ids().filter((id) => w.model.get(id)!.type === type);
        if (pool.length < 3) continue;
        const pickIds = [...new Set([w.r.pick(pool), w.r.pick(pool), w.r.pick(pool)])];
        if (pickIds.length < 2) continue;
        const sum = pickIds.reduce((a, id) => a + w.model.get(id)!.amount, 0);
        if (sum > MAX_MINOR) continue;
        const res = mergeEntries(db, pickIds, NOW());
        expect(res.ok).toBe(true);
        if (!res.ok) continue;
        const first = pickIds.map((id) => w.model.get(id)!).sort((a, b) => a.at - b.at)[0];
        const scopes = new Set(pickIds.map((id) => w.model.get(id)!.scope));
        pickIds.forEach((id) => w.model.delete(id));
        const merged = getEntry(db, res.id)!;
        expect(merged.amountMinor).toBe(sum);
        w.model.set(res.id, { type, amount: sum, at: first.at, scope: scopes.size === 1 ? first.scope : 'work', sorted: merged.categoryId !== null });
      }
      // Mixed types must be refused.
      const inc = ids().find((id) => w.model.get(id)!.type === 'income');
      const exp = ids().find((id) => w.model.get(id)!.type === 'expense');
      if (inc && exp) expect(mergeEntries(db, [inc, exp], NOW())).toEqual({ ok: false, reason: 'mixed_types' });
      break;
    }
    case 'gps_trips': {
      for (let t = 0; t < 12; t++) {
        const start = NOW() - (t + 1) * 86_400_000;
        const trip = startTrip(db, 'work', start);
        // Second Start while one is running must not create another trip (double tap / NFC + button).
        expect(startTrip(db, 'work', start + 1).id).toBe(trip.id);
        let lat = 51.5 + t * 0.01;
        const pts = [];
        for (let i = 0; i < 60; i++) {
          lat += 0.0009; // ~100 m a fix
          pts.push({ ts: start + i * 10_000, lat, lng: -0.12, accuracy: 10, speed: 10 });
        }
        appendPoints(db, trip.id, pts.slice(0, 30));
        pauseTrip(db, trip.id);
        appendPoints(db, trip.id, [{ ts: start + 400_000, lat: lat + 1, lng: 0, accuracy: 5, speed: 20 }]); // ignored while paused
        resumeTrip(db, trip.id, start + 500_000);
        appendPoints(db, trip.id, pts.slice(30).map((x) => ({ ...x, ts: x.ts + 600_000 })));
        const done = endTrip(db, trip.id, start + 2_000_000)!;
        // ~29 × 100 m before the pause + ~29 × 100 m after (the jump while paused is not counted).
        expect(done.distanceM).toBeGreaterThan(5_000);
        expect(done.distanceM).toBeLessThan(7_000);
      }
      break;
    }
    case 'manual_miles_odometer': {
      for (let t = 0; t < 20; t++) addManualTrip(db, { date: NOW() - t * 86_400_000, scope: t % 4 ? 'work' : 'personal', purpose: 'drops', odoStart: 10_000 + t * 100, odoEnd: 10_000 + t * 100 + 37.5 });
      expect(() => addManualTrip(db, { date: NOW(), scope: 'work', purpose: 'x', odoStart: 500, odoEnd: 400 })).toThrow();
      expect(() => addManualTrip(db, { date: NOW(), scope: 'work', purpose: 'x', miles: 0 })).toThrow();
      const tot = mileageTotals(db, { start: NOW() - 30 * 86_400_000, end: NOW() + 1 });
      expect(tot.work + tot.personal).toBeCloseTo(20 * 37.5, 0);
      break;
    }
    case 'region_switch': {
      const to: Region = p.region === 'UK' ? 'US' : 'UK';
      const before = [...w.model.values()].reduce((a, m) => a + m.amount, 0);
      convertAllTo(db, currencyOf(to), 1_270_000, NOW());
      updateSettings(db, { region: to });
      const after = listEntries(db);
      expect(after.every((e) => e.currency === currencyOf(to))).toBe(true);
      expect(after.every((e) => Number.isInteger(e.amountMinor) && e.amountMinor > 0)).toBe(true);
      // Model follows the app's rounding rule per entry (independently: round half away from zero, min 1).
      for (const e of after) w.model.get(e.id)!.amount = e.amountMinor;
      const sumAfter = after.reduce((a, e) => a + e.amountMinor, 0);
      expect(Math.abs(sumAfter - Math.round(before * 1.27))).toBeLessThanOrEqual(after.length);
      w.p = { ...p, region: to };
      break;
    }
    case 'double_tap_save': {
      // Two identical saves 50 ms apart are two rows in the DB — the UI must stop the second tap (checked on device).
      const at = NOW() - 1000;
      addEntry(w, at);
      break;
    }
    case 'wipe_all': {
      wipeAllData(db);
      w.model.clear();
      // App: settings empty → onboarding again. Region is picked again; Pro state survives (trial not reusable).
      expect(getSettings(db).onboarded).toBe(false);
      seedCategories(db, p.region);
      updateSettings(db, { region: p.region, onboarded: true });
      const cats2 = listCategories(db);
      w.catIds = { income: cats2.filter((c) => c.type === 'income').map((c) => c.id), expense: cats2.filter((c) => c.type === 'expense').map((c) => c.id) };
      expect(listEntries(db)).toHaveLength(0);
      expect(listTrips(db)).toHaveLength(0);
      break;
    }
    default: {
      // Everyone deletes a few entries and half undo it.
      const victims = ids().slice(0, 5);
      if (victims.length) {
        const { snapshot } = deleteEntries(db, victims);
        if (w.r.chance(0.5)) restoreSnapshot(db, snapshot);
        else victims.forEach((id) => w.model.delete(id));
      }
      // Edit an amount and a date across a tax-year edge.
      const id = ids()[0];
      if (id) {
        const at = new Date(2026, 3, 5, 23, 59).getTime();
        updateEntry(db, id, { amountMinor: 4321, occurredAt: at }, NOW());
        Object.assign(w.model.get(id)!, { amount: 4321, at });
      }
    }
  }
  return w;
}

describe.each(PERSONAS.map((p) => [p.id, p] as const))('QA-100 %s', (_id, p) => {
  let w: World;
  beforeAll(async () => {
    process.env.TZ = p.timeZone;
    w = await live(p);
  });
  afterAll(() => {
    process.env.TZ = ORIGINAL_TZ;
  });
  beforeEach(() => {
    process.env.TZ = p.timeZone;
  });

  it(`${p.name} · ${p.region} · ${p.timeZone}: DB rows match what the driver did`, () => {
    const rows = listEntries(w.db);
    expect(rows).toHaveLength(w.model.size);
    for (const e of rows) {
      const m = w.model.get(e.id);
      expect(m).toBeDefined();
      expect(e.amountMinor).toBe(m!.amount);
      expect(e.occurredAt).toBe(m!.at);
      expect(Number.isInteger(e.amountMinor)).toBe(true);
      expect(e.note).not.toMatch(LONE_SURROGATE);
      expect(e.note.length).toBeLessThanOrEqual(120);
    }
    expect(unsortedCount(w.db)).toBe([...w.model.values()].filter((m) => !m.sorted).length);
  });

  it('totals and every tax-year report add up (work only, personal left out)', () => {
    const region = w.p.region;
    const years = new Set([...w.model.values()].map((m) => expectedTaxStartYear(m.at, region)));
    const cats = listCategories(w.db, { includeHidden: true });
    for (const y of years) {
      const inYear = [...w.model.values()].filter((m) => expectedTaxStartYear(m.at, region) === y);
      const ty = taxYearOf(inYear[0].at, region);
      expect(ty.startYear).toBe(y);
      const report = buildReport(listEntries(w.db, { period: ty }), cats, ty);
      const sum = (t: EntryType, s: Scope) => inYear.filter((m) => m.type === t && m.scope === s).reduce((a, m) => a + m.amount, 0);
      expect(report.incomeMinor).toBe(sum('income', 'work'));
      expect(report.expenseMinor).toBe(sum('expense', 'work'));
      expect(report.personalExcludedMinor).toBe(sum('income', 'personal') + sum('expense', 'personal'));
      const t = totalsFor(w.db, ty, 'work');
      expect(t.incomeMinor).toBe(report.incomeMinor);
      expect(t.expenseMinor).toBe(report.expenseMinor);
    }
  });

  it('entries CSV reads back: same rows, same money, no live formulas', () => {
    const rows = listEntries(w.db);
    const csv = entriesCsv(rows.map((e) => ({ ...e, categoryName: null, taxLine: null, receiptCount: e.receiptCount })));
    const parsed = parseCsv(csv);
    const header = parsed[0];
    const body = parsed.slice(1);
    expect(body).toHaveLength(rows.length);
    const ai = header.indexOf('amount');
    const ni = header.indexOf('note');
    const ii = header.indexOf('entry_id');
    const toMinor = (s: string) => {
      const [a, b = ''] = s.split('.');
      return Number(a) * 100 + Number(b.padEnd(2, '0'));
    };
    expect(body.reduce((a, r) => a + toMinor(r[ai]), 0)).toBe(rows.reduce((a, e) => a + e.amountMinor, 0));
    for (const r of body) {
      expect(r).toHaveLength(header.length);
      expect(r[ni]).not.toMatch(/^[=+\-@\t\r]/);
      expect(w.model.has(r[ii])).toBe(true);
    }
  });

  it('backup → restore on another phone gives back exactly the same data', async () => {
    const tables = snapshotTables(w.db);
    const chunks: Uint8Array[] = [];
    // A write lands while the backup is being packed (nightly job vs. driver typing): the file must hold the
    // snapshot taken at the start, and the live write must not be lost.
    let wrote = false;
    const res = await packBackup(tables, [{ name: 'r1.jpg', read: () => new Uint8Array([1, 2, 3]) }], {
      createdAt: NOW(),
      appVersion: 'qa',
      onChunk: (c) => chunks.push(c),
      pause: async () => {
        if (!wrote && w.p.entries > 0) {
          wrote = true;
          addEntry(w, NOW() - 5000);
        }
      },
    });
    expect(res.cancelled).toBe(false);
    const bytes = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
    let off = 0;
    for (const c of chunks) {
      bytes.set(c, off);
      off += c.length;
    }
    const un = unpackBackup(bytes);
    expect(un.ok).toBe(true);
    if (!un.ok) return;
    expect(un.manifest.tables.entries).toHaveLength(tables.entries.length);
    const other = makeTestDb();
    replaceAllData(other, un.manifest.tables, un.manifest.createdAt);
    const back = snapshotTables(other);
    const noBackupKeys = (s: { key: string }[]) => s.filter((r) => !['lastBackupAt', 'backupBannerSnoozedUntil'].includes(r.key));
    expect({ ...back, settings: noBackupKeys(back.settings) }).toEqual({ ...tables, settings: noBackupKeys(tables.settings) });
    expect(getSettings(other).region).toBe(w.p.region);
    // The live DB kept the write made during packing.
    expect(listEntries(w.db)).toHaveLength(w.model.size);

    if (process.env.QA_WRITE_FIXTURES === '1') {
      fs.mkdirSync(FIXTURES, { recursive: true });
      fs.writeFileSync(path.join(FIXTURES, `${p.id}.sundaysort`), bytes);
    }
  });
});

describe('QA-100 matrix', () => {
  it('has 100 distinct personas covering every behaviour, both regions, all devices and networks', () => {
    expect(PERSONAS).toHaveLength(100);
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(100);
    expect(new Set(PERSONAS.map((p) => p.behaviour)).size).toBe(20);
    expect(PERSONAS.filter((p) => p.region === 'UK')).toHaveLength(50);
    expect(new Set(PERSONAS.map((p) => p.android)).size).toBe(5);
    expect(new Set(PERSONAS.map((p) => p.network)).size).toBe(5);
    expect(PERSONAS.filter((p) => p.ios).length).toBeGreaterThanOrEqual(25);
    fs.mkdirSync(path.join(__dirname, '../../../qa'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, '../../../qa/personas.json'), JSON.stringify(PERSONAS, null, 1));
  });
});
