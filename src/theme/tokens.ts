/**
 * Design tokens from the Hi-Fi mockup: design/tokens.json (source: design/sunday.css).
 * Change the mockup → update this file; screens only use these names.
 *
 * Contrast rule from the design hand-off: amounts and primary buttons use the *Text / *Button tones (≥ 7:1);
 * `income` / `expense` / `workFill` / `personalFill` raw hues are for icons, dots and charts only (`work` / `personal`
 * are the text tones). Bản 2 adds automation status `ok` / `warn` / `off` / `live` — always shown with words.
 */
export const palette = {
  light: {
    background: '#FAF8F4',
    surface: '#FFFFFF',
    surfaceAlt: '#F2EEE6',
    line: '#E6E0D5',
    lineStrong: '#8A8478',
    text: '#18202F',
    textSecondary: '#596273',
    textTertiary: '#5F6877',
    /** Input hints: clearly lighter than typed values (B-05). */
    placeholder: '#959CA8',
    primary: '#1F2A44',
    onPrimary: '#FFFFFF',
    primaryText: '#1F2A44',
    sun: '#F5B841',
    sunSoft: '#FDF1D8',
    sunText: '#6E4B00',
    income: '#1E8E5A',
    incomeText: '#0C5C37',
    incomeButton: '#0C5C37',
    onIncomeButton: '#FFFFFF',
    incomeSoft: '#E3F2EA',
    expense: '#C8553D',
    expenseText: '#8C331F',
    expenseButton: '#8C331F',
    onExpenseButton: '#FFFFFF',
    expenseSoft: '#F8E6DF',
    work: '#1F57B3',
    workSoft: '#E5EEFB',
    personal: '#5F557F',
    personalSoft: '#EEEBF4',
    error: '#B42318',
    onError: '#FFFFFF',
    errorSoft: '#FBE9E7',
    scrim: 'rgba(18,22,28,0.48)',
    snackbar: '#1F2A44',
    onSnackbar: '#FFFFFF',
    snackbarAction: '#F5B841',
    navyCard: '#1F2A44',
    receiptPaper: '#F4F1EA',
    // v2 tokens (design/tokens.json bản 2)
    workFill: '#2E6FD8',
    personalFill: '#7A6F9B',
    onScope: '#FFFFFF',
    onSun: '#18202F',
    ok: '#2F8A5F',
    okText: '#1D6B47',
    warn: '#D9822B',
    warnText: '#9A4F0C',
    warnSoft: '#FCEFE1',
    off: '#7C838E',
    live: '#D92D20',
    focusRing: '#2E6FD8',
  },
  dark: {
    background: '#12161C',
    surface: '#1B2129',
    surfaceAlt: '#0D1015',
    line: '#2C343F',
    lineStrong: '#6B7480',
    text: '#F2EFE9',
    textSecondary: '#A7AFBC',
    textTertiary: '#9AA2AE',
    placeholder: '#68717F',
    primary: '#F5B841',
    onPrimary: '#12161C',
    primaryText: '#F5C866',
    sun: '#F5B841',
    sunSoft: '#3A3020',
    sunText: '#F5B841',
    income: '#3FBF84',
    incomeText: '#6FD9A6',
    incomeButton: '#5FD39A',
    onIncomeButton: '#06251A',
    incomeSoft: '#16302A',
    expense: '#E07A62',
    expenseText: '#F29C86',
    expenseButton: '#F29A84',
    onExpenseButton: '#3A1209',
    expenseSoft: '#352220',
    work: '#8DB6F5',
    workSoft: '#1A2A44',
    personal: '#C4BCE2',
    personalSoft: '#2A2638',
    error: '#F97066',
    onError: '#2B0A06',
    errorSoft: '#3A1C1A',
    scrim: 'rgba(0,0,0,0.6)',
    snackbar: '#F3EFE7',
    onSnackbar: '#12161C',
    snackbarAction: '#7A4E00',
    navyCard: '#26324F',
    receiptPaper: '#F4F1EA',
    // v2 tokens (design/tokens.json bản 2)
    workFill: '#6EA0F0',
    personalFill: '#B3A9D6',
    onScope: '#12161C',
    onSun: '#12161C',
    ok: '#4FBF8A',
    okText: '#79D6A8',
    warn: '#F0A04B',
    warnText: '#F5B871',
    warnSoft: '#3A2A18',
    off: '#8A919C',
    live: '#FF6B5E',
    focusRing: '#F5B841',
  },
} as const;

export type ColorName = keyof typeof palette.light;
export type Colors = Record<ColorName, string>;

/** Chart hues (same in light and dark). */
export const chartHues = { income: '#1E8E5A', expense: '#C8553D', work: '#2E6FD8', personal: '#7A6F9B' } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
/** Screen side gutter: 20 on iOS, 16 on Android (mockup frames). */
export const gutter = { ios: 20, android: 16 } as const;
/**
 * Widest the app's content column gets (pt / dp). A tablet, an iPad or an unfolded Fold keeps the phone layout in a
 * column this wide in the middle instead of stretching it edge to edge (QA-100 MOD-4 / B-85, iPad B-146).
 */
export const CONTENT_MAX = 640;

export const radius = {
  card: 16,
  button: 28,
  buttonSmall: 24,
  bigCapture: 24,
  chip: 22,
  sheet: 28,
  dialog: 28,
  input: 14,
  fab: 22,
} as const;

export const touch = { primary: 56, bigCapture: 72, min: 48, chip: 44, fab: 64 } as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

const tab = ['tabular-nums'] as ('tabular-nums')[];

/** [size, lineHeight, font] from tokens.json `type`. Custom fonts carry the weight (no fontWeight on Android). */
export const type = {
  amountTyped: { fontSize: 64, lineHeight: 72, fontFamily: fonts.extrabold, letterSpacing: -1.9, fontVariant: tab },
  amountDisplay: { fontSize: 56, lineHeight: 64, fontFamily: fonts.extrabold, letterSpacing: -1.7, fontVariant: tab },
  h1: { fontSize: 28, lineHeight: 34, fontFamily: fonts.extrabold, letterSpacing: -0.56 },
  h2: { fontSize: 20, lineHeight: 26, fontFamily: fonts.bold, letterSpacing: -0.2 },
  h3: { fontSize: 17, lineHeight: 24, fontFamily: fonts.bold },
  button: { fontSize: 17, lineHeight: 24, fontFamily: fonts.bold },
  body: { fontSize: 16, lineHeight: 24, fontFamily: fonts.regular },
  small: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: fonts.semibold },
  label: { fontSize: 12, lineHeight: 16, fontFamily: fonts.extrabold, letterSpacing: 0.96, textTransform: 'uppercase' as const },
  /** Amount in lists/cards: weight 800, tabular. Combine with a fontSize. */
  amount: { fontFamily: fonts.extrabold, letterSpacing: -0.3, fontVariant: tab },
  // ---- Bản 2 type scale (design/tokens.json `type`), for new screens ----
  amountXl: { fontSize: 56, lineHeight: 64, fontFamily: fonts.bold, letterSpacing: -1.1, fontVariant: tab },
  amountLg: { fontSize: 34, lineHeight: 40, fontFamily: fonts.bold, letterSpacing: -0.34, fontVariant: tab },
  amountMd: { fontSize: 22, lineHeight: 28, fontFamily: fonts.bold, fontVariant: tab },
  amountRow: { fontSize: 17, lineHeight: 24, fontFamily: fonts.semibold, fontVariant: tab },
  title: { fontSize: 28, lineHeight: 34, fontFamily: fonts.bold, letterSpacing: -0.28 },
  headline: { fontSize: 20, lineHeight: 26, fontFamily: fonts.bold },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontFamily: fonts.semibold },
  /** v2 `label` (metadata under rows). v1 `label` is the uppercase overline. */
  meta: { fontSize: 14, lineHeight: 20, fontFamily: fonts.medium },
  fine: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular },
  overline: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bold, letterSpacing: 0.72, textTransform: 'uppercase' as const },
} as const;

export type TypeName = keyof typeof type;
