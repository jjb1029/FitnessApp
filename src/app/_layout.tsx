import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { UserProvider, useCurrentUser } from '@/features/app/UserProvider';
import { configureNotifications } from '@/services/notifications';
import { Text, ThemeProvider, ToastProvider, useTheme } from '@/ui';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <DatabaseProvider>
              <UserProvider fallback={<Loading />}>
                <Navigation />
              </UserProvider>
            </DatabaseProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Loading() {
  const theme = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: theme.colors.bg }]}>
      <Text variant="title1">Forma</Text>
    </View>
  );
}

function Navigation() {
  const theme = useTheme();
  const { user } = useCurrentUser();
  const onboarded = user.onboardingCompletedAt !== null;

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
    configureNotifications();
  }, []);

  const header = { headerShown: true, headerStyle: { backgroundColor: theme.colors.bg }, headerTintColor: theme.colors.text, headerShadowVisible: false };

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings/index" options={{ ...header, title: 'Settings' }} />
          <Stack.Screen name="workout/[sessionId]" options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: theme.reduceMotion ? 'fade' : 'slide_from_bottom' }} />
        </Stack.Protected>
        <Stack.Screen name="dev/gallery" options={{ ...header, title: 'Component gallery' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
