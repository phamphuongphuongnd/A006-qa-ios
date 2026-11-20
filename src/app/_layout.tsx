import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ensureMigrated } from '@/db/migrate';
import { DataServices, LockGate } from '@/services/data';
import { useNavigationBarStyle } from '@/services/navigationBar';
import { RouterBridge } from '@/services/router';
import { TripServices } from '@/services/trips';
import { SettingsProvider, useSettings } from '@/state/settings';
import { AppThemeProvider, useTheme } from '@/theme';
import { ContentColumn, SnackbarProvider } from '@/ui';

SplashScreen.preventAutoHideAsync();

const RUNTIME_FONTS =
  Platform.OS === 'android' ? {} : { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold };

/** Same migration run as the background entry points (`ensureMigrated`), so a headless task can't race the screens. */
function useDbReady() {
  const [state, setState] = useState<{ success: boolean; error?: Error }>({ success: false });
  useEffect(() => {
    ensureMigrated().then(
      () => setState({ success: true }),
      (e: unknown) => setState({ success: false, error: e instanceof Error ? e : new Error(String(e)) }),
    );
  }, []);
  return state;
}

export default function RootLayout() {
  const { success, error } = useDbReady();
  const [fontsLoaded, fontError] = useFonts(RUNTIME_FONTS);
  // Android has Inter linked into the APK at build time (expo-font plugin, app.json), so it never waits here.
  // Elsewhere: fall back to the system font rather than block the app.
  const fontsReady = Platform.OS === 'android' || fontsLoaded || !!fontError;

  useEffect(() => {
    if ((success && fontsReady) || error) SplashScreen.hideAsync();
  }, [success, fontsReady, error]);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text>{"Sunday Sort couldn't open its database. Please restart the app."}</Text>
        <Text selectable>{error.message}</Text>
      </View>
    );
  }
  if (!success || !fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemedStack />
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedStack() {
  const { settings } = useSettings();
  return (
    <AppThemeProvider mode={settings.theme}>
      <SnackbarProvider>
        <LockGate>
          <Navigator onboarded={settings.onboarded} />
        </LockGate>
        {settings.onboarded ? (
          <>
            <TripServices />
            <DataServices />
          </>
        ) : null}
      </SnackbarProvider>
    </AppThemeProvider>
  );
}

function Navigator({ onboarded }: { onboarded: boolean }) {
  const { colors, dark } = useTheme();
  useNavigationBarStyle(dark);
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <RouterBridge />
      {/* QA-100 MOD-4 / B-85: on a tablet or an unfolded Fold the phone layout stretched edge to edge — keep the app a
          phone-width column (CONTENT_MAX) in the middle. B-146 (iPad): per screen, so iOS modals get it too. Sheets and
          dialogs centre their own panel (ui/Overlays). */}
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack
          screenLayout={({ children, route }) => (
            // Quick capture is drawn on the surface colour — the sides match it.
            <ContentColumn background={route.name === 'capture' ? colors.surface : undefined}>{children}</ContentColumn>
          )}
          screenOptions={{
            // Every screen draws its own mockup header (big title / close button) via <Screen>.
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="capture" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="entry/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="split/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="sort-list" />
            <Stack.Screen name="sort-done" />
            <Stack.Screen name="trip/active" />
            <Stack.Screen name="trip/start" />
            <Stack.Screen name="trip/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="trip/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="trip/permission" options={{ presentation: 'modal' }} />
            <Stack.Screen name="trip/auto" />
            <Stack.Screen name="trip/nfc" />
            <Stack.Screen name="trip/battery" />
            <Stack.Screen name="trip/work-hours" />
            <Stack.Screen name="rules" />
            <Stack.Screen name="auto-sorted" />
            <Stack.Screen name="recurring" />
            <Stack.Screen name="recently-deleted" />
            <Stack.Screen name="regular-trips" />
            <Stack.Screen name="notifications" />
            {/* S-19 (onboarding S-01e opens the same screen as onboarding/pro). */}
            <Stack.Screen name="pro" />
            <Stack.Screen name="export" options={{ presentation: 'modal' }} />
            <Stack.Screen name="backup" />
            <Stack.Screen name="categories" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="disclaimer" />
            <Stack.Screen name="locked" options={{ gestureEnabled: false }} />
            <Stack.Screen name="dev/gallery" />
            {/* B-37: every route must be declared inside a guard — an undeclared route stays reachable before onboarding,
                and a fresh install lands on the first one (dev/ocr) instead of S-01a. */}
            <Stack.Screen name="dev/ocr" />
            <Stack.Screen name="dev/probe" />
            <Stack.Screen name="mileage-rates" />
            <Stack.Screen name="trip/odometer" />
            <Stack.Screen name="trip/setup" />
            <Stack.Screen name="trip/toggle" />
          </Stack.Protected>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
        </Stack>
      </View>
    </>
  );
}
