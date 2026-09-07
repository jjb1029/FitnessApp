import { Stack } from 'expo-router';

import { useTheme } from '@/ui';

export default function OnboardingLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
        animation: theme.reduceMotion ? 'fade' : 'slide_from_right',
      }}
    />
  );
}
