import type { EntryType, Region } from './types';

/** Stable key for a built-in category; custom categories have no key. Used by the keyword suggester. */
export type CategoryKey =
  | 'delivery_income'
  | 'tips'
  | 'other_income'
  | 'fuel'
  | 'repairs'
  | 'insurance'
  | 'parking'
  | 'lease'
  | 'phone'
  | 'equipment'
  | 'fees'
  | 'other_expense';

export interface DefaultCategory {
  key: CategoryKey;
  type: EntryType;
  name: string;
  taxLine: string;
  icon: string;
  color: string;
}

const C = (
  key: CategoryKey,
  type: EntryType,
  name: string,
  taxLine: string,
  icon: string,
  color: string,
): DefaultCategory => ({ key, type, name, taxLine, icon, color });

export const DEFAULT_CATEGORIES: Record<Region, DefaultCategory[]> = {
  UK: [
    C('delivery_income', 'income', 'Delivery income', 'SA103: Turnover', 'truck', '#1E8E5A'),
    C('tips', 'income', 'Tips & bonuses', 'SA103: Turnover', 'gift', '#3BA776'),
    C('other_income', 'income', 'Other income', 'SA103: Other business income', 'plus-circle', '#5FB98E'),
    C('fuel', 'expense', 'Fuel', 'SA103: Car, van and travel expenses', 'fuel', '#C8553D'),
    C('repairs', 'expense', 'Van repairs & servicing', 'SA103: Car, van and travel expenses', 'wrench', '#D9774A'),
    C('insurance', 'expense', 'Van insurance & tax', 'SA103: Car, van and travel expenses', 'shield', '#B9683F'),
    C('parking', 'expense', 'Parking, tolls & congestion', 'SA103: Car, van and travel expenses', 'parking', '#8C6D4F'),
    C('lease', 'expense', 'Van lease / finance', 'SA103: Car, van and travel expenses', 'key', '#A0522D'),
    C('phone', 'expense', 'Phone & data', 'SA103: Phone, fax, stationery and other office costs', 'phone', '#2E6FD8'),
    C('equipment', 'expense', 'Equipment & uniform', 'SA103: Other allowable business expenses', 'box', '#7A6F9B'),
    C('fees', 'expense', 'Accountant & fees', 'SA103: Accountancy, legal and other professional fees', 'briefcase', '#4F5D75'),
    C('other_expense', 'expense', 'Other expenses', 'SA103: Other allowable business expenses', 'dots', '#6B7280'),
  ],
  US: [
    C('delivery_income', 'income', 'Delivery income', 'Schedule C: Line 1 Gross receipts', 'truck', '#1E8E5A'),
    C('tips', 'income', 'Tips & bonuses', 'Schedule C: Line 1 Gross receipts', 'gift', '#3BA776'),
    C('other_income', 'income', 'Other income', 'Schedule C: Line 6 Other income', 'plus-circle', '#5FB98E'),
    C('fuel', 'expense', 'Fuel', 'Schedule C: Line 9 Car and truck expenses', 'fuel', '#C8553D'),
    C('repairs', 'expense', 'Vehicle repairs', 'Schedule C: Line 21 Repairs and maintenance', 'wrench', '#D9774A'),
    C('insurance', 'expense', 'Vehicle insurance', 'Schedule C: Line 15 Insurance', 'shield', '#B9683F'),
    C('parking', 'expense', 'Parking & tolls', 'Schedule C: Line 9 Car and truck expenses', 'parking', '#8C6D4F'),
    C('lease', 'expense', 'Vehicle lease', 'Schedule C: Line 20a Rent or lease – vehicles', 'key', '#A0522D'),
    C('phone', 'expense', 'Phone & data', 'Schedule C: Line 25 Utilities', 'phone', '#2E6FD8'),
    C('equipment', 'expense', 'Supplies & equipment', 'Schedule C: Line 22 Supplies', 'box', '#7A6F9B'),
    C('fees', 'expense', 'Professional fees', 'Schedule C: Line 17 Legal and professional services', 'briefcase', '#4F5D75'),
    C('other_expense', 'expense', 'Other expenses', 'Schedule C: Line 27a Other expenses', 'dots', '#6B7280'),
  ],
};

/** Every tax-form line a category can be mapped to, per region (for the category editor). */
export const TAX_LINES: Record<Region, string[]> = {
  UK: [
    'SA103: Turnover',
    'SA103: Other business income',
    'SA103: Cost of goods bought for resale',
    'SA103: Car, van and travel expenses',
    'SA103: Wages, salaries and other staff costs',
    'SA103: Rent, rates, power and insurance costs',
    'SA103: Repairs and maintenance of property and equipment',
    'SA103: Phone, fax, stationery and other office costs',
    'SA103: Advertising and business entertainment costs',
    'SA103: Interest on bank and other loans',
    'SA103: Bank, credit card and other financial charges',
    'SA103: Accountancy, legal and other professional fees',
    'SA103: Other allowable business expenses',
  ],
  US: [
    'Schedule C: Line 1 Gross receipts',
    'Schedule C: Line 6 Other income',
    'Schedule C: Line 8 Advertising',
    'Schedule C: Line 9 Car and truck expenses',
    'Schedule C: Line 15 Insurance',
    'Schedule C: Line 16b Interest (other)',
    'Schedule C: Line 17 Legal and professional services',
    'Schedule C: Line 18 Office expense',
    'Schedule C: Line 20a Rent or lease – vehicles',
    'Schedule C: Line 21 Repairs and maintenance',
    'Schedule C: Line 22 Supplies',
    'Schedule C: Line 24b Meals',
    'Schedule C: Line 25 Utilities',
    'Schedule C: Line 27a Other expenses',
  ],
};

/** The income lines of each region's form; every other line is an expense line. */
const INCOME_LINES: Record<Region, string[]> = {
  UK: ['SA103: Turnover', 'SA103: Other business income'],
  US: ['Schedule C: Line 1 Gross receipts', 'Schedule C: Line 6 Other income'],
};

/** Lines a category of this type may use: income lines for income, expense lines for expenses (B-31). */
export function taxLinesFor(region: Region, type: EntryType): string[] {
  const income = INCOME_LINES[region];
  return TAX_LINES[region].filter((l) => income.includes(l) === (type === 'income'));
}

/** Safe default line for a new category: "Other business income" / "Other … expenses". */
export function defaultTaxLine(region: Region, type: EntryType): string {
  const key: CategoryKey = type === 'income' ? 'other_income' : 'other_expense';
  return DEFAULT_CATEGORIES[region].find((c) => c.key === key)!.taxLine;
}

/**
 * Line for a category when the region changes (B-33). Custom categories follow the built-ins that shared their old
 * line (most common new line wins, e.g. "Car, van and travel" → "Line 9 Car and truck"); otherwise the type's default.
 */
export function mapTaxLine(line: string, type: EntryType, from: Region, to: Region): string {
  if (taxLinesFor(to, type).includes(line)) return line;
  const toByKey = new Map(DEFAULT_CATEGORIES[to].map((c) => [c.key, c.taxLine]));
  const counts = new Map<string, number>();
  for (const c of DEFAULT_CATEGORIES[from]) {
    if (c.taxLine !== line || c.type !== type) continue;
    const target = toByKey.get(c.key);
    if (target) counts.set(target, (counts.get(target) ?? 0) + 1);
  }
  let best: string | null = null;
  for (const [l, n] of counts) if (best === null || n > counts.get(best)!) best = l;
  return best ?? defaultTaxLine(to, type);
}

/**
 * Built-in keywords per category key (lower case). Multi-word phrases match on the normalised note.
 * Region-neutral on purpose: a UK driver may still buy at a US-named chain and vice versa.
 */
export const CATEGORY_KEYWORDS: Record<CategoryKey, string[]> = {
  delivery_income: ['payout', 'amazon flex', 'flex', 'dpd', 'evri', 'yodel', 'hermes', 'royal mail', 'ups', 'fedex', 'doordash', 'uber', 'ubereats', 'deliveroo', 'just eat', 'instacart', 'gopuff', 'shipt', 'invoice', 'weekly pay', 'wages', 'route'],
  tips: ['tip', 'tips', 'bonus', 'incentive', 'surge'],
  other_income: ['refund', 'rebate', 'grant'],
  fuel: ['fuel', 'diesel', 'petrol', 'gas', 'shell', 'bp', 'esso', 'texaco', 'jet', 'gulf', 'chevron', 'exxon', 'mobil', 'sunoco', 'valero', 'marathon', 'circle k', 'speedway', 'arco', 'costco gas', 'adblue', 'ev charge', 'charging'],
  repairs: ['repair', 'repairs', 'service', 'servicing', 'mot', 'tyre', 'tyres', 'tire', 'tires', 'kwik fit', 'halfords', 'garage', 'mechanic', 'oil change', 'jiffy lube', 'midas', 'pep boys', 'autozone', 'wiper', 'bulb', 'brake', 'brakes', 'clutch', 'car wash', 'wash'],
  insurance: ['insurance', 'insure', 'road tax', 'vehicle tax', 'dvla', 'geico', 'progressive', 'state farm', 'allstate', 'registration'],
  parking: ['parking', 'park', 'ncp', 'ringgo', 'justpark', 'paybyphone', 'toll', 'tolls', 'dart', 'dartford', 'congestion', 'ulez', 'caz', 'clean air', 'ez pass', 'ezpass', 'sunpass', 'fastrak', 'meter', 'pcn', 'ticket'],
  lease: ['lease', 'finance', 'hire', 'rental', 'van hire', 'loan'],
  phone: ['phone', 'mobile', 'data', 'sim', 'ee', 'o2', 'vodafone', 'three', 'giffgaff', 'tesco mobile', 'verizon', 'at&t', 'att', 't-mobile', 'tmobile', 'cricket', 'mint mobile', 'charger', 'phone mount'],
  equipment: ['uniform', 'boots', 'gloves', 'hi vis', 'hi-vis', 'trolley', 'sack truck', 'dolly', 'straps', 'equipment', 'tools', 'satnav', 'dashcam', 'dash cam'],
  fees: ['accountant', 'accounting', 'bookkeeping', 'software', 'subscription', 'bank fee', 'fee', 'fees', 'hmrc', 'irs', 'tax return', 'turbotax'],
  other_expense: [],
};
