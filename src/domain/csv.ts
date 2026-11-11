import { toDecimalString } from './money';
import type { Currency, EntryType, Minor, Scope } from './types';

/** RFC 4180 field; also neutralises spreadsheet formula injection (=, +, -, @ at start). */
export function csvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const csvRow = (cells: (string | number | boolean | null | undefined)[]) => cells.map(csvField).join(',');

/** CRLF line endings + UTF-8 BOM so Excel opens £ correctly. */
export const csvDocument = (rows: string[]) => `﻿${rows.join('\r\n')}\r\n`;

const pad = (n: number) => String(n).padStart(2, '0');
/** Local date as YYYY-MM-DD. */
export const isoDate = (at: number) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const isoTime = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export interface CsvEntry {
  id: string;
  occurredAt: number;
  type: EntryType;
  amountMinor: Minor;
  currency: Currency;
  categoryName: string | null;
  taxLine: string | null;
  scope: Scope;
  note: string;
  receiptCount: number;
}

export function entriesCsv(entries: CsvEntry[]): string {
  const rows = [
    csvRow(['date', 'time', 'type', 'amount', 'currency', 'category', 'tax_line', 'work_personal', 'note', 'has_receipt', 'entry_id']),
    ...[...entries]
      .sort((a, b) => a.occurredAt - b.occurredAt)
      .map((e) =>
        csvRow([
          isoDate(e.occurredAt),
          isoTime(e.occurredAt),
          e.type,
          toDecimalString(e.amountMinor),
          e.currency,
          e.categoryName ?? 'Unsorted',
          e.taxLine ?? '',
          e.scope,
          e.note,
          e.receiptCount > 0 ? 'yes' : 'no',
          e.id,
        ]),
      ),
  ];
  return csvDocument(rows);
}

export interface CsvTotal {
  type: EntryType;
  name: string;
  taxLine: string;
  totalMinor: Minor;
}

export function totalsCsv(totals: CsvTotal[], currency: Currency, periodLabel: string): string {
  return csvDocument([
    csvRow(['period', 'type', 'category', 'tax_line', 'total', 'currency']),
    ...totals.map((t) => csvRow([periodLabel, t.type, t.name, t.taxLine, toDecimalString(t.totalMinor), currency])),
  ]);
}

export interface CsvTrip {
  startedAt: number;
  miles: number;
  scope: Scope;
  purpose: string;
  source: 'gps' | 'manual';
  odoStart: number | null;
  odoEnd: number | null;
}

export function mileageCsv(trips: CsvTrip[]): string {
  return csvDocument([
    csvRow(['date', 'miles', 'work_personal', 'purpose', 'source', 'odometer_start', 'odometer_end']),
    ...[...trips]
      .sort((a, b) => a.startedAt - b.startedAt)
      .map((t) => csvRow([isoDate(t.startedAt), t.miles.toFixed(1), t.scope, t.purpose, t.source, t.odoStart, t.odoEnd])),
  ]);
}
