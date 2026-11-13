import type { CategoryKey } from './categories';
import type { EntryType, Region } from './types';

/**
 * HMRC categories used by MTD quarterly updates (product.md §5.1). Keys are the field names of HMRC's
 * self-employment period summary, so exports can map 1:1; labels are what the app shows ("MTD: …").
 */
export const HMRC_EXPENSE_CATEGORIES = {
  adminCosts: 'Administrative costs',
  advertisingCosts: 'Advertising and marketing',
  businessEntertainmentCosts: 'Business entertainment',
  carVanTravelExpenses: 'Car, van and travel expenses',
  costOfGoods: 'Cost of goods',
  depreciation: 'Depreciation',
  financeCharges: 'Finance charges',
  interestOnBankOtherLoans: 'Interest on loans',
  irrecoverableDebts: 'Bad debts',
  maintenanceCosts: 'Repairs and maintenance',
  otherExpenses: 'Other expenses',
  paymentsToSubcontractors: 'Payments to subcontractors',
  premisesRunningCosts: 'Premises running costs',
  professionalFees: 'Professional fees',
  wagesAndStaffCosts: 'Wages and staff costs',
} as const;

export const HMRC_INCOME_CATEGORIES = {
  turnover: 'Turnover',
  other: 'Other business income',
} as const;

export type HmrcExpenseCategory = keyof typeof HMRC_EXPENSE_CATEGORIES;
export type HmrcIncomeCategory = keyof typeof HMRC_INCOME_CATEGORIES;
export type HmrcCategory = HmrcExpenseCategory | HmrcIncomeCategory;

export const hmrcLabel = (c: HmrcCategory): string =>
  (HMRC_EXPENSE_CATEGORIES as Record<string, string>)[c] ?? (HMRC_INCOME_CATEGORIES as Record<string, string>)[c];

/** Categories a category of this type may map to (for the "MTD category" picker). */
export function hmrcCategoriesFor(type: EntryType): HmrcCategory[] {
  return Object.keys(type === 'income' ? HMRC_INCOME_CATEGORIES : HMRC_EXPENSE_CATEGORIES) as HmrcCategory[];
}

/** Default HMRC category of each SA103 line (a custom category inherits its line's default). */
export const SA103_TO_HMRC: Record<string, HmrcCategory> = {
  'SA103: Turnover': 'turnover',
  'SA103: Other business income': 'other',
  'SA103: Cost of goods bought for resale': 'costOfGoods',
  'SA103: Car, van and travel expenses': 'carVanTravelExpenses',
  'SA103: Wages, salaries and other staff costs': 'wagesAndStaffCosts',
  'SA103: Rent, rates, power and insurance costs': 'premisesRunningCosts',
  'SA103: Repairs and maintenance of property and equipment': 'maintenanceCosts',
  'SA103: Phone, fax, stationery and other office costs': 'adminCosts',
  'SA103: Advertising and business entertainment costs': 'advertisingCosts',
  'SA103: Interest on bank and other loans': 'interestOnBankOtherLoans',
  'SA103: Bank, credit card and other financial charges': 'financeCharges',
  'SA103: Accountancy, legal and other professional fees': 'professionalFees',
  'SA103: Other allowable business expenses': 'otherExpenses',
};

/** MTD category for a tax line: only UK (SA103) lines have one; US categories keep null. */
export function defaultMtdCategory(taxLine: string, type: EntryType): HmrcCategory | null {
  const c = SA103_TO_HMRC[taxLine];
  if (c) return c;
  if (!taxLine.startsWith('SA103:')) return null;
  return type === 'income' ? 'other' : 'otherExpenses';
}

/** Region-aware wrapper: US never carries an MTD category. */
export const mtdCategoryFor = (region: Region, taxLine: string, type: EntryType): HmrcCategory | null =>
  region === 'UK' ? defaultMtdCategory(taxLine, type) : null;

/**
 * Built-in categories "covered by the mileage rate" (product.md §5, X2): fuel, repairs, insurance & road tax, lease.
 * Parking, tolls and congestion are claimed on top of the rate, so they are not running costs.
 */
export const VEHICLE_RUNNING_COST_KEYS: readonly CategoryKey[] = ['fuel', 'repairs', 'insurance', 'lease'];

export const isVehicleRunningCostKey = (key: CategoryKey | null | undefined): boolean =>
  !!key && VEHICLE_RUNNING_COST_KEYS.includes(key);
