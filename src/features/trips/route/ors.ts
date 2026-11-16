// openrouteservice (Q25): address search + suggestions, "Current location" label, driving distance for A → B trips.
// Free plan, key from `.env` (EXPO_PUBLIC_ORS_KEY, made by Phương — never committed). Only what the driver types or
// picks is sent (plus the phone's position when they tap "Current location"); recorded GPS tracks never leave the phone.
import type { Region } from '@/domain/types';

const BASE = 'https://api.openrouteservice.org';
const TIMEOUT_MS = 10_000;

/** Why a call failed. `offline` / `quota` / `failed` → "No internet — enter miles instead" (switch to Distance). */
export type OrsErrorKind = 'no_key' | 'offline' | 'quota' | 'no_route' | 'failed';

export class OrsError extends Error {
  constructor(public kind: OrsErrorKind) {
    super(`openrouteservice: ${kind}`);
  }
}

export interface PlaceHit {
  /** Short name ("Tesco Express", "24-26 Great George Street"). */
  label: string;
  /** Second line ("Water Lane, LS11 5QS, Leeds"). */
  detail: string;
  lat: number;
  lng: number;
}

/** Driving route, one way. `line` = [lng, lat] pairs for the map preview. */
export interface DrivingRoute {
  meters: number;
  line: [number, number][];
}

type Fetch = typeof fetch;
interface Opts {
  fetchFn?: Fetch;
  /** Overrides the build-time key (tests). */
  key?: string | null;
  signal?: AbortSignal;
}

/** Written out in full so Expo inlines it at build time. */
export const orsKey = (): string | null => process.env.EXPO_PUBLIC_ORS_KEY?.trim() || null;
/** A → B is offered only when the build has a key. */
export const hasRouteService = () => orsKey() !== null;

const COUNTRY: Record<Region, string> = { UK: 'GB', US: 'US' };

async function call(path: string, init: RequestInit, opts: Opts): Promise<unknown> {
  const key = opts.key !== undefined ? opts.key : orsKey();
  if (!key) throw new OrsError('no_key');
  const f = opts.fetchFn ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  opts.signal?.addEventListener('abort', onAbort);
  let res: Response;
  try {
    res = await f(`${BASE}${path}`, {
      ...init,
      headers: { Authorization: key, Accept: 'application/json, application/geo+json', ...(init.headers ?? {}) },
      signal: ctrl.signal,
    });
  } catch {
    // Network down, DNS, timeout — or the caller cancelled (a newer keystroke); either way nothing to show.
    throw new OrsError('offline');
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (res.ok) return body;
  throw new OrsError(errorKind(res.status, body));
}

/** HTTP status + ORS error body → kind. 2004 too far, 2009 / 2010 no road near a point → no route. */
export function errorKind(status: number, body: unknown): OrsErrorKind {
  if (status === 429) return 'quota';
  // 401/403: key missing, wrong or disabled by ORS — the driver can't fix it; treat like quota.
  if (status === 401 || status === 403) return 'quota';
  const code = (body as { error?: { code?: number } } | null)?.error?.code;
  if (status === 404 || code === 2004 || code === 2009 || code === 2010) return 'no_route';
  return 'failed';
}

interface GeoFeature {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: Record<string, unknown>;
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Pelias feature → PlaceHit (null when it has no point). */
export function toPlaceHit(f: GeoFeature): PlaceHit | null {
  const c = f.geometry?.coordinates;
  if (!Array.isArray(c) || typeof c[0] !== 'number' || typeof c[1] !== 'number') return null;
  const p = f.properties ?? {};
  const street = [str(p.housenumber), str(p.street)].filter(Boolean).join(' ') || null;
  const label = str(p.name) ?? street ?? str(p.label)?.split(',')[0] ?? null;
  if (!label) return null;
  const parts = [street, str(p.postalcode), str(p.locality) ?? str(p.county)].filter((x): x is string => !!x && x !== label);
  return { label, detail: [...new Set(parts)].join(', '), lat: c[1], lng: c[0] };
}

export function parsePlaces(body: unknown): PlaceHit[] {
  const feats = (body as { features?: GeoFeature[] } | null)?.features;
  if (!Array.isArray(feats)) return [];
  const out: PlaceHit[] = [];
  for (const f of feats) {
    const h = toPlaceHit(f);
    if (h && !out.some((o) => o.label === h.label && o.detail === h.detail)) out.push(h);
  }
  return out;
}

export function parseRoute(body: unknown): DrivingRoute {
  const f = (body as { features?: GeoFeature[] } | null)?.features?.[0];
  const meters = (f?.properties?.summary as { distance?: unknown } | undefined)?.distance;
  if (typeof meters !== 'number' || !(meters >= 0)) throw new OrsError('failed');
  const coords = f?.geometry?.coordinates;
  const line = Array.isArray(coords)
    ? coords.filter((p): p is [number, number] => Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number').map((p) => [p[0], p[1]] as [number, number])
    : [];
  return { meters, line };
}

/** Texts shorter than this are not searched (S-08: suggestions from 3 characters). */
export const MIN_QUERY = 3;

/** Suggestions while typing; near the driver's last position when known. */
export async function suggestPlaces(
  text: string,
  region: Region,
  near: { lat: number; lng: number } | null,
  opts: Opts = {},
): Promise<PlaceHit[]> {
  const q = text.trim();
  if (q.length < MIN_QUERY) return [];
  const params = new URLSearchParams({ text: q, 'boundary.country': COUNTRY[region], size: '6' });
  if (near) {
    params.set('focus.point.lat', near.lat.toFixed(4));
    params.set('focus.point.lon', near.lng.toFixed(4));
  }
  return parsePlaces(await call(`/geocode/autocomplete?${params}`, { method: 'GET' }, opts));
}

/** Label for "Current location" (nearest address / venue), or null. */
export async function reversePlace(at: { lat: number; lng: number }, opts: Opts = {}): Promise<PlaceHit | null> {
  const params = new URLSearchParams({ 'point.lat': at.lat.toFixed(6), 'point.lon': at.lng.toFixed(6), size: '1' });
  const hit = parsePlaces(await call(`/geocode/reverse?${params}`, { method: 'GET' }, opts))[0];
  // Keep the phone's own position (more exact than the address point).
  return hit ? { ...hit, lat: at.lat, lng: at.lng } : null;
}

/** Driving distance A → B (one way). */
export async function drivingRoute(a: { lat: number; lng: number }, b: { lat: number; lng: number }, opts: Opts = {}): Promise<DrivingRoute> {
  const body = await call(
    '/v2/directions/driving-car/geojson',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: [[a.lng, a.lat], [b.lng, b.lat]], instructions: false }),
    },
    opts,
  );
  return parseRoute(body);
}
