/**
 * QA-100: 100 simulated drivers. Deterministic (seeded) so every run — Jest, Android, iOS — uses the same people.
 * Each persona = region × device × network × behaviour × data volume. See qa/README.md.
 */
import type { Region } from '@/domain/types';

export type Behaviour =
  | 'quick_capture_only'
  | 'weekly_sorter'
  | 'never_sorts'
  | 'split_merge_heavy'
  | 'gps_trips'
  | 'manual_miles_odometer'
  | 'year_end_export'
  | 'backup_restore_other_phone'
  | 'pro_trial'
  | 'wipe_all'
  | 'region_switch'
  | 'double_tap_save'
  | 'kill_mid_save'
  | 'revoke_permissions'
  | 'low_storage'
  | 'clock_tax_boundary'
  | 'weird_text'
  | 'app_lock'
  | 'recurring_rules'
  | 'large_history';

export const BEHAVIOURS: Behaviour[] = [
  'quick_capture_only',
  'weekly_sorter',
  'never_sorts',
  'split_merge_heavy',
  'gps_trips',
  'manual_miles_odometer',
  'year_end_export',
  'backup_restore_other_phone',
  'pro_trial',
  'wipe_all',
  'region_switch',
  'double_tap_save',
  'kill_mid_save',
  'revoke_permissions',
  'low_storage',
  'clock_tax_boundary',
  'weird_text',
  'app_lock',
  'recurring_rules',
  'large_history',
];

/** Android emulator profiles (qa/run-android.ps1) and iOS simulators (.github/workflows/qa-ios.yml). */
export type AndroidDevice = 'api26_small' | 'api30_mid' | 'api37_phone' | 'api37_320dp' | 'api37_tablet';
export type IosDevice = 'iphone_se' | 'iphone_pro_max' | 'ipad';
export type Network = 'online' | 'slow_3g' | 'edge_delay' | 'drops_midway' | 'airplane';

export interface Persona {
  id: string;
  name: string;
  region: Region;
  behaviour: Behaviour;
  android: AndroidDevice;
  /** ~30 personas also run on an iOS simulator. */
  ios: IosDevice | null;
  network: Network;
  fontScale: 0.85 | 1 | 1.3 | 2;
  dark: boolean;
  timeZone: string;
  /** Entries in the persona's history (trips ≈ entries / 7). */
  entries: number;
  /** PRNG seed for this persona's data. */
  seed: number;
}

const ANDROID: AndroidDevice[] = ['api37_phone', 'api30_mid', 'api26_small', 'api37_320dp', 'api37_tablet'];
const IOS: IosDevice[] = ['iphone_se', 'iphone_pro_max', 'ipad'];
const NETWORKS: Network[] = ['online', 'slow_3g', 'edge_delay', 'drops_midway', 'airplane'];
const FONT: Persona['fontScale'][] = [1, 1.3, 0.85, 2, 1];
const TZ: Record<Region, string[]> = {
  UK: ['Europe/London', 'Europe/London', 'Europe/Dublin', 'Europe/London', 'Europe/Madrid'],
  US: ['America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver', 'Pacific/Honolulu'],
};
const FIRST = ['Dave', 'Priya', 'Tom', 'Aisha', 'Kev', 'Maria', 'Jamal', 'Sue', 'Luis', 'Wei', 'Olu', 'Grace', 'Raj', 'Nina', 'Sam', 'Zoe', 'Ivan', 'Leah', 'Mo', 'Kate'];

function volumeFor(b: Behaviour, variant: number): number {
  if (b === 'large_history') return [20_000, 8_000, 5_000, 12_000, 3_000][variant];
  if (b === 'quick_capture_only' && variant === 0) return 0; // brand-new install
  if (b === 'never_sorts') return 300 + variant * 50;
  if (b === 'year_end_export' || b === 'backup_restore_other_phone') return 2_000;
  return [50, 120, 400, 2_000, 30][variant];
}

/** 20 behaviours × 5 variants; variants rotate region, device, network, text size, theme and time zone. */
export function makePersonas(): Persona[] {
  const out: Persona[] = [];
  BEHAVIOURS.forEach((behaviour, b) => {
    for (let v = 0; v < 5; v++) {
      const n = b * 5 + v;
      const region: Region = (b + v) % 2 === 0 ? 'UK' : 'US';
      out.push({
        id: `P${String(n + 1).padStart(3, '0')}`,
        name: `${FIRST[(n * 7) % FIRST.length]} (${behaviour.replace(/_/g, ' ')})`,
        region,
        behaviour,
        android: ANDROID[(v + b) % ANDROID.length],
        ios: v < 2 && n % 3 !== 2 ? IOS[n % IOS.length] : null,
        network: NETWORKS[(v + b * 2) % NETWORKS.length],
        fontScale: FONT[(v + b) % FONT.length],
        dark: (n % 3) === 1,
        timeZone: TZ[region][v],
        entries: volumeFor(behaviour, v),
        seed: 0x5eed + n * 7919,
      });
    }
  });
  return out;
}

/** Mulberry32 — small, fast, deterministic. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)],
    chance: (p: number) => next() < p,
  };
}
export type Rng = ReturnType<typeof rng>;

/** Notes real drivers type, plus the awkward ones (emoji, RTL, quotes, formula-looking, SQL-looking, very long). */
export const NORMAL_NOTES = ['Shell diesel', 'Amazon flex', 'DPD drop', 'Costa', 'Parking', 'M6 toll', 'Halfords wipers', 'Uber eats', 'Evri', 'Car wash', 'Phone bill', 'Tyres', ''];
export const WEIRD_NOTES = [
  '=HYPERLINK("http://x.example","click")',
  '+44 7700 900123',
  '-5 refund',
  '@SUM(A1:A9)',
  "Robert'); DROP TABLE entries;--",
  '100% off_promo \\ back',
  'Café crème · naïve',
  'مرحبا بالعالم',
  'שלום',
  '🚐⛽️💷 fuel 👍🏽',
  'line1\nline2',
  '"quoted, with comma"',
  '   padded   ',
  `${'x'.repeat(119)}🚐`,
  'a'.repeat(400),
];
