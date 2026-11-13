import { strToU8, zipSync, type Zippable } from 'fflate';

import type { XSheet } from './mtdFiles';

/**
 * write-excel-file's own writers can't run in React Native: they return a `Blob` built from an ArrayBuffer (RN's
 * Blob refuses ArrayBuffer parts) and zip with fflate's async `zip`, which starts a Web Worker for files over
 * 160 KB. So we take its XML generator (the package's CommonJS build, by file path because the package `exports`
 * map hides it) and zip synchronously with fflate, like the receipts ZIP.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const generate: (sheets: XSheet[], options?: object) => Record<string, string | Uint8Array> = require('../../../node_modules/write-excel-file/commonjs/xlsx/generateXlsxFileContents.js').default;

/** .xlsx file bytes for these sheets. */
export function xlsxBytes(sheets: XSheet[]): Uint8Array {
  const files = generate(
    sheets.map((s) => ({ ...s, data: s.data })),
    { fontFamily: 'Calibri', fontSize: 11 },
  );
  const zip: Zippable = {};
  for (const [name, content] of Object.entries(files)) zip[name] = typeof content === 'string' ? strToU8(content) : content;
  return zipSync(zip, { level: 6 });
}
