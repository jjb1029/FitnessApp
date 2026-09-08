import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActiveSessionPill } from '@/features/workout/ActiveSessionPill';
import { Icon, useTheme, type IconName } from '@/ui';

const tab = (label: string, icon: IconName, iconActive: IconName) => ({
  title: label,
  tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => <Icon name={focused ? iconActive : icon} rawColor={String(color)} size={24} />,
});

const TAB_BAR_HEIGHT = 56;

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.textTertiary,
          tabBarStyle: { backgroundColor: theme.colors.bg, borderTopColor: theme.colors.border, height: TAB_BAR_HEIGHT + insets.bottom, paddingTop: 6 },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
          sceneStyle: { backgroundColor: theme.colors.bg },
        }}>
        <Tabs.Screen name="index" options={tab('Home', 'home-outline', 'home')} />
        <Tabs.Screen name="train" options={tab('Train', 'barbell-outline', 'barbell')} />
        <Tabs.Screen name="progress" options={tab('Progress', 'trending-up-outline', 'trending-up')} />
      </Tabs>
      <ActiveSessionPill bottom={TAB_BAR_HEIGHT + insets.bottom + 12} />
    </View>
  );
}
