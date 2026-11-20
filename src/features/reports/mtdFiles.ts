import type { CategoryKey } from '@/domain/categories';
import { csvDocument, csvRow, ukDate } from '@/domain/csv';
import { formatDistanceNumber, roundTenth } from '@/domain/mileage';
import { formatMoney, toDecimalString } from '@/domain/money';
import { HMRC_EXPENSE_CATEGORIES, HMRC_INCOME_CATEGORIES, hmrcLabel, type HmrcCategory } from '@/domain/mtd';
import { mtdOf, type Report } from '@/domain/report';
import type { EntryType, Minor, Period, VehicleCostMethod } from '@/domain/types';
import { percentText, vehicleTreatment } from '@/domain/vehicleCosts';

/**
 * MTD and FreeAgent files (F-15, P1-8, X3). Pure: buildExport reads the DB and writes the files.
 * Samples these follow (research.md §8 P0-3): MTDsorted sole-trader spreadsheet (Income / Expenses / Summary sheets,
 * 15 HMRC expense categories + Disallowable, cumulative from the start of the year) and FreeAgent's expense and
 * mileage import templates (support articles 360007142140 / 360007144540: DD/MM/YYYY, claimant must match exactly).
 * Only Work entries and trips go in; entries with no category are left out and counted.
 */

/** The 17 MTD rows in the order MTDsorted's Summary lists them: income first, then the 15 expense categories. */
export const MTD_ROWS: { key: HmrcCategory; type: EntryType }[] = [
  ...(Object.keys(HMRC_INCOME_CATEGORIES) as HmrcCategory[]).map((key) => ({ key, type: 'income' as const })),
  ...(Object.keys(HMRC_EXPENSE_CATEGORIES) as HmrcCategory[]).map((key) => ({ key, type: 'expense' as const })),
];

export interface MtdCategoryInfo {
  id: string;
  name: string;
  taxLine: string;
  key?: CategoryKey | null;
  mtdCategory?: HmrcCategory | null;
  vehicleRunningCost?: boolean;
}

export interface MtdEntryInput {
  id: string;
  occurredAt: number;
  type: EntryType;
  amountMinor: Minor;
  note: string;
  /** What OCR read as the shop / payer (MTDsorted "Merchant / customer name"). */
  merchant: string | null;
  categoryId: string | null;
  scope: 'work' | 'personal';
  receiptCount?: number;
}

export interface MtdRecord {
  at: number;
  type: EntryType;
  description: string;
  merchant: string;
  amountMinor: Minor;
  disallowableMinor: Minor;
  /** HMRC category key. */
  category: HmrcCategory;
  /** The driver's own category (FreeAgent mapping). */
  categoryInfo: MtdCategoryInfo | null;
  receiptCount: number;
}

export interface MtdMileage {
  minor: Minor;
  miles: number;
  /** "55p / 25p" */
  ratesText: string;
}

export interface MtdRecordSet {
  records: MtdRecord[];
  /** Work entries with no category: MTD needs a category for every record (Q3 "Leave them out"). */
  leftOut: { count: number; minor: Minor };
  /** Running-cost entries the mileage rate already covers (left out under the mileage method). */
  covered: { count: number; minor: Minor };
}

/**
 * MTD records for [period): Work entries with a category. Under the mileage method (or "not sure") running-cost
 * entries are left out and one "Mileage allowance" row is added, dated the last day of the period.
 */
export function mtdRecords(
  entries: MtdEntryInput[],
  categories: MtdCategoryInfo[],
  period: Period,
  vehicle: { method: VehicleCostMethod; mileage: MtdMileage | null },
): MtdRecordSet {
  const cats = new Map(categories.map((c) => [c.id, c]));
  const excludesRunning = vehicleTreatment(vehicle.method).excludesRunningCosts;
  const out: MtdRecordSet = { records: [], leftOut: { count: 0, minor: 0 }, covered: { count: 0, minor: 0 } };
  for (const e of entries) {
    if (e.occurredAt < period.start || e.occurredAt >= period.end || e.scope !== 'work') continue;
    const cat = e.categoryId ? cats.get(e.categoryId) : undefined;
    const m = cat ? mtdOf(cat, e.type) : null;
    if (!cat || !m) {
      out.leftOut.count++;
      out.leftOut.minor += e.amountMinor;
      continue;
    }
    if (excludesRunning && e.type === 'expense' && cat.vehicleRunningCost) {
      out.covered.count++;
      out.covered.minor += e.amountMinor;
      continue;
    }
    out.records.push({
      at: e.occurredAt,
      type: e.type,
      description: e.note.trim() || cat.name,
      merchant: e.merchant?.trim() ?? '',
      amountMinor: e.amountMinor,
      disallowableMinor: 0,
      category: m,
      categoryInfo: cat,
      receiptCount: e.receiptCount ?? 0,
    });
  }
  out.records.sort((a, b) => a.at - b.at);
  if (vehicleTreatment(vehicle.method).claimsMileage && vehicle.mileage && vehicle.mileage.minor > 0) {
    out.records.push({
      at: lastDayOf(period),
      type: 'expense',
      description: mileageDescription(vehicle.mileage),
      merchant: '',
      amountMinor: vehicle.mileage.minor,
      disallowableMinor: 0,
      category: 'carVanTravelExpenses',
      categoryInfo: null,
      receiptCount: 0,
    });
  }
  return out;
}

/** Noon of the period's last day (keeps the date stable whatever the time zone rounding). */
const lastDayOf = (p: Period) => {
  const d = new Date(p.end - 1);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
};

/** B-154: the miles with 1 decimal, the same fixed total the mileage log adds up to (was rounded to whole miles). */
export const mileageDescription = (m: MtdMileage) => `Mileage allowance: ${formatDistanceNumber(m.miles, 1)} business miles at ${m.ratesText}`;

/** MTD records CSV — MTDsorted columns, one row per record, oldest first. */
export function mtdRecordsCsv(set: MtdRecordSet): string {
  return csvDocument([
    csvRow(['Date', 'Description', 'Merchant / customer name', 'Amount', 'Disallowable amount', 'Income tax category']),
    ...set.records.map((r) =>
      csvRow([ukDate(r.at), r.description, r.merchant, toDecimalString(r.amountMinor), toDecimalString(r.disallowableMinor), hmrcLabel(r.category)]),
    ),
  ]);
}

export interface MtdSummaryRow {
  key: HmrcCategory;
  type: EntryType;
  label: string;
  totalMinor: Minor;
  disallowableMinor: Minor;
}

/** All 17 rows from a report's MTD totals, zero-filled, in MTD_ROWS order. Unsorted totals are not in any row. */
export function mtdSummaryRows(report: Pick<Report, 'byMtd'>): MtdSummaryRow[] {
  return MTD_ROWS.map(({ key, type }) => ({
    key,
    type,
    label: hmrcLabel(key),
    totalMinor: report.byMtd.filter((m) => m.mtdCategory === key && m.type === type).reduce((s, m) => s + m.totalMinor, 0),
    disallowableMinor: 0,
  }));
}

export interface MtdSummaryInput {
  /** "6 Apr 2026 – 5 Oct 2026" — always from the start of the MTD year (cumulative). */
  windowText: string;
  kind: 'standard' | 'calendar';
  rows: MtdSummaryRow[];
  leftOut: { count: number; minor: Minor };
  /** One line on the vehicle cost method (mileage claimed / business use). */
  vehicleNote: string | null;
}

/**
 * MTD summary CSV: the period on the first line, then the 17 HMRC categories with a Disallowable column (0 — Work
 * only), totals, and what was left out. Mirrors MTDsorted's Summary sheet so the driver can type the totals into
 * bridging software.
 */
export function mtdSummaryCsv(s: MtdSummaryInput): string {
  const sum = (type: EntryType) => s.rows.filter((r) => r.type === type).reduce((a, r) => a + r.totalMinor, 0);
  const lines = [
    csvRow(['MTD summary', s.windowText]),
    csvRow(['Update periods', s.kind === 'calendar' ? 'Calendar (from 1 April)' : 'Standard (from 6 April)']),
    csvRow(['Basis', 'Cumulative from the start of the tax year']),
    '',
    csvRow(['Income tax category', 'Type', 'Amount', 'Disallowable amount', 'HMRC field']),
    ...s.rows.map((r) =>
      csvRow([r.label, r.type === 'income' ? 'Income' : 'Expense', toDecimalString(r.totalMinor), toDecimalString(r.disallowableMinor), r.key]),
    ),
    csvRow(['Total income', '', toDecimalString(sum('income')), '', '']),
    csvRow(['Total expenses', '', toDecimalString(sum('expense')), '0.00', '']),
    '',
    csvRow([
      'Left out (no category)',
      s.leftOut.count === 1 ? '1 entry' : `${s.leftOut.count} entries`,
      toDecimalString(s.leftOut.minor),
      '',
      '',
    ]),
    ...(s.vehicleNote ? [csvRow(['Vehicle', s.vehicleNote])] : []),
    csvRow(['Note', "Generated by Sunday Sort. Not tax advice. Sunday Sort isn't MTD software."]),
  ];
  return csvDocument(lines);
}

/** Vehicle line for MTD / PDF files. */
export function vehicleNote(
  method: VehicleCostMethod,
  v: { mileage: MtdMileage | null; coveredMinor: Minor; businessUse: { percent: number; workMiles: number; totalMiles: number } | null },
  currency: 'GBP' | 'USD',
): string {
  if (vehicleTreatment(method).claimsMileage) {
    const claim = v.mileage && v.mileage.minor > 0 ? `${mileageDescription(v.mileage)} = ${formatMoney(v.mileage.minor, currency)}. ` : '';
    const covered = v.coveredMinor > 0 ? ` (${formatMoney(v.coveredMinor, currency)} left out)` : '';
    return `Mileage rate${method === 'unsure' ? ' (not chosen yet)' : ''}. ${claim}Fuel, repairs, insurance and road tax are covered by the rate${covered}; parking, tolls and congestion are added on top.`;
  }
  const bu = v.businessUse
    ? ` Business use ${percentText(v.businessUse.percent)}% (${formatDistanceNumber(v.businessUse.workMiles, 1)} of ${formatDistanceNumber(v.businessUse.totalMiles, 1)} mi).`
    : '';
  return `Actual costs. Vehicle costs are in full.${bu} Your accountant applies the business-use share.`;
}

// ---------------- .xlsx (MTDsorted template) ----------------

/** write-excel-file cell (kept structural so this file has no import of the library). */
export type XCell =
  | string
  | number
  | null
  | { value: string | number | Date; type?: StringConstructor | NumberConstructor | DateConstructor | 'Formula'; format?: string; fontWeight?: 'bold' };
export interface XSheet {
  sheet: string;
  data: XCell[][];
  columns?: { width: number }[];
  stickyRowsCount?: number;
}

const MONEY = '#,##0.00';
const bold = (value: string): XCell => ({ value, fontWeight: 'bold' });
/** A formula cell. OOXML stores formulas without the leading "=" (write-excel-file writes the value as given). */
const fx = (f: string): XCell => ({ value: f, type: 'Formula', format: MONEY });
/** Excel string literal inside a formula. */
const xq = (s: string) => `"${s.replace(/"/g, '""')}"`;
/** Excel stores dates as local calendar days; build the Date at UTC midnight of the local day so it doesn't shift. */
const excelDay = (at: number) => {
  const d = new Date(at);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

/**
 * Sheets of the MTD spreadsheet, in MTDsorted's layout: Income (Date received · Description · Merchant / customer
 * name · Amount received (without VAT) · Income tax category · CIS deducted), Expenses (Date · Description · Merchant
 * / customer name · Total amount · Disallowable amount · Income tax category) and Summary, which totals the other two
 * with SUMIF formulas so edits in Excel flow through.
 */
export function mtdWorkbook(set: MtdRecordSet, s: Omit<MtdSummaryInput, 'rows'>): XSheet[] {
  const date = (at: number): XCell => ({ value: excelDay(at), type: Date, format: 'dd/mm/yyyy' });
  const money = (minor: Minor): XCell => ({ value: minor / 100, type: Number, format: MONEY });
  const income = set.records.filter((r) => r.type === 'income');
  const expenses = set.records.filter((r) => r.type === 'expense');
  const summary: XCell[][] = [
    [bold('MTD summary'), s.windowText],
    ['Update periods', s.kind === 'calendar' ? 'Calendar (from 1 April)' : 'Standard (from 6 April)'],
    ['Basis', 'Cumulative from the start of the tax year'],
    [],
    [bold('Income tax category'), bold('Type'), bold('Amount'), bold('Disallowable amount')],
  ];
  const first = summary.length + 1;
  for (const { key, type } of MTD_ROWS) {
    const label = hmrcLabel(key);
    summary.push(
      type === 'income'
        ? [label, 'Income', fx(`SUMIF(Income!E:E,${xq(label)},Income!D:D)`), null]
        : [
            label,
            'Expense',
            fx(`SUMIF(Expenses!F:F,${xq(label)},Expenses!D:D)`),
            fx(`SUMIF(Expenses!F:F,${xq(label)},Expenses!E:E)`),
          ],
    );
  }
  const last = summary.length;
  const incomeRows = MTD_ROWS.filter((r) => r.type === 'income').length;
  summary.push(
    [bold('Total income'), '', fx(`SUM(C${first}:C${first + incomeRows - 1})`), null],
    [
      bold('Total expenses'),
      '',
      fx(`SUM(C${first + incomeRows}:C${last})`),
      fx(`SUM(D${first + incomeRows}:D${last})`),
    ],
    [],
    ['Left out (no category)', s.leftOut.count === 1 ? '1 entry' : `${s.leftOut.count} entries`, money(s.leftOut.minor), null],
    ...(s.vehicleNote ? [['Vehicle', s.vehicleNote] as XCell[]] : []),
    ['Note', "Generated by Sunday Sort. Not tax advice. Sunday Sort isn't MTD software."],
  );
  return [
    {
      sheet: 'Income',
      stickyRowsCount: 1,
      columns: [{ width: 14 }, { width: 36 }, { width: 26 }, { width: 18 }, { width: 26 }, { width: 14 }],
      data: [
        ['Date received', 'Description', 'Merchant / customer name', 'Amount received (without VAT)', 'Income tax category', 'CIS deducted'].map(bold),
        ...income.map((r): XCell[] => [date(r.at), r.description, r.merchant, money(r.amountMinor), hmrcLabel(r.category), null]),
      ],
    },
    {
      sheet: 'Expenses',
      stickyRowsCount: 1,
      columns: [{ width: 14 }, { width: 40 }, { width: 26 }, { width: 14 }, { width: 18 }, { width: 30 }],
      data: [
        ['Date', 'Description', 'Merchant / customer name', 'Total amount', 'Disallowable amount', 'Income tax category'].map(bold),
        ...expenses.map((r): XCell[] => [date(r.at), r.description, r.merchant, money(r.amountMinor), money(r.disallowableMinor), hmrcLabel(r.category)]),
      ],
    },
    { sheet: 'Summary', columns: [{ width: 34 }, { width: 12 }, { width: 16 }, { width: 20 }], data: summary },
  ];
}

// ---------------- FreeAgent ----------------

/** FreeAgent caps one import at 1,000 expenses. */
export const FREEAGENT_MAX_ROWS = 1000;

export type FreeAgentEngineType = 'Petrol' | 'Diesel' | 'LPG' | 'Electric (Home charger)' | 'Electric (Public charger)';
export interface FreeAgentVehicle {
  engineType: FreeAgentEngineType;
  /** Petrol / LPG: "Up to 1400cc" · "1401-2000cc" · "Over 2000cc"; Diesel: "Up to 1600cc" · "1601-2000cc" · "Over 2000cc"; Electric: "All". */
  engineSize: string;
}
export const FREEAGENT_ENGINE_TYPES: FreeAgentEngineType[] = ['Diesel', 'Petrol', 'LPG', 'Electric (Home charger)', 'Electric (Public charger)'];
export function freeAgentEngineSizes(t: FreeAgentEngineType): string[] {
  if (t === 'Diesel') return ['Up to 1600cc', '1601-2000cc', 'Over 2000cc'];
  if (t === 'Petrol' || t === 'LPG') return ['Up to 1400cc', '1401-2000cc', 'Over 2000cc'];
  return ['All'];
}
/**
 * B-55: FreeAgent only accepts the "(Home charger)" / "(Public charger)" electric types for journeys on or after
 * 1 Sep 2025; earlier journeys must say plain "Electric" (FreeAgent "Import mileage claims in bulk").
 */
const FREEAGENT_EV_SPLIT = new Date(2025, 8, 1).getTime();
export const freeAgentEngineTypeOn = (t: FreeAgentEngineType, at: number): string =>
  t.startsWith('Electric') && at < FREEAGENT_EV_SPLIT ? 'Electric' : t;
/** Most delivery vans: a 2.0–2.2 litre diesel. */
export const DEFAULT_FREEAGENT_VEHICLE: FreeAgentVehicle = { engineType: 'Diesel', engineSize: 'Over 2000cc' };
/** Keeps an engine size valid for its type (switching type resets the size to the first valid one). */
export const fixEngineSize = (v: FreeAgentVehicle): FreeAgentVehicle => {
  const sizes = freeAgentEngineSizes(v.engineType);
  return sizes.includes(v.engineSize) ? v : { ...v, engineSize: sizes[sizes.length - 1] };
};

/** Built-in categories → FreeAgent's standard spending categories ("Categorise a business cost"). */
const FREEAGENT_BY_KEY: Partial<Record<CategoryKey, string>> = {
  fuel: 'Motor Expenses',
  repairs: 'Motor Expenses',
  insurance: 'Motor Expenses',
  lease: 'Motor Expenses',
  parking: 'Travel',
  phone: 'Mobile Phone',
  equipment: 'Sundries',
  fees: 'Accountancy Fees',
  other_expense: 'Sundries',
};
/** Custom categories fall back on their HMRC category. */
const FREEAGENT_BY_MTD: Partial<Record<HmrcCategory, string>> = {
  adminCosts: 'Office Costs',
  advertisingCosts: 'Advertising and Promotion',
  businessEntertainmentCosts: 'Business Entertaining',
  carVanTravelExpenses: 'Travel',
  costOfGoods: 'Materials',
  financeCharges: 'Bank/Finance Charges',
  interestOnBankOtherLoans: 'Interest Payable',
  paymentsToSubcontractors: 'Subcontractor Costs',
  premisesRunningCosts: 'Rent',
  professionalFees: 'Legal and Professional fees',
};
export function freeAgentCategory(r: Pick<MtdRecord, 'category' | 'categoryInfo'>): string {
  const byKey = r.categoryInfo?.key ? FREEAGENT_BY_KEY[r.categoryInfo.key] : undefined;
  return byKey ?? FREEAGENT_BY_MTD[r.category] ?? 'Sundries';
}

/**
 * FreeAgent out-of-pocket expenses import (template columns, in order). Expenses only — the mileage allowance row
 * is not an expense in FreeAgent (the Mileage file is). Split into files of ≤ 1,000 rows.
 */
export function freeAgentExpensesCsv(claimant: string, set: MtdRecordSet, currency: 'GBP' | 'USD'): string[] {
  const rows = set.records.filter((r) => r.type === 'expense' && r.categoryInfo !== null);
  const header = csvRow([
    'claimant_name',
    'category',
    'DD/MM/YYYY',
    'currency',
    'type',
    'gross_value',
    'description',
    'receipt_reference',
    'sales_tax_rate',
  ]);
  const files: string[] = [];
  for (let i = 0; i < Math.max(rows.length, 1); i += FREEAGENT_MAX_ROWS) {
    const chunk = rows.slice(i, i + FREEAGENT_MAX_ROWS);
    files.push(
      csvDocument([
        header,
        ...chunk.map((r) =>
          csvRow([claimant, freeAgentCategory(r), ukDate(r.at), currency, 'Payment', toDecimalString(r.amountMinor), r.description, '', '']),
        ),
      ]),
    );
  }
  return files;
}

export interface FreeAgentTrip {
  at: number;
  miles: number;
  purpose: string;
}

/**
 * FreeAgent mileage import. Vans go in as "Car" (FreeAgent only has Car / Motorcycle / Bicycle); engine type and
 * size are required for cars. reclaim_mileage = 1 when the driver claims the mileage rate, 0 under actual costs
 * (the trips are still the mileage log). Work trips only.
 */
export function freeAgentMileageCsv(claimant: string, trips: FreeAgentTrip[], vehicle: FreeAgentVehicle, method: VehicleCostMethod): string[] {
  const v = fixEngineSize(vehicle);
  const reclaim = vehicleTreatment(method).claimsMileage ? '1' : '0';
  const header = csvRow(['claimant_name', 'DD/MM/YYYY', 'description', 'mileage', 'vehicle_type', 'engine_type', 'engine_size', 'reclaim_mileage']);
  const sorted = [...trips].sort((a, b) => a.at - b.at);
  const files: string[] = [];
  for (let i = 0; i < Math.max(sorted.length, 1); i += FREEAGENT_MAX_ROWS) {
    files.push(
      csvDocument([
        header,
        ...sorted
          .slice(i, i + FREEAGENT_MAX_ROWS)
          .map((t) =>
            csvRow([claimant, ukDate(t.at), t.purpose.trim() || 'Business miles', roundTenth(t.miles).toFixed(1), 'Car', freeAgentEngineTypeOn(v.engineType, t.at), v.engineSize, reclaim]),
          ),
      ]),
    );
  }
  return files;
}
