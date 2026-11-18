import { FREE_PHOTOS_PER_MONTH } from '@/domain/pro';
import { readingToEntryFields } from '@/domain/receiptSignal';
import type { Minor } from '@/domain/types';

import type { ParsedReceipt } from './parseReceipt';

/**
 * What a finished receipt reading does to Quick capture (P1-12), as pure rules:
 * - amount still 0 → fill it; a different typed amount → chip "Receipt says £… · Use"; same amount → nothing;
 * - note empty → merchant; date chip untouched ("Now") → receipt date (+ printed time);
 * - fields under OCR_FILL_CONFIDENCE never fill anything ("không đọc được thì im lặng").
 */

export interface CaptureFields {
  amountMinor: Minor;
  note: string;
  /** null = "Now" (the driver has not picked a date). */
  at: number | null;
  /**
   * QA-100 (A13, two photos: Tesco + FreshHarvest): note / date that came from a photo whose total couldn't be read and
   * that the driver hasn't touched. The photo that does give the total replaces them, so all three come from one receipt.
   */
  weak?: { note: boolean; at: boolean };
}

export interface FillPlan {
  amountMinor?: Minor;
  note?: string;
  at?: number;
  /** Show "Receipt says {amount} · Use". */
  chipMinor?: Minor;
}

/** No printed time: put an older receipt at midday so it sits in the right day whatever the time zone quirks. */
const NOON_MIN = 12 * 60;

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

/** Date/time for the entry from a receipt date, or null when "Now" is already right (or the result would be future). */
export function receiptAt(date: number, minutes: number | null, now: number): number | null {
  if (sameDay(date, now)) {
    if (minutes === null) return null;
    const at = date + minutes * 60_000;
    // Within a quarter hour of now: leave "Now" alone.
    return at <= now && now - at > 15 * 60_000 ? at : null;
  }
  const at = date + (minutes ?? NOON_MIN) * 60_000;
  // A receipt "from the future" (wrong clock, misread year) never moves the entry. Old receipts do (no age limit, Phương 18/11).
  return at <= now ? at : null;
}

export function planFill(form: CaptureFields, r: ParsedReceipt, now: number): FillPlan {
  const f = readingToEntryFields(r);
  const plan: FillPlan = {};
  if (f.ocrAmountMinor !== null) {
    if (form.amountMinor === 0) plan.amountMinor = f.ocrAmountMinor;
    else if (form.amountMinor !== f.ocrAmountMinor) plan.chipMinor = f.ocrAmountMinor;
  }
  // This photo just gave the total: its shop and date win over ones taken from a photo without a total.
  const anchor = plan.amountMinor !== undefined;
  if (f.ocrMerchant && (form.note.trim() === '' || (anchor && form.weak?.note))) plan.note = f.ocrMerchant.slice(0, 120);
  if (f.ocrDate !== null && (form.at === null || (anchor && form.weak?.at))) {
    const at = receiptAt(f.ocrDate, r.confidence.date >= 0.6 ? r.minutes : null, now);
    if (at !== null) plan.at = at;
  }
  return plan;
}

export const planIsEmpty = (p: FillPlan) =>
  p.amountMinor === undefined && p.note === undefined && p.at === undefined && p.chipMinor === undefined;

/** The reading confidently gave a total. */
export const readingHasAmount = (r: ParsedReceipt) => readingToEntryFields(r).ocrAmountMinor !== null;

/**
 * One reading for an entry with several photos: each field from the first photo that read it confidently (photo
 * order = the order the driver took them), except that the first photo with a readable total goes first — shop, date
 * and amount then come from the same receipt. Returns the columns saved on the entry (receiptSignal contract).
 */
export function mergeReadings(readings: (ParsedReceipt | null)[]) {
  const out: ReturnType<typeof readingToEntryFields> = { ocrAmountMinor: null, ocrMerchant: null, ocrDate: null };
  const anchor = readings.find((r): r is ParsedReceipt => !!r && readingHasAmount(r));
  for (const r of anchor ? [anchor, ...readings.filter((x) => x !== anchor)] : readings) {
    if (!r) continue;
    const f = readingToEntryFields(r);
    out.ocrAmountMinor ??= f.ocrAmountMinor;
    out.ocrMerchant ??= f.ocrMerchant;
    out.ocrDate ??= f.ocrDate;
  }
  return out;
}

export const hasAnyField = (f: ReturnType<typeof mergeReadings>) => f.ocrAmountMinor !== null || f.ocrMerchant !== null || f.ocrDate !== null;

// ---------------------------------------------------------------- photos (P1-4, Q21)

/** Photos one capture can attach (Q21). */
export const MAX_PHOTOS_PER_ENTRY = 3;

export interface PhotoSlots {
  /** How many more photos may be added now (0 = button locked or full). */
  canAdd: number;
  /** Free allowance used up (counting photos waiting in this capture): the button shows a lock → sheet. */
  locked: boolean;
  /** "{left} of 20 free photos left this month" after the pending ones; null with Pro. */
  left: number | null;
  /** Orange counter at 3 or fewer. */
  low: boolean;
}

/**
 * `allowanceLeft`: from usePhotoAllowance (null = Pro). `pending`: photos taken in this capture, not saved yet —
 * they count against the allowance already so a third photo can't overshoot it.
 */
export function photoSlots(allowanceLeft: number | null, pending: number, perEntry = MAX_PHOTOS_PER_ENTRY): PhotoSlots {
  const room = Math.max(0, perEntry - pending);
  if (allowanceLeft === null) return { canAdd: room, locked: false, left: null, low: false };
  const left = Math.max(0, allowanceLeft - pending);
  return { canAdd: Math.min(room, left), locked: left === 0, left, low: left <= 3 };
}

/** "Photos reset on 1 Dec": first day of next month. */
export function allowanceResetsOn(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
}

export { FREE_PHOTOS_PER_MONTH };
