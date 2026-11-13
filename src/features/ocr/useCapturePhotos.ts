import { useEffect, useRef, useState } from 'react';

import type { Region } from '@/domain/types';

import { mergeReadings } from './fill';
import type { ParsedReceipt } from './parseReceipt';
import { readReceipt, type OcrResult } from './reader';

export interface PendingPhoto {
  uri: string;
  /** Running / finished OCR; null when OCR is off (free) or unavailable. */
  read: Promise<OcrResult | null> | null;
  /** Set once `read` settled. */
  result?: OcrResult | null;
}

/**
 * Photos taken in one Quick capture (≤ 3, Q21) and their receipt readings. Each finished reading is handed to
 * `onReading` (unless the photo was removed or the sheet reset meanwhile) — the screen decides what to fill.
 */
export function useCapturePhotos({ ocrOn, region, onReading }: { ocrOn: boolean; region: Region; onReading: (r: ParsedReceipt) => void }) {
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [inFlight, setInFlight] = useState(0);
  const live = useRef(new Set<string>());
  const latest = useRef({ onReading, photos });
  useEffect(() => {
    latest.current = { onReading, photos };
  });

  const add = (uris: string[]) => {
    const added: PendingPhoto[] = uris.map((uri) => {
      live.current.add(uri);
      if (!ocrOn) return { uri, read: null };
      const read = readReceipt(uri, region);
      setInFlight((n) => n + 1);
      read.then((result) => {
        setInFlight((n) => Math.max(0, n - 1));
        if (!live.current.has(uri)) return;
        setPhotos((ps) => ps.map((p) => (p.uri === uri ? { ...p, result } : p)));
        if (result) latest.current.onReading(result.reading);
      });
      return { uri, read };
    });
    setPhotos((ps) => [...ps, ...added]);
  };

  const remove = (index: number) => {
    const p = photos[index];
    if (p) live.current.delete(p.uri);
    setPhotos((ps) => ps.filter((_, i) => i !== index));
  };

  const reset = () => {
    live.current.clear();
    setPhotos([]);
    setInFlight(0);
  };

  /** ocr_* columns from readings already finished (Save does not wait for the rest; they attach after). */
  const finishedFields = () => mergeReadings(latest.current.photos.map((p) => p.result?.reading ?? null));

  return { photos, uris: photos.map((p) => p.uri), reading: inFlight > 0, add, remove, reset, finishedFields };
}
