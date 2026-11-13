import { defaultMtdCategory, type HmrcCategory } from './mtd';
import { inPeriod } from './taxYear';
import type { EntryType, Minor, Period, Region, Scope, VehicleCostMethod } from './types';
import { vehicleTreatment } from './vehicleCosts';

export interface ReportEntry {
  type: EntryType;
  amountMinor: Minor;
  occurredAt: number;
  categoryId: string | null;
  scope: Scope;
}

export interface ReportCategory {
  id: string;
  name: string;
  taxLine: string;
  /** UK: HMRC category for MTD (null / missing → derived from the tax line). */
  mtdCategory?: HmrcCategory | null;
  /** "Covered by the mileage rate" category (fuel, repairs, insurance & road tax, lease). */
  vehicleRunningCost?: boolean;
}

export interface CategoryTotal {
  /** null = Unsorted; MILEAGE_ID = the mileage allowance row. */
  categoryId: string | null;
  name: string;
  type: EntryType;
  totalMinor: Minor;
}

export interface MtdTotal {
  /** null = Unsorted (no category yet). */
  mtdCategory: HmrcCategory | null;
  type: EntryType;
  totalMinor: Minor;
}

/** Vehicle cost method (X2 / Q24) for a report: decides which vehicle amounts count. */
export interface ReportVehicle {
  method: VehicleCostMethod;
  /** Mileage allowance for the report period (added as an expense when the method claims mileage). */
  mileageMinor: Minor;
  /** Work miles in the period (row label "Mileage (8,412 mi)"). */
  workMiles: number;
  region: Region;
}

export interface Report {
  incomeMinor: Minor;
  expenseMinor: Minor;
  profitMinor: Minor;
  /** Sum of personal entries left out (both types, absolute). */
  personalExcludedMinor: Minor;
  unsortedCount: number;
  byCategory: CategoryTotal[];
  byTaxLine: { taxLine: string; type: EntryType; totalMinor: Minor }[];
  /** UK: totals by HMRC category (MTD). Empty rows are not listed; see `mtdRows` for the full 17. */
  byMtd: MtdTotal[];
  /** Mileage allowance counted in expenses (0 under actual costs or with no vehicle input). */
  mileageClaimMinor: Minor;
  /** Running-cost entries left out because the mileage rate covers them (§5.3 "Covered by mileage rate"). */
  coveredMinor: Minor;
  coveredByCategory: CategoryTotal[];
}

export const UNSORTED_NAME = 'Unsorted';
/** byCategory id of the mileage allowance row. */
export const MILEAGE_ID = '__mileage';
export const MILEAGE_NAME = 'Mileage';

/** Tax-form line the mileage allowance is totalled into (§5.3). */
export const MILEAGE_TAX_LINE: Record<Region, string> = {
  UK: 'SA103: Car, van and travel expenses',
  US: 'Schedule C: Line 9 Car and truck expenses',
};

/** Tax-form line label for entries not sorted yet: "Unsorted income" / "Unsorted expenses". */
export const unsortedLine = (type: EntryType) => (type === 'income' ? 'Unsorted income' : 'Unsorted expenses');

/** HMRC category of a category: its own MTD category, else the default of its tax line (UK lines only). */
export const mtdOf = (c: Pick<ReportCategory, 'mtdCategory' | 'taxLine'>, type: EntryType): HmrcCategory | null =>
  c.mtdCategory ?? defaultMtdCategory(c.taxLine, type);

/**
 * Totals for a period. Only work entries count unless includePersonal is set. With `vehicle`, the vehicle cost method
 * applies: mileage rate (or "not sure") leaves running-cost entries out (grouped as covered) and adds the mileage
 * allowance to "Car, van and travel expenses" / "Line 9"; actual costs count every vehicle entry and no allowance.
 */
export function buildReport(
  entries: ReportEntry[],
  categories: ReportCategory[],
  period: Period,
  opts: { includePersonal?: boolean; vehicle?: ReportVehicle } = {},
): Report {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const byCat = new Map<string, CategoryTotal>();
  const covered = new Map<string, CategoryTotal>();
  const byLine = new Map<string, { taxLine: string; type: EntryType; totalMinor: Minor }>();
  const byMtd = new Map<string, MtdTotal>();
  const treatment = opts.vehicle ? vehicleTreatment(opts.vehicle.method) : null;
  let income = 0;
  let expense = 0;
  let personal = 0;
  let unsorted = 0;
  let coveredMinor = 0;

  const addLine = (line: string, type: EntryType, minor: Minor) => {
    const lk = `${type}:${line}`;
    const lt = byLine.get(lk) ?? { taxLine: line, type, totalMinor: 0 };
    lt.totalMinor += minor;
    byLine.set(lk, lt);
  };
  const addMtd = (m: HmrcCategory | null, type: EntryType, minor: Minor) => {
    const mk = `${type}:${m ?? '-'}`;
    const mt = byMtd.get(mk) ?? { mtdCategory: m, type, totalMinor: 0 };
    mt.totalMinor += minor;
    byMtd.set(mk, mt);
  };

  for (const e of entries) {
    if (!inPeriod(e.occurredAt, period)) continue;
    if (e.categoryId === null) unsorted++;
    if (e.scope === 'personal' && !opts.includePersonal) {
      personal += e.amountMinor;
      continue;
    }
    const cat = e.categoryId ? catById.get(e.categoryId) : undefined;
    const key = `${e.type}:${cat?.id ?? '-'}`;

    if (cat?.vehicleRunningCost && e.type === 'expense' && treatment?.excludesRunningCosts) {
      coveredMinor += e.amountMinor;
      const ct = covered.get(key) ?? { categoryId: cat.id, name: cat.name, type: e.type, totalMinor: 0 };
      ct.totalMinor += e.amountMinor;
      covered.set(key, ct);
      continue;
    }

    if (e.type === 'income') income += e.amountMinor;
    else expense += e.amountMinor;

    const ct = byCat.get(key) ?? { categoryId: cat?.id ?? null, name: cat?.name ?? UNSORTED_NAME, type: e.type, totalMinor: 0 };
    ct.totalMinor += e.amountMinor;
    byCat.set(key, ct);

    // Unsorted income and unsorted expenses are separate lines, so name them apart (B-06).
    addLine(cat?.taxLine ?? unsortedLine(e.type), e.type, e.amountMinor);
    addMtd(cat ? mtdOf(cat, e.type) : null, e.type, e.amountMinor);
  }

  let mileageClaimMinor = 0;
  if (opts.vehicle && treatment?.claimsMileage && opts.vehicle.mileageMinor > 0) {
    mileageClaimMinor = opts.vehicle.mileageMinor;
    expense += mileageClaimMinor;
    byCat.set(`expense:${MILEAGE_ID}`, { categoryId: MILEAGE_ID, name: MILEAGE_NAME, type: 'expense', totalMinor: mileageClaimMinor });
    addLine(MILEAGE_TAX_LINE[opts.vehicle.region], 'expense', mileageClaimMinor);
    if (opts.vehicle.region === 'UK') addMtd('carVanTravelExpenses', 'expense', mileageClaimMinor);
  }

  const desc = <T extends { totalMinor: Minor }>(a: T, b: T) => b.totalMinor - a.totalMinor;
  return {
    incomeMinor: income,
    expenseMinor: expense,
    profitMinor: income - expense,
    personalExcludedMinor: personal,
    unsortedCount: unsorted,
    byCategory: [...byCat.values()].sort(desc),
    byTaxLine: [...byLine.values()].sort(desc),
    byMtd: [...byMtd.values()].filter((m) => m.mtdCategory !== null || m.totalMinor !== 0).sort(desc),
    mileageClaimMinor,
    coveredMinor,
    coveredByCategory: [...covered.values()].sort(desc),
  };
}
