/**
 * TEMPORARY tokens from product.md §3. Replace with the token file exported from the Claude Design mockup
 * (apps/A006-sundaysort/design/) — keep the same names so screens don't change.
 */
export const palette = {
  light: {
    background: '#FAF8F4',
    surface: '#FFFFFF',
    surfaceAlt: '#F1EDE6',
    text: '#1A1D24',
    textMuted: '#5B6170',
    border: '#E2DDD3',
    primary: '#1F2A44',
    onPrimary: '#FFFFFF',
    sunday: '#F5B841',
    sundaySoft: '#FDF1D6',
    income: '#1E8E5A',
    expense: '#C8553D',
    work: '#2E6FD8',
    personal: '#7A6F9B',
    error: '#B42318',
  },
  dark: {
    background: '#12161C',
    surface: '#1B2029',
    surfaceAlt: '#242A35',
    text: '#F3F1EC',
    textMuted: '#A3A9B6',
    border: '#2E3542',
    primary: '#F5B841',
    onPrimary: '#12161C',
    sunday: '#F5B841',
    sundaySoft: '#3A3020',
    income: '#4CC38A',
    expense: '#E7876F',
    work: '#6EA0F0',
    personal: '#AFA4D1',
    error: '#F97066',
  },
} as const;

export type ColorName = keyof typeof palette.light;
export type Colors = Record<ColorName, string>;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { card: 16, pill: 28, chip: 999, field: 12 } as const;

/** Minimum touch targets from product.md §2. */
export const touch = { primary: 56, min: 48 } as const;

export const type = {
  display: { fontSize: 56, fontWeight: '700' as const, fontVariant: ['tabular-nums' as const] },
  amount: { fontSize: 32, fontWeight: '700' as const, fontVariant: ['tabular-nums' as const] },
  title: { fontSize: 22, fontWeight: '700' as const },
  heading: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  label: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
};
