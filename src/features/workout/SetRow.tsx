import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import type { PerformedSetRow } from '@/data/schema';
import type { Exercise, IntensityScale, WeightUnit } from '@/domain';
import { Icon, Measure, StatusPill, Text, useTheme, type ColorName } from '@/ui';

import { effortLabel, effortValue, formatSetRow, setLoadParts, type LoadParts } from './format';

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
  | { kind: 'current'; index: number; parts: RowParts; setType: PerformedSetRow['setType']; resting: boolean }
  | { kind: 'pending'; index: number; parts: RowParts; setType: PerformedSetRow['setType'] };

/** A planned set, split the same way a logged one is. */
export type RowParts = { load: LoadParts; reps: string; perSide: boolean; effort: string | null };

/** One line in the expanded exercise block: done (tap to edit), current (mirrors the dock), or pending preview. */
export function SetRow(props: SetRowProps) {
  const theme = useTheme();
  const isWarmup = props.kind === 'done' ? props.set.setType === 'warmup' : props.setType === 'warmup';
  const indexLabel = isWarmup ? 'W' : String(props.index);

  if (props.kind === 'done') {
    const { set, exercise, unit, scale, editing, onPress, onDelete, justLanded } = props;
    const load = setLoadParts(exercise, set.loadKg, set.addedLoadKg, unit);
    const tone: ColorName = isWarmup ? 'textTertiary' : 'text';
    return (
      <Landing active={justLanded} reduceMotion={theme.reduceMotion} tint={theme.colors.successSubtle} radius={theme.radius.sm}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`Set ${indexLabel}, ${formatSetRow(exercise, set, unit, scale)}${set.isPr ? ', new best' : ''}. Tap to edit.`}
          style={({ pressed }) => [styles.row, { minHeight: 40, borderRadius: theme.radius.sm, backgroundColor: editing ? theme.colors.bgSunken : pressed ? theme.colors.bgSunken : 'transparent' }]}>
          <Text variant="numCaption" color={isWarmup ? 'textTertiary' : 'textSecondary'} style={styles.index}>
            {indexLabel}
          </Text>
          <Icon name="checkmark" size={16} color={isWarmup ? 'textTertiary' : 'success'} />
          <View style={styles.value}>
            <LoadValue load={load} tone={tone} />
            <Text variant="callout" color="textTertiary">
              ×
            </Text>
            <Measure value={set.reps} unit={exercise.laterality === 'unilateral' ? '/ side' : null} size="numBody" tone={tone} accessible={false} />
            {set.rir !== null ? (
              <Measure value={effortValue(set.rir, scale)} unit={effortLabel(scale)} size="numCaption" tone="textTertiary" accessible={false} />
            ) : null}
          </View>
          {set.isPr ? <StatusPill label="Best" tone="success" icon="trending-up" /> : null}
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
  const rowTone: ColorName = isCurrent ? (resting ? 'textSecondary' : 'text') : 'textTertiary';
  const label = `${'text' in props.parts.load ? props.parts.load.text : `${props.parts.load.value} ${props.parts.load.unit ?? ''}`} × ${props.parts.reps}`;
  return (
    <View
      style={[styles.row, { minHeight: 40, borderRadius: theme.radius.sm, backgroundColor: isCurrent && !resting ? theme.colors.bgSunken : 'transparent' }]}
      accessible
      accessibilityLabel={`Set ${indexLabel}, ${isCurrent ? (resting ? 'next, resting' : 'current') : 'pending'}, ${label}`}>
      <Text variant="numCaption" color={isCurrent ? 'text' : 'textTertiary'} style={styles.index}>
        {indexLabel}
      </Text>
      {isCurrent ? <Icon name={resting ? 'time-outline' : 'play'} size={14} color={resting ? 'textSecondary' : 'text'} /> : <View style={{ width: 16 }} />}
      <View style={styles.value}>
        <LoadValue load={props.parts.load} tone={rowTone} />
        <Text variant="callout" color="textTertiary">
          ×
        </Text>
        <Measure value={props.parts.reps} unit={props.parts.perSide ? '/ side' : null} size="numBody" tone={rowTone} accessible={false} />
        {props.parts.effort ? (
          <Text variant="numCaption" color="textTertiary">
            {props.parts.effort}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** A measured load renders as number + tertiary unit; "BW" and "—" are words, so they stay words. */
function LoadValue({ load, tone }: { load: LoadParts; tone: ColorName }) {
  if ('text' in load) {
    return (
      <Text variant="numBody" color={tone}>
        {load.text}
      </Text>
    );
  }
  return <Measure value={load.value} unit={load.unit} size="numBody" tone={tone} accessible={false} />;
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
  value: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 6 },
});
