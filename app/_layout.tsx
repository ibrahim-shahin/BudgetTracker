import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { reloadAppAsync } from 'expo';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useRecurringCatchUp, useStoreHydrated } from '@/hooks/useAppReady';
import { useColors } from '@/hooks/useColors';
import { useViewStore } from '@/store/viewStore';

// Screens opened straight from a link still get the tabs underneath them,
// so their close and back buttons have somewhere to go.
export const unstable_settings = { anchor: '(tabs)' };

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colors = useColors();
  return (
    <>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="category/[id]" />
        <Stack.Screen name="expense-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="category-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recurring" />
        <Stack.Screen name="recurring-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="backup" />
      </Stack>
    </>
  );
}

function LoadError({ message }: { message: string }) {
  const colors = useColors();
  return (
    <View style={[styles.error, { backgroundColor: colors.background }]}>
      <Text style={[styles.errorTitle, { color: colors.foreground }]}>Your saved budget couldn&apos;t be read</Text>
      <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
        Nothing has been changed or deleted. Close the app and open it again. ({message})
      </Text>
      <Pressable onPress={() => void reloadAppAsync()} style={[styles.errorButton, { backgroundColor: colors.primary }]} accessibilityRole="button">
        <Text style={[styles.errorButtonText, { color: colors.primaryForeground }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const hydrated = useStoreHydrated();
  const loadError = useViewStore(s => s.loadError);
  const ready = (fontsLoaded || Boolean(fontError)) && (hydrated || loadError !== null);
  useRecurringCatchUp(hydrated);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // The splash screen stays up until the saved data is loaded, so nothing
  // can be added to an empty budget first.
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={styles.root}>
          <KeyboardProvider>{loadError !== null ? <LoadError message={loadError} /> : <RootLayoutNav />}</KeyboardProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  errorText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  errorButton: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  errorButtonText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
