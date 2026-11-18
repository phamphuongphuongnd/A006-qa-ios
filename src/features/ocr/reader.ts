import { File, Paths } from 'expo-file-system';

import { ReceiptOcr } from '../../../modules/receipt-ocr';

import type { AppDb } from '@/db/types';
import type { Region } from '@/domain/types';

import { mergeReadings } from './fill';
import { EMPTY_READING, parseReceipt, type ParsedReceipt, type RawOcr } from './parseReceipt';
import { fillEntryOcr, setReceiptOcrText } from './repo';

/** Past this the chip is gone anyway; a reading that never comes back must not hold anything. */
const OCR_TIMEOUT_MS = 10_000;

export interface OcrResult {
  reading: ParsedReceipt;
  /** Full recognised text (Receipt.ocr_text). */
  text: string;
}

/**
 * Dev builds only: lets the A13 test read receipts without starting the one-time Pro trial on real data
 * (toggled from /dev/ocr). Always false in release.
 */
export const ocrDev = { forceOn: false };

export const ocrAvailable = () => !!ReceiptOcr && ReceiptOcr.isAvailable();

/**
 * QA-100 A13-4: real receipts read on a phone gave no amount and a release build keeps no trace of why. The last 3
 * readings (raw lines with their boxes + what the parser made of them) stay in the cache folder, on the phone only, and
 * go into "Share trip diagnostics" — which the driver sends only if they choose to.
 */
const lastFile = () => new File(Paths.cache, 'ocr-last-readings.json');
function rememberLastReading(raw: RawOcr, reading: ParsedReceipt, at: number) {
  try {
    const f = lastFile();
    const prev: unknown[] = f.exists ? (JSON.parse(f.textSync()) as unknown[]) : [];
    const next = [{ at: new Date(at).toISOString(), lines: raw.lines, parsed: reading }, ...prev].slice(0, 3);
    f.create({ overwrite: true });
    f.write(JSON.stringify(next));
  } catch {
    // diagnostics only
  }
}

export function lastReceiptReadings(): unknown[] {
  try {
    const f = lastFile();
    return f.exists ? (JSON.parse(f.textSync()) as unknown[]) : [];
  } catch {
    return [];
  }
}

/**
 * Reads one photo on the device. Never throws: no module (Jest, Expo Go), model still downloading (Play services
 * fetches it on first use in debug builds), unreadable image or timeout → null, and the screen stays silent.
 */
export async function readReceipt(uri: string, region: Region, now = Date.now()): Promise<OcrResult | null> {
  if (!ReceiptOcr) return null;
  try {
    const raw = await Promise.race([
      ReceiptOcr.recognize(uri),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), OCR_TIMEOUT_MS)),
    ]);
    if (!raw) return null;
    const reading = parseReceipt(raw, region, now);
    rememberLastReading(raw, reading, now);
    return { reading, text: raw.text ?? '' };
  } catch (e) {
    if (__DEV__) console.log('[ocr] recognize failed', String(e));
    return null;
  }
}

/** A photo waiting to be saved and its reading (already done or still running). */
export interface PendingRead {
  /** Relative name in the receipts dir once saved. */
  filePath: string;
  read: Promise<OcrResult | null> | null;
}

/**
 * After Save: writes each photo's text and fills the entry's empty ocr_* columns from readings that finished late.
 * Runs detached — the capture sheet may already be gone.
 */
export async function attachReadings(
  db: AppDb,
  entryId: string,
  items: PendingRead[],
  /** Re-run rules once a late merchant / amount landed (rulesHook.afterSave). */
  onFilled?: (db: AppDb, entryId: string) => unknown,
): Promise<void> {
  const results = await Promise.all(items.map((it) => (it.read ?? Promise.resolve(null)).catch(() => null)));
  try {
    results.forEach((r, i) => {
      if (r?.text) setReceiptOcrText(db, entryId, items[i].filePath, r.text);
    });
    if (fillEntryOcr(db, entryId, mergeReadings(results.map((r) => r?.reading ?? null)))) onFilled?.(db, entryId);
  } catch {
    // Entry deleted (Undo) before the reading finished: nothing to attach to.
  }
}

export { EMPTY_READING };
