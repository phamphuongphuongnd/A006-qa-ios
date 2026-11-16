import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { CategoryKey } from '@/domain/categories';
import type { HmrcCategory } from '@/domain/mtd';
import type {
  EntrySource,
  EntryType,
  ProEntitlement,
  RecurringFreq,
  Scope,
  TripClassifiedBy,
  TripScope,
  TripSource,
  TripStartedBy,
} from '@/domain/types';

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
  /** UK only: HMRC category for MTD exports (product.md §5.1); null for US. */
  mtdCategory: text('mtd_category').$type<HmrcCategory>(),
  /** "Covered by the mileage rate" (X2): left out of totals when the vehicle cost method is mileage. */
  vehicleRunningCost: integer('vehicle_running_cost', { mode: 'boolean' }).notNull().default(false),
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
    /** 'recurring' = created by a Recurring template on its due date (label "Recurring"). */
    source: text('source').$type<EntrySource>().notNull().default('manual'),
    /** Auto-sorted by this Rule (label "Auto"); kept after the rule is deleted, for "N auto-sorted — Review". */
    ruleId: text('rule_id'),
    /** Created by this Recurring template. */
    recurringId: text('recurring_id'),
    /** Driver looked at the auto-sorted entry in "Review" (it leaves the "N auto-sorted" count). */
    autoReviewedAt: integer('auto_reviewed_at'),
    /** What OCR read from the receipt (P1-12), kept for the "Receipt says £…" chip and suggestions. */
    ocrAmountMinor: integer('ocr_amount_minor'),
    ocrMerchant: text('ocr_merchant'),
    /** Receipt date as epoch ms (local midnight). */
    ocrDate: integer('ocr_date'),
    /** Parking & tolls typed on a trip (Q28): the trip this expense belongs to. Cleared if the trip is deleted but kept. */
    tripId: text('trip_id'),
    /** Last time this entry went into an export file (Q29); edits after that count as "changed since export". */
    exportedAt: integer('exported_at'),
  },
  (t) => [
    index('entries_occurred_idx').on(t.occurredAt),
    index('entries_category_idx').on(t.categoryId),
    index('entries_trip_idx').on(t.tripId),
  ],
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
    /** Raw OCR text (optional, the driver can clear it). */
    ocrText: text('ocr_text'),
  },
  (t) => [index('receipts_entry_idx').on(t.entryId)],
);

export type TripStatus = 'running' | 'paused' | 'done' | 'interrupted';

export const trips = sqliteTable(
  'trips',
  {
    id: text('id').primaryKey(),
    source: text('source').$type<TripSource>().notNull(),
    status: text('status').$type<TripStatus>().notNull(),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at'),
    distanceM: real('distance_m').notNull().default(0),
    odoStart: real('odo_start'),
    odoEnd: real('odo_end'),
    /** 'unsorted' only for automatic trips the app could not classify (P1-2); waits in the Sort queue. */
    scope: text('scope').$type<TripScope>().notNull().default('work'),
    purpose: text('purpose').notNull().default(''),
    /** User changed the GPS times or distance by hand (label "Edited", Q19). */
    edited: integer('edited', { mode: 'boolean' }).notNull().default(false),
    /** Last time the background task wrote a point — used to detect silent stops. */
    lastPointAt: integer('last_point_at'),
    /** GPS trips: who started it (Start button / widget = user, motion = auto, NFC tag = nfc). null for manual trips. */
    startedBy: text('started_by').$type<TripStartedBy>(),
    /** Recorded values before the first hand edit ("Recorded: 07:02–11:48 · 42.3 mi"). */
    originalStartedAt: integer('original_started_at'),
    originalEndedAt: integer('original_ended_at'),
    originalDistanceM: real('original_distance_m'),
    /** Why an automatic trip got its scope; null when the driver chose it. */
    classifiedBy: text('classified_by').$type<TripClassifiedBy>(),
    /** A → B trips (Q25, Pro): place labels + coordinates; distance = driving route (× 2 when round trip). */
    fromLabel: text('from_label'),
    toLabel: text('to_label'),
    fromLat: real('from_lat'),
    fromLng: real('from_lng'),
    toLat: real('to_lat'),
    toLng: real('to_lng'),
    roundTrip: integer('round_trip', { mode: 'boolean' }).notNull().default(false),
    /** Last time this trip went into an export file (Q29). */
    exportedAt: integer('exported_at'),
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

/** A Stop inside a Trip (vehicle not moving): tapped on the sketch to split off a Personal segment (Q6). */
export const tripStops = sqliteTable(
  'trip_stops',
  {
    id: text('id').primaryKey(),
    tripId: text('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at').notNull(),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
  },
  (t) => [index('trip_stops_trip_idx').on(t.tripId, t.startedAt)],
);

/** Part of a Trip re-scoped after the fact (Personal segment). The trip's own scope covers the rest. */
export const tripSegments = sqliteTable(
  'trip_segments',
  {
    id: text('id').primaryKey(),
    tripId: text('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    fromTs: integer('from_ts').notNull(),
    toTs: integer('to_ts').notNull(),
    distanceM: real('distance_m').notNull(),
    scope: text('scope').$type<Scope>().notNull().default('personal'),
  },
  (t) => [index('trip_segments_trip_idx').on(t.tripId)],
);

/** Auto-sort rule (F-09): note / receipt merchant contains `matchText` → category + scope. */
export const rules = sqliteTable('rules', {
  id: text('id').primaryKey(),
  /** Stored as typed; matched case-insensitively on the normalised note / OCR merchant. */
  matchText: text('match_text').notNull(),
  type: text('type').$type<EntryType>().notNull(),
  minMinor: integer('min_minor'),
  maxMinor: integer('max_minor'),
  /** null if the category was deleted (the repository then disables the rule). */
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  scope: text('scope').$type<Scope>().notNull().default('work'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
  hits: integer('hits').notNull().default(0),
  lastHitAt: integer('last_hit_at'),
});

/** "Always sort … as …?" offers the driver declined (P1-10): not asked again for this merchant until then. */
export const ruleOffers = sqliteTable('rule_offers', {
  /** Normalised merchant, e.g. "shell". */
  merchantKey: text('merchant_key').primaryKey(),
  declinedUntil: integer('declined_until').notNull(),
});

/** Recurring template (F-10). Dates are local calendar dates 'YYYY-MM-DD'. */
export const recurring = sqliteTable('recurring', {
  id: text('id').primaryKey(),
  type: text('type').$type<EntryType>().notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency').$type<'GBP' | 'USD'>().notNull(),
  note: text('note').notNull().default(''),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  scope: text('scope').$type<Scope>().notNull().default('work'),
  freq: text('freq').$type<RecurringFreq>().notNull(),
  /** Weekly / every 4 weeks: weekday 0–6 (Sun = 0). Monthly / yearly: day of month 1–31 (clamped to month end). */
  day: integer('day').notNull(),
  /** Yearly only: month 1–12. */
  month: integer('month'),
  startsOn: text('starts_on').notNull(),
  endsOn: text('ends_on'),
  paused: integer('paused', { mode: 'boolean' }).notNull().default(false),
  /** Next due date; the generator creates entries up to today and moves this forward. */
  nextOn: text('next_on').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/** Start / end areas the driver sorted the same way (P1-2: auto scope for trips once count ≥ 3). */
export const knownRoutes = sqliteTable('known_routes', {
  id: text('id').primaryKey(),
  startLat: real('start_lat').notNull(),
  startLng: real('start_lng').notNull(),
  endLat: real('end_lat').notNull(),
  endLng: real('end_lng').notNull(),
  scope: text('scope').$type<Scope>().notNull(),
  count: integer('count').notNull().default(1),
  lastSeenAt: integer('last_seen_at').notNull(),
});

/** Single row (id = 'pro'): in-app trial + store entitlement (product.md §6, §8). */
export const proState = sqliteTable('pro_state', {
  id: text('id').primaryKey(),
  trialStartedAt: integer('trial_started_at'),
  trialEndsAt: integer('trial_ends_at'),
  /** Store side only ('none' | 'active' | 'expired'); the trial is read from the trial columns. */
  entitlement: text('entitlement').$type<ProEntitlement>().notNull().default('none'),
  /** Store subscription end / next renewal. */
  expiresAt: integer('expires_at'),
  productId: text('product_id'),
  autoRenewing: integer('auto_renewing', { mode: 'boolean' }),
  /** Last time the store confirmed the purchase (restore / startup check). */
  lastVerifiedAt: integer('last_verified_at'),
});

/** Places used in A → B trips ("Frequent places" chips, Q25). On the phone only. */
export const places = sqliteTable('places', {
  id: text('id').primaryKey(),
  /** Short name shown on chips and trips ("DLS4", "Tesco Leeds"). */
  label: text('label').notNull(),
  /** Longer address line from the search result. */
  address: text('address').notNull().default(''),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  useCount: integer('use_count').notNull().default(1),
  lastUsedAt: integer('last_used_at').notNull(),
});

/** "Not a trip" (or "Add") answered for the gap between these two GPS trips (Q26): that Missing trip is not shown again. */
export const tripGapDismissals = sqliteTable('trip_gap_dismissals', {
  prevTripId: text('prev_trip_id').notNull(),
  nextTripId: text('next_trip_id').primaryKey(),
  /** 'dismissed' = "Not a trip"; 'added' = an estimated trip was saved for it. */
  answer: text('answer').$type<'dismissed' | 'added'>().notNull().default('dismissed'),
  createdAt: integer('created_at').notNull(),
});

/** Odometer check (Q27): a reading of the vehicle's odometer, compared with the miles logged since the previous one. */
export const odometerReadings = sqliteTable(
  'odometer_readings',
  {
    id: text('id').primaryKey(),
    readAt: integer('read_at').notNull(),
    value: real('value').notNull(),
    /** Unit the driver typed the reading in (Settings → Distance unit at the time). */
    unit: text('unit').$type<'mi' | 'km'>().notNull().default('mi'),
    /** Optional photo of the dashboard: file name in the receipts folder (not a receipt; not counted in the allowance). */
    photoPath: text('photo_path'),
  },
  (t) => [index('odometer_readings_read_idx').on(t.readAt)],
);

/**
 * Recently deleted (Q30): what a delete removed, kept for 30 days so it can be restored. Not part of backups.
 * Receipt files listed in `files` are kept on disk until the item is purged.
 */
export const trash = sqliteTable(
  'trash',
  {
    id: text('id').primaryKey(),
    kind: text('kind').$type<'entry' | 'trip'>().notNull(),
    deletedAt: integer('deleted_at').notNull(),
    /** What the list shows: entry note / category, or trip time span. */
    label: text('label').notNull().default(''),
    /** Entry: signed amount shown in the list (expense negative). */
    amountMinor: integer('amount_minor'),
    currency: text('currency').$type<'GBP' | 'USD'>(),
    /** Trip: distance shown in the list. */
    distanceM: real('distance_m'),
    /** Entry / trip date (occurred / started) for the list. */
    itemAt: integer('item_at').notNull(),
    /** JSON snapshot of the rows the delete removed (see features/trash). */
    payload: text('payload').notNull(),
    /** JSON array of receipt / photo file names to delete when purged (if no row uses them then). */
    files: text('files').notNull().default('[]'),
  },
  (t) => [index('trash_deleted_idx').on(t.deletedAt)],
);

/** Regular trips (Q31): a trip saved to add again in one tap from Add trip. On the phone, in backups. */
export const savedTrips = sqliteTable('saved_trips', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  /** One-way distance; Round trip doubles it when added. */
  distanceM: real('distance_m').notNull(),
  roundTrip: integer('round_trip', { mode: 'boolean' }).notNull().default(false),
  scope: text('scope').$type<Scope>().notNull().default('work'),
  purpose: text('purpose').notNull().default(''),
  fromLabel: text('from_label'),
  toLabel: text('to_label'),
  fromLat: real('from_lat'),
  fromLng: real('from_lng'),
  toLat: real('to_lat'),
  toLng: real('to_lng'),
  useCount: integer('use_count').notNull().default(0),
  lastUsedAt: integer('last_used_at'),
  createdAt: integer('created_at').notNull(),
});

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
export type TripStopRow = typeof tripStops.$inferSelect;
export type TripSegmentRow = typeof tripSegments.$inferSelect;
export type RuleRow = typeof rules.$inferSelect;
export type RuleOfferRow = typeof ruleOffers.$inferSelect;
export type RecurringRow = typeof recurring.$inferSelect;
export type KnownRouteRow = typeof knownRoutes.$inferSelect;
export type ProStateRow = typeof proState.$inferSelect;
export type PlaceRow = typeof places.$inferSelect;
export type TripGapDismissalRow = typeof tripGapDismissals.$inferSelect;
export type OdometerReadingRow = typeof odometerReadings.$inferSelect;
export type TrashRow = typeof trash.$inferSelect;
export type SavedTripRow = typeof savedTrips.$inferSelect;
