// OpenFreeMap styles (Q25): free, no key, OpenStreetMap data. Only map tiles for the area on screen are downloaded —
// the recorded route is drawn on the phone and never sent.
export const STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/liberty';
export const STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

export const mapStyleUrl = (dark: boolean) => (dark ? STYLE_DARK : STYLE_LIGHT);

/** Pin colours that read on both map styles (start green, end red — like Apple Maps). */
export const PIN = { start: '#1E8E5A', end: '#D92D20', ring: '#FFFFFF' } as const;

const cache = new Map<string, Promise<Record<string, unknown>>>();

/** Style JSON (fetched once per app run) — thumbnails add their own route source + layers to a copy. */
export function loadStyleJson(dark: boolean, fetchFn: typeof fetch = fetch): Promise<Record<string, unknown>> {
  const url = mapStyleUrl(dark);
  let p = cache.get(url);
  if (!p) {
    p = fetchFn(url).then((r) => {
      if (!r.ok) throw new Error(`style ${r.status}`);
      return r.json() as Promise<Record<string, unknown>>;
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}
