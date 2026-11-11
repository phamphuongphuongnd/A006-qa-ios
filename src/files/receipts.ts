import { Directory, File, Paths } from 'expo-file-system';

/**
 * Receipt photos live in <documents>/receipts/. The DB stores only the file name (relative path),
 * so a backup/restore or app reinstall can rebuild the absolute URI.
 * Owner of capture/edit: features using `saveReceipt`. Backup reads `receiptsDir()` directly.
 */
export const receiptsDir = () => new Directory(Paths.document, 'receipts');

function ensureDir(): Directory {
  const dir = receiptsDir();
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Copies a picked/captured image into the receipts dir; returns the relative name to store in the DB. */
export function saveReceipt(sourceUri: string): string {
  const dir = ensureDir();
  const ext = (sourceUri.split('?')[0].match(/\.(jpe?g|png|heic|webp)$/i)?.[1] ?? 'jpg').toLowerCase();
  const name = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${ext}`;
  new File(sourceUri).copy(new File(dir, name));
  return name;
}

/** Absolute file:// URI for <Image source={{ uri }} />. */
export const receiptUri = (name: string) => new File(receiptsDir(), name).uri;

/** Deletes files by relative name; missing files are ignored. Call with `orphaned` lists from entriesRepo. */
export function deleteReceiptFiles(names: string[]): void {
  for (const n of names) {
    const f = new File(receiptsDir(), n);
    if (f.exists) f.delete();
  }
}
