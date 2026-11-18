import { File, Paths } from 'expo-file-system';

let cached: string | null = null;

/**
 * A short random id for this install, in nightly backup names (SPE-9). Kept in its own file, not the DB, so restoring
 * another phone's backup doesn't hand this phone the other one's tag.
 */
export function deviceTag(): string {
  if (cached) return cached;
  const f = new File(Paths.document, 'device-tag.txt');
  try {
    if (f.exists) {
      const t = f.textSync().trim();
      if (/^[a-z0-9]{4,8}$/.test(t)) return (cached = t);
    }
  } catch {}
  const t = Array.from({ length: 6 }, () => 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 32)]).join('');
  try {
    f.create({ overwrite: true });
    f.write(t);
  } catch {}
  return (cached = t);
}
