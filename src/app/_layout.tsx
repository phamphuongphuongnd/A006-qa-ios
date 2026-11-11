import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { expoDb } from '@/db/client';
import { SettingsProvider, useSettings } from '@/state/settings';
import { AppThemeProvider, useTheme } from '@/theme';

import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { success, error } = useMigrations(expoDb, migrations);

  useEffect(() => {
    if (success || error) SplashScreen.hideAsync();
  }, [success, error]);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text>{"Sunday Sort couldn't open its database. Please restart the app."}</Text>
        <Text selectable>{error.message}</Text>
      </View>
    );
  }
  if (!success) return null;

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
      <Navigator onboarded={settings.onboarded} />
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
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="capture" options={{ presentation: 'fullScreenModal', headerShown: false }} />
          <Stack.Screen name="entry/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="split/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="sort-list" />
          <Stack.Screen name="sort-done" options={{ headerShown: false }} />
          <Stack.Screen name="trip/active" />
          <Stack.Screen name="trip/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="trip/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="trip/permission" options={{ presentation: 'modal' }} />
          <Stack.Screen name="export" options={{ presentation: 'modal' }} />
          <Stack.Screen name="backup" />
          <Stack.Screen name="categories" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="disclaimer" />
          <Stack.Screen name="locked" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
