import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

import { createCategory, listCategories, seedCategories, updateCategory, applyRegionToCategories } from '@/db/categoriesRepo';
import { makeTestDb } from '@/db/testing/testDb';
import { defaultMtdCategory } from '@/domain/mtd';

const DRIZZLE = path.join(__dirname, '../../../drizzle');
const statements = (file: string) =>
  fs
    .readFileSync(path.join(DRIZZLE, file), 'utf8')
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);

describe('0001 migration on a bản-1 database', () => {
  it('backfills MTD categories, vehicle running costs and GPS trip starters; keeps the data', () => {
    const sqlite = new Database(':memory:');
    for (const s of statements('0000_init.sql')) sqlite.exec(s);
    const cat = sqlite.prepare(
      'INSERT INTO categories (id, type, key, name, icon, color, tax_line, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    cat.run('c1', 'expense', 'fuel', 'Fuel', 'fuel', '#000', 'SA103: Car, van and travel expenses', 0);
    cat.run('c2', 'expense', 'parking', 'Parking', 'parking', '#000', 'SA103: Car, van and travel expenses', 1);
    cat.run('c3', 'expense', 'phone', 'Phone & data', 'phone', '#000', 'SA103: Phone, fax, stationery and other office costs', 2);
    cat.run('c4', 'income', null, 'Cash jobs', 'x', '#000', 'SA103: Turnover', 3);
    cat.run('c5', 'expense', 'fuel', 'Fuel', 'fuel', '#000', 'Schedule C: Line 9 Car and truck expenses', 4);
    sqlite
      .prepare(
        'INSERT INTO entries (id, type, amount_minor, currency, occurred_at, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run('e1', 'expense', 4520, 'GBP', 1, 'c1', 1, 1);
    const trip = sqlite.prepare('INSERT INTO trips (id, source, status, started_at) VALUES (?, ?, ?, ?)');
    trip.run('t1', 'gps', 'done', 1);
    trip.run('t2', 'manual', 'done', 2);

    for (const s of statements('0001_v2_automation_pro.sql')) sqlite.exec(s);

    const cats = sqlite.prepare('SELECT id, mtd_category AS m, vehicle_running_cost AS v FROM categories ORDER BY id').all();
    expect(cats).toEqual([
      { id: 'c1', m: 'carVanTravelExpenses', v: 1 },
      { id: 'c2', m: 'carVanTravelExpenses', v: 0 },
      { id: 'c3', m: 'adminCosts', v: 0 },
      { id: 'c4', m: 'turnover', v: 0 },
      { id: 'c5', m: null, v: 1 },
    ]);
    expect(sqlite.prepare('SELECT source, rule_id AS r FROM entries').get()).toEqual({ source: 'manual', r: null });
    expect(sqlite.prepare('SELECT id, started_by AS b, scope FROM trips ORDER BY id').all()).toEqual([
      { id: 't1', b: 'user', scope: 'work' },
      { id: 't2', b: null, scope: 'work' },
    ]);
  });
});

describe('category MTD / vehicle defaults', () => {
  it('seeds UK with MTD categories and the four running-cost categories', () => {
    const db = makeTestDb();
    seedCategories(db, 'UK');
    const byKey = new Map(listCategories(db, { includeHidden: true }).map((c) => [c.key, c]));
    expect(byKey.get('fuel')).toMatchObject({ mtdCategory: 'carVanTravelExpenses', vehicleRunningCost: true });
    expect(byKey.get('lease')).toMatchObject({ vehicleRunningCost: true });
    expect(byKey.get('parking')).toMatchObject({ mtdCategory: 'carVanTravelExpenses', vehicleRunningCost: false });
    expect(byKey.get('phone')?.mtdCategory).toBe('adminCosts');
    expect(byKey.get('equipment')?.mtdCategory).toBe('otherExpenses');
    expect(byKey.get('fees')?.mtdCategory).toBe('professionalFees');
    expect(byKey.get('delivery_income')?.mtdCategory).toBe('turnover');
    expect(byKey.get('other_income')?.mtdCategory).toBe('other');
  });

  it('seeds US without MTD categories', () => {
    const db = makeTestDb();
    seedCategories(db, 'US');
    const all = listCategories(db, { includeHidden: true });
    expect(all.every((c) => c.mtdCategory === null)).toBe(true);
    expect(all.filter((c) => c.vehicleRunningCost).map((c) => c.key).sort()).toEqual(['fuel', 'insurance', 'lease', 'repairs']);
  });

  it('custom categories take the line default; a new line brings its default unless one is chosen', () => {
    const db = makeTestDb();
    seedCategories(db, 'UK');
    const r = createCategory(db, { type: 'expense', name: 'Bank fees', icon: 'x', color: '#000', taxLine: 'SA103: Bank, credit card and other financial charges' });
    if (!r.ok) throw new Error('create failed');
    const get = () => listCategories(db, { includeHidden: true }).find((c) => c.id === r.id)!;
    expect(get()).toMatchObject({ mtdCategory: 'financeCharges', vehicleRunningCost: false });
    updateCategory(db, r.id, { taxLine: 'SA103: Other allowable business expenses' });
    expect(get().mtdCategory).toBe('otherExpenses');
    updateCategory(db, r.id, { taxLine: 'SA103: Interest on bank and other loans', mtdCategory: 'financeCharges' });
    expect(get().mtdCategory).toBe('financeCharges');
    updateCategory(db, r.id, { vehicleRunningCost: true });
    expect(get().vehicleRunningCost).toBe(true);
  });

  it('region change UK → US drops MTD categories, US → UK brings them back', () => {
    const db = makeTestDb();
    seedCategories(db, 'UK');
    applyRegionToCategories(db, 'UK', 'US');
    expect(listCategories(db, { includeHidden: true }).every((c) => c.mtdCategory === null)).toBe(true);
    applyRegionToCategories(db, 'US', 'UK');
    const fuel = listCategories(db, { includeHidden: true }).find((c) => c.key === 'fuel')!;
    expect(fuel.mtdCategory).toBe('carVanTravelExpenses');
    expect(fuel.vehicleRunningCost).toBe(true);
  });

  it('unknown SA103 lines fall back to Other expenses / Other business income; US lines have none', () => {
    expect(defaultMtdCategory('SA103: Something new', 'expense')).toBe('otherExpenses');
    expect(defaultMtdCategory('SA103: Something new', 'income')).toBe('other');
    expect(defaultMtdCategory('Schedule C: Line 22 Supplies', 'expense')).toBeNull();
  });
});
