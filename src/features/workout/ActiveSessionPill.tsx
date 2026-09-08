import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { getInProgressSession } from '@/data/repositories';
import { useDbQuery } from '@/data/useDbQuery';
import { formatDuration } from '@/lib/dates';
import { Icon, Text, useTheme } from '@/ui';

import { useCurrentUser } from '../app/UserProvider';
import { useNow } from '../app/useNow';

/** "Upper A · 32:14 · Resume" above the tab bar while a session is in progress and minimised. */
export function ActiveSessionPill({ bottom }: { bottom: number }) {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useCurrentUser();
  const { data } = useDbQuery(() => getInProgressSession(user.id), ['session'], [user.id]);
  const now = useNow(1000);
  if (!data) return null;
  const elapsed = Math.max(0, (now - Date.parse(data.startedAt)) / 1000);
  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
      <Pressable
        onPress={() => router.push({ pathname: '/workout/[sessionId]', params: { sessionId: data.id } })}
        accessibilityRole="button"
        accessibilityLabel={`Resume ${data.name}, ${formatDuration(elapsed)} elapsed`}
        style={({ pressed }) => [styles.pill, { backgroundColor: pressed ? theme.colors.accentPressed : theme.colors.accent, borderRadius: theme.radius.full }]}>
        <Icon name="play" size={14} rawColor={theme.colors.textOnAccent} />
        <Text variant="callout" style={{ color: theme.colors.textOnAccent, fontWeight: '600' }}>
          {data.name}
        </Text>
        <Text variant="callout" style={{ color: theme.colors.textOnAccent, fontVariant: ['tabular-nums'], opacity: 0.9 }}>
          {formatDuration(elapsed)}
        </Text>
        <Text variant="callout" style={{ color: theme.colors.textOnAccent, fontWeight: '600' }}>
          · Resume
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 18 },
});
