import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { DarkTheme, ThemeProvider } from 'expo-router/react-navigation';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { databaseName, migrateDatabase } from '../db/migrate';
import { PreferencesProvider } from '../state/preferences';
import { ScreenMessage } from '../ui/layout';
import { colors, fonts } from '../ui/theme';

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

const fontAssets = {
  [fonts.body]: DMSans_400Regular,
  [fonts.emphasis]: DMSans_600SemiBold,
  [fonts.display]: BarlowCondensed_800ExtraBold,
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [databaseFailed, setDatabaseFailed] = useState(false);
  const onDatabaseError = useCallback((error: Error) => {
    console.warn('STRIDE could not open local storage.', error);
    setDatabaseFailed(true);
  }, []);

  useEffect(() => {
    if (fontError) console.warn('STRIDE could not load its fonts.', fontError);
  }, [fontError]);

  return (
    <ThemeProvider value={theme}>
      <View style={styles.root}>
        <StatusBar style="light" />
        {!fontsLoaded && !fontError ? <ScreenMessage>Opening STRIDE…</ScreenMessage> :
          databaseFailed ? (
            <ScreenMessage action={
              <Pressable accessibilityRole="button" onPress={() => setDatabaseFailed(false)} style={styles.retry}>
                <Text style={styles.retryLabel}>Try again</Text>
              </Pressable>
            }>
              Could not open local storage.
            </ScreenMessage>
          ) : (
            <SQLiteProvider databaseName={databaseName} onInit={migrateDatabase} onError={onDatabaseError}>
              <PreferencesProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                </Stack>
              </PreferencesProvider>
            </SQLiteProvider>
          )}
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  retry: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.accent },
  retryLabel: { color: colors.accentInk, fontFamily: fonts.emphasis },
});
