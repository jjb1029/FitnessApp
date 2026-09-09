import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import type { PerformedSetRow } from '@/data/schema';
import type { Exercise, IntensityScale, WeightUnit } from '@/domain';
import { Icon, StatusPill, Text, useTheme } from '@/ui';

import { formatSetRow } from './format';

export type SetRowProps =
  | {
      kind: 'done';
      index: number;
      set: PerformedSetRow;
      exercise: Exercise;
      unit: WeightUnit;
      scale: IntensityScale;
      editing: boolean;
      /** True for the set that just landed: plays the landing highlight once. */
      justLanded: boolean;
      onPress: () => void;
      onDelete?: () => void;
    }
  | { kind: 'current'; index: number; label: string; setType: PerformedSetRow['setType']; resting: boolean }
  | { kind: 'pending'; index: number; label: string; setType: PerformedSetRow['setType'] };

/** One line in the expanded exercise block: done (tap to edit), current (mirrors the dock), or pending preview. */
export function SetRow(props: SetRowProps) {
  const theme = useTheme();
  const isWarmup = props.kind === 'done' ? props.set.setType === 'warmup' : props.setType === 'warmup';
  const indexLabel = isWarmup ? 'W' : String(props.index);

  if (props.kind === 'done') {
    const { set, exercise, unit, scale, editing, onPress, onDelete, justLanded } = props;
    return (
      <Landing active={justLanded} reduceMotion={theme.reduceMotion} tint={theme.colors.successSubtle} radius={theme.radius.sm}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`Set ${indexLabel}, ${formatSetRow(exercise, set, unit, scale)}${set.isPr ? ', new best' : ''}. Tap to edit.`}
          style={({ pressed }) => [styles.row, { minHeight: 40, borderRadius: theme.radius.sm, backgroundColor: editing ? theme.colors.accentSubtle : pressed ? theme.colors.bgSunken : 'transparent' }]}>
          <Text variant="caption" color={isWarmup ? 'textTertiary' : 'textSecondary'} style={styles.index}>
            {indexLabel}
          </Text>
          <Icon name="checkmark" size={16} color={isWarmup ? 'textTertiary' : 'success'} />
          <Text variant="mono" color={isWarmup ? 'textTertiary' : 'text'} style={styles.value}>
            {formatSetRow(exercise, set, unit, scale)}
          </Text>
          {set.isPr ? <StatusPill label="Best" tone="accent" icon="trending-up" /> : null}
          {editing && onDelete ? (
            <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel="Delete set" hitSlop={8}>
              <Text variant="caption" color="danger" style={{ fontWeight: '600' }}>
                Delete
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Landing>
    );
  }

  const isCurrent = props.kind === 'current';
  const resting = isCurrent && props.resting;
  return (
    <View
      style={[styles.row, { minHeight: 40, borderRadius: theme.radius.sm, backgroundColor: isCurrent && !resting ? theme.colors.accentSubtle : 'transparent' }]}
      accessible
      accessibilityLabel={`Set ${indexLabel}, ${isCurrent ? (resting ? 'next, resting' : 'current') : 'pending'}, ${props.label}`}>
      <Text variant="caption" color={isCurrent ? 'accent' : 'textTertiary'} style={styles.index}>
        {indexLabel}
      </Text>
      {isCurrent ? <Icon name={resting ? 'time-outline' : 'play'} size={14} color="accent" /> : <View style={{ width: 16 }} />}
      <Text variant="mono" color={isCurrent ? (resting ? 'textSecondary' : 'text') : 'textTertiary'} style={styles.value}>
        {props.label}
      </Text>
    </View>
  );
}

/** Fades a success tint in and out once when a set lands. Instant under reduced motion. */
function Landing({ active, reduceMotion, tint, radius, children }: { active: boolean; reduceMotion: boolean; tint: string; radius: number; children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (!active || reduceMotion) {
      opacity.set(0);
      return;
    }
    opacity.set(withTiming(1, { duration: 120 }));
    opacity.set(withDelay(700, withTiming(0, { duration: 400 })));
  }, [active, reduceMotion, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint, borderRadius: radius }, style]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 },
  index: { width: 16, textAlign: 'center' },
  value: { flex: 1 },
});
