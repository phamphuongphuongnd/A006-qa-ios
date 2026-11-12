/**
 * Design tokens from the Hi-Fi mockup: design/tokens.json (source: design/sunday.css).
 * Change the mockup → update this file; screens only use these names.
 *
 * Contrast rule from the design hand-off: amounts and primary buttons use the *Text / *Button tones (≥ 7:1);
 * `income` / `expense` / `work` / `personal` raw hues are for icons, dots and charts only.
 */
export const palette = {
  light: {
    background: '#FAF8F4',
    surface: '#FFFFFF',
    surfaceAlt: '#F2EEE6',
    line: '#E6E0D5',
    lineStrong: '#CBC3B4',
    text: '#161D2B',
    textSecondary: '#465062',
    textTertiary: '#5F6877',
    /** Input hints: clearly lighter than typed values (B-05). */
    placeholder: '#959CA8',
    primary: '#1F2A44',
    onPrimary: '#FFFFFF',
    primaryText: '#1F2A44',
    sun: '#F5B841',
    sunSoft: '#FDF0D3',
    sunText: '#6B4A00',
    income: '#1E8E5A',
    incomeText: '#0F5C39',
    incomeButton: '#0F5C39',
    onIncomeButton: '#FFFFFF',
    incomeSoft: '#E2F1E8',
    expense: '#C8553D',
    expenseText: '#93371F',
    expenseButton: '#93371F',
    onExpenseButton: '#FFFFFF',
    expenseSoft: '#FBE8E1',
    work: '#2357B8',
    workSoft: '#E4ECFB',
    personal: '#635888',
    personalSoft: '#EDEAF4',
    error: '#B42318',
    onError: '#FFFFFF',
    errorSoft: '#FDECEA',
    scrim: 'rgba(18,22,28,0.5)',
    snackbar: '#1F2A44',
    onSnackbar: '#FFFFFF',
    snackbarAction: '#F5B841',
    navyCard: '#1F2A44',
    receiptPaper: '#F4F1EA',
  },
  dark: {
    background: '#12161C',
    surface: '#1A2029',
    surfaceAlt: '#252C37',
    line: '#2C3441',
    lineStrong: '#4A5361',
    text: '#F3EFE7',
    textSecondary: '#BEC4CE',
    textTertiary: '#9AA2AE',
    placeholder: '#68717F',
    primary: '#F5B841',
    onPrimary: '#12161C',
    primaryText: '#F5C866',
    sun: '#F5B841',
    sunSoft: '#3A3122',
    sunText: '#F7CD71',
    income: '#1E8E5A',
    incomeText: '#62D29C',
    incomeButton: '#5FD39A',
    onIncomeButton: '#06251A',
    incomeSoft: '#163429',
    expense: '#C8553D',
    expenseText: '#F49C86',
    expenseButton: '#F29A84',
    onExpenseButton: '#3A1209',
    expenseSoft: '#3B241F',
    work: '#8DB3F4',
    workSoft: '#1C2A42',
    personal: '#C3B9E4',
    personalSoft: '#2A2739',
    error: '#F97066',
    onError: '#2B0A06',
    errorSoft: '#3A1C1A',
    scrim: 'rgba(18,22,28,0.5)',
    snackbar: '#F3EFE7',
    onSnackbar: '#12161C',
    snackbarAction: '#7A4E00',
    navyCard: '#26324F',
    receiptPaper: '#F4F1EA',
  },
} as const;

export type ColorName = keyof typeof palette.light;
export type Colors = Record<ColorName, string>;

/** Chart hues (same in light and dark). */
export const chartHues = { income: '#1E8E5A', expense: '#C8553D', work: '#2E6FD8', personal: '#7A6F9B' } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
/** Screen side gutter: 20 on iOS, 16 on Android (mockup frames). */
export const gutter = { ios: 20, android: 16 } as const;

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
} as const;

export type TypeName = keyof typeof type;
