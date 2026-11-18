import { requireOptionalNativeModule } from 'expo';

/** Box normalised to the image (0..1, top-left origin). */
export interface OcrBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OcrLine {
  text: string;
  /** 0..1; Android may report 0 when the model gives none. */
  confidence: number;
  box: OcrBox | null;
}

export interface OcrRaw {
  text: string;
  lines: OcrLine[];
  width: number;
  height: number;
}

interface ReceiptOcrNative {
  isAvailable(): boolean;
  /** `uri`: file:// (app receipts dir) or content:// on Android. */
  recognize(uri: string): Promise<OcrRaw>;
  /** Android only: small upright JPEG copy (long side ≤ maxSide) in the cache; returns its file:// uri. */
  shrink?(uri: string, maxSide: number, quality: number): Promise<string>;
}

/** null in Jest / Expo Go / web: OCR silently does nothing (P1-12: "không đọc được thì im lặng"). */
export const ReceiptOcr = requireOptionalNativeModule<ReceiptOcrNative>('SundayReceiptOcr');
