import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Icon, useTheme, type IconName } from '@/ui';

const tab = (label: string, icon: IconName, iconActive: IconName) => ({
  title: label,
  tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => <Icon name={focused ? iconActive : icon} rawColor={String(color)} size={24} />,
});

export default function TabLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: { backgroundColor: theme.colors.bg, borderTopColor: theme.colors.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: theme.colors.bg },
      }}>
      <Tabs.Screen name="index" options={tab('Home', 'home-outline', 'home')} />
      <Tabs.Screen name="train" options={tab('Train', 'barbell-outline', 'barbell')} />
      <Tabs.Screen name="progress" options={tab('Progress', 'trending-up-outline', 'trending-up')} />
    </Tabs>
  );
}
