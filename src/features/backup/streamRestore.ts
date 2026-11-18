import { strFromU8, Unzip, UnzipInflate, UnzipPassThrough } from 'fflate';

import { isSafePhotoName, MANIFEST_NAME, PHOTO_DIR, validateManifest, type BackupError, type BackupManifest } from './pack';

/**
 * QA-100 SPE-5 / B-87: restoring read the whole backup file and every photo into memory (hundreds of MB for a driver
 * with years of receipts → a low-RAM phone killed the app). This reads the ZIP in chunks: photos go straight to a
 * sink (files in a staging folder), only backup.json is kept in memory. Pure — the file I/O is passed in.
 */

/** Next chunk of the backup file, or null at the end. */
export interface ChunkSource {
  next(): Promise<Uint8Array | null>;
}

/** Where photo bytes go while they are unpacked. */
export interface PhotoSink {
  open(name: string): { write(chunk: Uint8Array): void; close(): void };
}

export type StreamResult = { ok: true; manifest: BackupManifest; photos: number } | { ok: false; error: BackupError };

export const STREAM_MAX_MANIFEST_BYTES = 64 * 1024 * 1024;
export const STREAM_MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const FEED = 64 * 1024;

/** Reads a backup ZIP. With `sink` null only the manifest is read (restore preview); photos are skipped. */
export async function readBackupStream(src: ChunkSource, sink: PhotoSink | null): Promise<StreamResult> {
  const manifestParts: Uint8Array[] = [];
  let manifestBytes = 0;
  let sawManifest = false;
  let photos = 0;
  let failed: BackupError | null = null;
  const fail = (e: BackupError) => {
    failed = failed ?? e;
  };

  const unzip = new Unzip((f) => {
    if (failed) return;
    // QA-100 REG-1: a size declared in the ZIP header that is already too big is refused before inflating anything.
    const limit = f.name === MANIFEST_NAME ? STREAM_MAX_MANIFEST_BYTES : STREAM_MAX_PHOTO_BYTES;
    if (f.originalSize !== undefined && f.originalSize > limit) return fail('damaged');
    if (f.name === MANIFEST_NAME) {
      sawManifest = true;
      f.ondata = (err, data) => {
        if (failed) return;
        if (err) return fail('damaged');
        manifestBytes += data.length;
        if (manifestBytes > STREAM_MAX_MANIFEST_BYTES) {
          f.terminate();
          return fail('damaged');
        }
        manifestParts.push(data);
      };
      f.start();
      return;
    }
    if (!sink || !f.name.startsWith(PHOTO_DIR)) return; // not started → skipped without holding it
    const name = f.name.slice(PHOTO_DIR.length);
    if (!isSafePhotoName(name)) return fail('damaged');
    const out = sink.open(name);
    photos++;
    let size = 0;
    let open = true;
    const close = () => {
      if (open) {
        open = false;
        out.close();
      }
    };
    f.ondata = (err, data, final) => {
      if (failed) return close();
      if (err) {
        close();
        return fail('damaged');
      }
      size += data.length;
      if (size > STREAM_MAX_PHOTO_BYTES) {
        f.terminate();
        close();
        return fail('damaged');
      }
      if (data.length) out.write(data);
      if (final) close();
    };
    f.start();
  });
  unzip.register(UnzipInflate);
  unzip.register(UnzipPassThrough);

  let first = true;
  try {
    for (;;) {
      const chunk = await src.next();
      if (chunk === null) break;
      if (first) {
        first = false;
        if (chunk.length < 2 || chunk[0] !== 0x50 || chunk[1] !== 0x4b) return { ok: false, error: 'not_backup' };
      }
      // Fed in 64 KB slices: deflate expands at most ~1000×, so one slice can't balloon past the limits before we stop.
      for (let i = 0; i < chunk.length && !failed; i += FEED) unzip.push(chunk.subarray(i, i + FEED), false);
      if (failed) break;
    }
    if (first) return { ok: false, error: 'not_backup' };
    if (!failed) unzip.push(new Uint8Array(0), true);
  } catch {
    fail('damaged');
  }
  if (failed) return { ok: false, error: failed };
  if (!sawManifest) return { ok: false, error: 'not_backup' };

  const raw = new Uint8Array(manifestBytes);
  let off = 0;
  for (const p of manifestParts) {
    raw.set(p, off);
    off += p.length;
  }
  let json: unknown;
  try {
    json = JSON.parse(strFromU8(raw));
  } catch {
    return { ok: false, error: 'damaged' };
  }
  const checked = validateManifest(json);
  if (!checked.ok) return checked;
  if (sink && photos !== checked.manifest.counts.photos) return { ok: false, error: 'damaged' };
  return { ok: true, manifest: checked.manifest, photos };
}

/** Chunks of an in-memory file (tests). */
export function bytesSource(bytes: Uint8Array, size = 64 * 1024): ChunkSource {
  let at = 0;
  return {
    next: async () => {
      if (at >= bytes.length) return null;
      const c = bytes.subarray(at, at + size);
      at += size;
      return c;
    },
  };
}
