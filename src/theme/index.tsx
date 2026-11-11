import { createContext, useContext, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { gutter as gutters, palette, type Colors } from './tokens';

export * from './tokens';

type Mode = 'system' | 'light' | 'dark';

const ThemeCtx = createContext<{ colors: Colors; dark: boolean }>({ colors: palette.light, dark: false });

export function AppThemeProvider({ mode, children }: { mode: Mode; children: ReactNode }) {
  const system = useColorScheme();
  const dark = mode === 'dark' || (mode === 'system' && system === 'dark');
  return <ThemeCtx.Provider value={{ colors: dark ? palette.dark : palette.light, dark }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

/** Horizontal screen padding for this platform. */
export const GUTTER = Platform.OS === 'ios' ? gutters.ios : gutters.android;
