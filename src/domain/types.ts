export type Region = 'UK' | 'US';
export type Currency = 'GBP' | 'USD';
export type EntryType = 'income' | 'expense';
export type Scope = 'work' | 'personal';

/** Money is always stored as an integer number of minor units (pence / cents). */
export type Minor = number;

/** Half-open time range [start, end) in epoch milliseconds. */
export interface Period {
  start: number;
  end: number;
}

export const currencyOf = (region: Region): Currency => (region === 'UK' ? 'GBP' : 'USD');
