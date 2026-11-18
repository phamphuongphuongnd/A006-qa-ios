import { strFromU8, strToU8, unzipSync, Zip, ZipDeflate, ZipPassThrough } from 'fflate';

import type {
  CategoryRow,
  EntryRow,
  KnownRouteRow,
  OdometerReadingRow,
  PlaceRow,
  ProStateRow,
  ReceiptRow,
  RecurringRow,
  SavedTripRow,
  RuleOfferRow,
  RuleRow,
  TripGapDismissalRow,
  TripPointRow,
  TripRow,
  TripSegmentRow,
  TripStopRow,
} from '@/db/schema';
import { MAX_MINOR } from '@/domain/money';

/** 10 billion in pounds/dollars — far above anything real, far below where sums lose precision. */
const MAX_RESTORED_MINOR = 1_000 * MAX_MINOR * 10;

/**
 * Backup file = a ZIP with the extension `.sundaysort`:
 *   backup.json      — format, version, counts and every table as JSON
 *   receipts/<name>  — receipt photos, stored as-is (JPEGs are already compressed)
 * Pure functions (no file system, no DB) so the round trip is unit-tested.
 */
export const BACKUP_FORMAT = 'sundaysort-backup';
/**
 * Bump when the backup layout or the DB schema changes in a way older apps can't read.
 * 2 (bản 2): + trip stops / segments, rules, rule offers, recurring, known routes, Pro state; new columns.
 * Version-1 files still restore: the new tables come back empty and new columns take their defaults.
 */
export const BACKUP_VERSION = 2;
export const BACKUP_EXT = 'sundaysort';
export const MANIFEST_NAME = 'backup.json';
export const PHOTO_DIR = 'receipts/';

export interface BackupTables {
  categories: CategoryRow[];
  entries: EntryRow[];
  receipts: ReceiptRow[];
  trips: TripRow[];
  tripPoints: TripPointRow[];
  settings: { key: string; value: string }[];
  // Bản 2 (absent from version-1 files → read as []).
  tripStops: TripStopRow[];
  tripSegments: TripSegmentRow[];
  rules: RuleRow[];
  ruleOffers: RuleOfferRow[];
  recurring: RecurringRow[];
  knownRoutes: KnownRouteRow[];
  proState: ProStateRow[];
  /** Q25 A → B frequent places (absent from older files → []). */
  places: PlaceRow[];
  /** Q26 "Not a trip" answers + Q27 odometer readings (absent from older files → []). */
  tripGapDismissals: TripGapDismissalRow[];
  odometerReadings: OdometerReadingRow[];
  /** Q31 regular trips (absent from older files → []). Recently deleted (Q30) is never backed up. */
  savedTrips: SavedTripRow[];
}

/** Tables a version-1 backup does not have. */
export const V2_TABLES = [
  'tripStops',
  'tripSegments',
  'rules',
  'ruleOffers',
  'recurring',
  'knownRoutes',
  'proState',
  'places',
  'tripGapDismissals',
  'odometerReadings',
  'savedTrips',
] as const;

export interface BackupCounts {
  entries: number;
  trips: number;
  photos: number;
  categories: number;
}

export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: number;
  appVersion: string;
  counts: BackupCounts;
  tables: BackupTables;
}

export type BackupError = 'not_backup' | 'damaged' | 'newer';

export interface PhotoSource {
  name: string;
  /** Returns the bytes, or null when the file is gone (it is then left out). */
  read: () => Uint8Array | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `SundaySort-backup-2026-11-10.sundaysort` (local date). */
export function backupFileName(at: number): string {
  const d = new Date(at);
  return `SundaySort-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.${BACKUP_EXT}`;
}

/** Receipt names are plain file names we generated; anything with a path or odd characters is rejected. */
export const isSafePhotoName = (name: string) => /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(name) && !name.includes('..');

/**
 * Streams the backup ZIP into `onChunk`. Photos go first so the manifest can record how many were really packed.
 * `pause` is awaited between photos so the UI can repaint the progress bar.
 */
export async function packBackup(
  tables: BackupTables,
  photos: PhotoSource[],
  opts: {
    createdAt: number;
    appVersion: string;
    onChunk: (chunk: Uint8Array) => void;
    onProgress?: (done: number, total: number) => void;
    pause?: () => Promise<void>;
    isCancelled?: () => boolean;
  },
): Promise<{ counts: BackupCounts; cancelled: boolean }> {
  let failure: Error | null = null;
  const zip = new Zip((err, chunk) => {
    if (err) failure = err;
    else if (chunk.length) opts.onChunk(chunk);
  });
  const check = () => {
    if (failure) throw failure;
  };

  const seen = new Set<string>();
  let packed = 0;
  const total = photos.length;
  for (let i = 0; i < photos.length; i++) {
    if (opts.isCancelled?.()) {
      zip.terminate();
      return { counts: countsOf(tables, packed), cancelled: true };
    }
    const p = photos[i];
    if (!seen.has(p.name) && isSafePhotoName(p.name)) {
      seen.add(p.name);
      const bytes = p.read();
      if (bytes) {
        const f = new ZipPassThrough(PHOTO_DIR + p.name);
        zip.add(f);
        f.push(bytes, true);
        packed++;
        check();
      }
    }
    opts.onProgress?.(i + 1, total);
    if (opts.pause) await opts.pause();
  }

  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: opts.createdAt,
    appVersion: opts.appVersion,
    counts: countsOf(tables, packed),
    tables,
  };
  const m = new ZipDeflate(MANIFEST_NAME, { level: 6 });
  zip.add(m);
  m.push(strToU8(JSON.stringify(manifest)), true);
  zip.end();
  check();
  return { counts: manifest.counts, cancelled: false };
}

function countsOf(t: BackupTables, photos: number): BackupCounts {
  return { entries: t.entries.length, trips: t.trips.length, photos, categories: t.categories.length };
}

const MAX_MANIFEST_BYTES = 64 * 1024 * 1024;
const MAX_PHOTO_BYTES = 25 * 1024 * 1024;

const isZip = (b: Uint8Array) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b;

export type InspectResult = { ok: true; manifest: BackupManifest } | { ok: false; error: BackupError };
export type UnpackResult =
  | { ok: true; manifest: BackupManifest; photos: Map<string, Uint8Array> }
  | { ok: false; error: BackupError };

/** Reads only backup.json — cheap enough for the restore preview. */
export function inspectBackup(bytes: Uint8Array): InspectResult {
  return readZip(bytes, false) as InspectResult;
}

/** Reads everything; photos are keyed by file name. */
export function unpackBackup(bytes: Uint8Array): UnpackResult {
  return readZip(bytes, true) as UnpackResult;
}

function readZip(bytes: Uint8Array, withPhotos: boolean): UnpackResult {
  if (!isZip(bytes)) return { ok: false, error: 'not_backup' };
  let files: Record<string, Uint8Array>;
  try {
    // QA-100 SPE-5: a 200 KB file that inflates to 200 MB pushed the app past 1 GB of RAM. Our manifest for 20,000
    // entries is ~10 MB and receipt photos are a few MB — anything far larger is not a backup we made.
    let tooBig = false;
    files = unzipSync(bytes, {
      filter: (f) => {
        const wanted = f.name === MANIFEST_NAME || (withPhotos && f.name.startsWith(PHOTO_DIR));
        if (wanted && f.originalSize > (f.name === MANIFEST_NAME ? MAX_MANIFEST_BYTES : MAX_PHOTO_BYTES)) tooBig = true;
        return wanted && !tooBig;
      },
    });
    if (tooBig) return { ok: false, error: 'damaged' };
  } catch {
    return { ok: false, error: 'damaged' };
  }
  const raw = files[MANIFEST_NAME];
  // A readable ZIP without our manifest is some other archive.
  if (!raw) return { ok: false, error: 'not_backup' };
  let json: unknown;
  try {
    json = JSON.parse(strFromU8(raw));
  } catch {
    return { ok: false, error: 'damaged' };
  }
  const checked = validateManifest(json);
  if (!checked.ok) return checked;
  const photos = new Map<string, Uint8Array>();
  if (withPhotos) {
    for (const [path, data] of Object.entries(files)) {
      if (!path.startsWith(PHOTO_DIR)) continue;
      const name = path.slice(PHOTO_DIR.length);
      if (!isSafePhotoName(name)) return { ok: false, error: 'damaged' };
      photos.set(name, data);
    }
    if (photos.size !== checked.manifest.counts.photos) return { ok: false, error: 'damaged' };
  }
  return { ok: true, manifest: checked.manifest, photos };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown) => typeof v === 'string';
const isInt = (v: unknown) => Number.isInteger(v);
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

const ROW_CHECKS: Record<keyof BackupTables, (r: Record<string, unknown>) => boolean> = {
  categories: (r) => isStr(r.id) && (r.type === 'income' || r.type === 'expense') && isStr(r.name) && isInt(r.sortOrder),
  entries: (r) =>
    isStr(r.id) &&
    (r.type === 'income' || r.type === 'expense') &&
    isInt(r.amountMinor) &&
    (r.amountMinor as number) > 0 &&
    // SPE-4: refuse absurd amounts (1e15, 2^53+2 lose precision in totals). Not MAX_MINOR: a region change converts
    // 999,999.99 at the exchange rate (QA-100 persona P054 caught that), so real data can be a little above it.
    (r.amountMinor as number) <= MAX_RESTORED_MINOR &&
    isInt(r.occurredAt) &&
    (r.scope === 'work' || r.scope === 'personal') &&
    (r.categoryId === null || isStr(r.categoryId)),
  receipts: (r) => isStr(r.id) && isStr(r.entryId) && isStr(r.filePath) && isSafePhotoName(r.filePath as string),
  trips: (r) =>
    isStr(r.id) && isNum(r.distanceM) && isInt(r.startedAt) && (r.scope === 'work' || r.scope === 'personal' || r.scope === 'unsorted'),
  tripPoints: (r) => isStr(r.tripId) && isNum(r.lat) && isNum(r.lng) && isInt(r.ts),
  settings: (r) => isStr(r.key) && isStr(r.value),
  tripStops: (r) => isStr(r.id) && isStr(r.tripId) && isInt(r.startedAt) && isInt(r.endedAt) && isNum(r.lat) && isNum(r.lng),
  tripSegments: (r) => isStr(r.id) && isStr(r.tripId) && isInt(r.fromTs) && isInt(r.toTs) && isNum(r.distanceM),
  rules: (r) => isStr(r.id) && isStr(r.matchText) && (r.type === 'income' || r.type === 'expense'),
  ruleOffers: (r) => isStr(r.merchantKey) && isInt(r.declinedUntil),
  recurring: (r) => isStr(r.id) && isInt(r.amountMinor) && isStr(r.freq) && isInt(r.day) && isStr(r.nextOn),
  knownRoutes: (r) => isStr(r.id) && isNum(r.startLat) && isNum(r.startLng) && isNum(r.endLat) && isNum(r.endLng),
  proState: (r) => isStr(r.id),
  places: (r) => isStr(r.id) && isStr(r.label) && isNum(r.lat) && isNum(r.lng),
  tripGapDismissals: (r) => isStr(r.prevTripId) && isStr(r.nextTripId),
  odometerReadings: (r) =>
    isStr(r.id) && isInt(r.readAt) && isNum(r.value) && (r.photoPath === null || r.photoPath === undefined || (isStr(r.photoPath) && isSafePhotoName(r.photoPath as string))),
  savedTrips: (r) => isStr(r.id) && isStr(r.label) && isNum(r.distanceM),
};

/** Format → version → shape. Order matters: an unknown file is "not a backup", a future one is "newer". */
export function validateManifest(json: unknown): { ok: true; manifest: BackupManifest } | { ok: false; error: BackupError } {
  if (!isObj(json) || json.format !== BACKUP_FORMAT) return { ok: false, error: 'not_backup' };
  if (!isInt(json.version)) return { ok: false, error: 'damaged' };
  if ((json.version as number) > BACKUP_VERSION) return { ok: false, error: 'newer' };
  const tables = json.tables;
  const counts = json.counts;
  if (!isObj(tables) || !isObj(counts) || !isInt(json.createdAt)) return { ok: false, error: 'damaged' };
  for (const key of V2_TABLES) if (tables[key] === undefined) tables[key] = [];
  for (const key of Object.keys(ROW_CHECKS) as (keyof BackupTables)[]) {
    const rows = tables[key];
    if (!Array.isArray(rows)) return { ok: false, error: 'damaged' };
    if (!rows.every((r) => isObj(r) && ROW_CHECKS[key](r))) return { ok: false, error: 'damaged' };
  }
  const t = tables as unknown as BackupTables;
  if (counts.entries !== t.entries.length || counts.trips !== t.trips.length || !isInt(counts.photos)) {
    return { ok: false, error: 'damaged' };
  }
  // Every receipt row must point at an entry in the backup.
  const entryIds = new Set(t.entries.map((e) => e.id));
  if (!t.receipts.every((r) => entryIds.has(r.entryId))) return { ok: false, error: 'damaged' };
  return { ok: true, manifest: json as unknown as BackupManifest };
}
