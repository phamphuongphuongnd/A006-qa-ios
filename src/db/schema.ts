import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { CategoryKey } from '@/domain/categories';
import type { EntryType, Scope } from '@/domain/types';

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  type: text('type').$type<EntryType>().notNull(),
  /** Built-in key for keyword suggestions; null for categories the user created. */
  key: text('key').$type<CategoryKey>(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  taxLine: text('tax_line').notNull(),
  sortOrder: integer('sort_order').notNull(),
  hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
});

export const entries = sqliteTable(
  'entries',
  {
    id: text('id').primaryKey(),
    type: text('type').$type<EntryType>().notNull(),
    /** Integer pence / cents. */
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').$type<'GBP' | 'USD'>().notNull(),
    occurredAt: integer('occurred_at').notNull(),
    note: text('note').notNull().default(''),
    /** null = unsorted (waiting for Sunday). */
    categoryId: text('category_id').references(() => categories.id),
    scope: text('scope').$type<Scope>().notNull().default('work'),
    sortedAt: integer('sorted_at'),
    /** Shared by all parts produced by one split. */
    splitGroupId: text('split_group_id'),
    /** Original amount before the split, kept for the "Split from £60.00" line. */
    splitFromMinor: integer('split_from_minor'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('entries_occurred_idx').on(t.occurredAt), index('entries_category_idx').on(t.categoryId)],
);

export const receipts = sqliteTable(
  'receipts',
  {
    id: text('id').primaryKey(),
    entryId: text('entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    /** Path relative to the app's receipts directory. One file may be shared by split parts. */
    filePath: text('file_path').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('receipts_entry_idx').on(t.entryId)],
);

export type TripStatus = 'running' | 'paused' | 'done' | 'interrupted';

export const trips = sqliteTable(
  'trips',
  {
    id: text('id').primaryKey(),
    source: text('source').$type<'gps' | 'manual'>().notNull(),
    status: text('status').$type<TripStatus>().notNull(),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at'),
    distanceM: real('distance_m').notNull().default(0),
    odoStart: real('odo_start'),
    odoEnd: real('odo_end'),
    scope: text('scope').$type<Scope>().notNull().default('work'),
    purpose: text('purpose').notNull().default(''),
    /** User changed the GPS distance by hand. */
    edited: integer('edited', { mode: 'boolean' }).notNull().default(false),
    /** Last time the background task wrote a point — used to detect silent stops. */
    lastPointAt: integer('last_point_at'),
  },
  (t) => [index('trips_started_idx').on(t.startedAt)],
);

export const tripPoints = sqliteTable(
  'trip_points',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tripId: text('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    ts: integer('ts').notNull(),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    accuracy: real('accuracy').notNull(),
    segmentStart: integer('segment_start', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('trip_points_trip_idx').on(t.tripId, t.ts)],
);

/** Key → JSON value. See `settings` repository for the typed shape. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type CategoryRow = typeof categories.$inferSelect;
export type EntryRow = typeof entries.$inferSelect;
export type ReceiptRow = typeof receipts.$inferSelect;
export type TripRow = typeof trips.$inferSelect;
export type TripPointRow = typeof tripPoints.$inferSelect;
