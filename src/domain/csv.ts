import { toDecimalString } from './money';
import type { Currency, EntrySource, EntryType, Minor, Scope, TripScope, TripSource, TripStartedBy } from './types';

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

/** DD/MM/YYYY — UK spreadsheets, MTDsorted and FreeAgent imports (FreeAgent requires it). */
export const ukDate = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export interface CsvEntry {
  id: string;
  occurredAt: number;
  type: EntryType;
  amountMinor: Minor;
  currency: Currency;
  categoryName: string | null;
  taxLine: string | null;
  /** UK: HMRC category label ("Car, van and travel expenses"); null for the US or Unsorted. */
  mtdCategory?: string | null;
  scope: Scope;
  note: string;
  receiptCount: number;
  /** 'recurring' entries were made by a Recurring template. */
  source?: EntrySource;
  /** Sorted by a Rule (label "Auto"). */
  autoSorted?: boolean;
}

/** F-15 "CSV – all entries" (free, raw): every column the driver may need, one row per entry, oldest first. */
export function entriesCsv(entries: CsvEntry[]): string {
  const rows = [
    csvRow([
      'date',
      'time',
      'type',
      'amount',
      'currency',
      'category',
      'tax_line',
      'mtd_category',
      'work_personal',
      'note',
      'receipts',
      'source',
      'auto_sorted',
      'recurring',
      'entry_id',
    ]),
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
          e.mtdCategory ?? '',
          e.scope,
          e.note,
          e.receiptCount,
          e.source ?? 'manual',
          e.autoSorted ? 'yes' : 'no',
          e.source === 'recurring' ? 'yes' : 'no',
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

/** Where a trip came from in exports: GPS Start/Stop, automatic, NFC tag, typed in, or estimated for missed miles (Q26/Q27). */
export type TripSourceLabel = 'GPS' | 'auto' | 'NFC' | 'manual' | 'gap';
export const tripSourceLabel = (t: { source: TripSource; startedBy?: TripStartedBy | null }): TripSourceLabel =>
  t.source === 'manual' ? 'manual' : t.source === 'gap' ? 'gap' : t.startedBy === 'auto' ? 'auto' : t.startedBy === 'nfc' ? 'NFC' : 'GPS';

export interface CsvTrip {
  startedAt: number;
  /** null for manual trips (a date only). */
  endedAt?: number | null;
  miles: number;
  /** Raw export: an automatic trip still waiting in the Sort queue exports as "unsorted". */
  scope: TripScope;
  purpose: string;
  source: TripSource;
  startedBy?: TripStartedBy | null;
  /** Times or distance changed by hand (Q19). */
  edited?: boolean;
  /** Recorded distance before the first hand edit. */
  originalMiles?: number | null;
  odoStart: number | null;
  odoEnd: number | null;
  /** A → B trips (Q25): place labels; null for GPS / typed-in trips. */
  fromLabel?: string | null;
  toLabel?: string | null;
  roundTrip?: boolean;
}

/** F-15 "CSV – mileage log" (free, raw). A → B trips carry from / to / round_trip; gap trips are marked estimated (Q26). */
export function mileageCsv(trips: CsvTrip[]): string {
  return csvDocument([
    csvRow([
      'date', 'start', 'end', 'miles', 'work_personal', 'purpose', 'from', 'to', 'round_trip',
      'source', 'edited', 'estimated', 'original_miles', 'odometer_start', 'odometer_end',
    ]),
    ...[...trips]
      .sort((a, b) => a.startedAt - b.startedAt)
      .map((t) => {
        const gps = t.source === 'gps';
        return csvRow([
          isoDate(t.startedAt),
          gps ? isoTime(t.startedAt) : '',
          gps && t.endedAt ? isoTime(t.endedAt) : '',
          t.miles.toFixed(1),
          t.scope,
          t.purpose,
          t.fromLabel ?? '',
          t.toLabel ?? '',
          t.fromLabel || t.toLabel ? (t.roundTrip ? 'yes' : 'no') : '',
          tripSourceLabel(t),
          t.edited ? 'yes' : 'no',
          t.source === 'gap' ? 'yes' : 'no',
          t.edited && t.originalMiles != null ? t.originalMiles.toFixed(1) : '',
          t.odoStart,
          t.odoEnd,
        ]);
      }),
  ]);
}
