import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { expoDb } from '@/db/client';
import { DataServices, LockGate } from '@/services/data';
import { TripServices } from '@/services/trips';
import { SettingsProvider, useSettings } from '@/state/settings';
import { AppThemeProvider, useTheme } from '@/theme';
import { SnackbarProvider } from '@/ui';

import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { success, error } = useMigrations(expoDb, migrations);
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const fontsReady = fontsLoaded || !!fontError; // fall back to system font rather than block the app

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
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
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
          <Stack.Screen name="trip/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="trip/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="trip/permission" options={{ presentation: 'modal' }} />
          <Stack.Screen name="export" options={{ presentation: 'modal' }} />
          <Stack.Screen name="backup" />
          <Stack.Screen name="categories" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="disclaimer" />
          <Stack.Screen name="locked" options={{ gestureEnabled: false }} />
          <Stack.Screen name="dev/gallery" />
        </Stack.Protected>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
