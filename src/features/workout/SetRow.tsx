import { Pressable, StyleSheet, View } from 'react-native';

import type { PerformedSetRow } from '@/data/schema';
import type { Exercise, IntensityScale, WeightUnit } from '@/domain';
import { Icon, Text, useTheme } from '@/ui';

import { formatSetRow } from './format';

export type SetRowProps =
  | { kind: 'done'; index: number; set: PerformedSetRow; exercise: Exercise; unit: WeightUnit; scale: IntensityScale; editing: boolean; onPress: () => void; onDelete?: () => void }
  | { kind: 'current'; index: number; label: string; setType: PerformedSetRow['setType'] }
  | { kind: 'pending'; index: number; label: string; setType: PerformedSetRow['setType'] };

/** One line in the expanded exercise block: done (tap to edit), current (mirrors the dock), or pending preview. */
export function SetRow(props: SetRowProps) {
  const theme = useTheme();
  const isWarmup = props.kind === 'done' ? props.set.setType === 'warmup' : props.setType === 'warmup';
  const indexLabel = isWarmup ? 'W' : String(props.index);

  if (props.kind === 'done') {
    const { set, exercise, unit, scale, editing, onPress, onDelete } = props;
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Set ${indexLabel}, ${formatSetRow(exercise, set, unit, scale)}${set.isPr ? ', personal record' : ''}. Tap to edit.`}
        style={({ pressed }) => [styles.row, { minHeight: 40, borderRadius: theme.radius.sm, backgroundColor: editing ? theme.colors.accentSubtle : pressed ? theme.colors.bgSunken : 'transparent' }]}>
        <Text variant="caption" color={isWarmup ? 'textTertiary' : 'textSecondary'} style={styles.index}>
          {indexLabel}
        </Text>
        <Icon name="checkmark" size={16} color={isWarmup ? 'textTertiary' : 'success'} />
        <Text variant="mono" color={isWarmup ? 'textTertiary' : 'text'} style={styles.value}>
          {formatSetRow(exercise, set, unit, scale)}
        </Text>
        {set.isPr ? <Icon name="trophy" size={14} color="warning" /> : null}
        {editing && onDelete ? (
          <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel="Delete set" hitSlop={8}>
            <Text variant="caption" color="danger" style={{ fontWeight: '600' }}>
              Delete
            </Text>
          </Pressable>
        ) : null}
      </Pressable>
    );
  }

  const isCurrent = props.kind === 'current';
  return (
    <View style={[styles.row, { minHeight: 40, borderRadius: theme.radius.sm, backgroundColor: isCurrent ? theme.colors.accentSubtle : 'transparent' }]} accessible accessibilityLabel={`Set ${indexLabel}, ${isCurrent ? 'current' : 'pending'}, ${props.label}`}>
      <Text variant="caption" color={isCurrent ? 'accent' : 'textTertiary'} style={styles.index}>
        {indexLabel}
      </Text>
      {isCurrent ? <Icon name="play" size={14} color="accent" /> : <View style={{ width: 16 }} />}
      <Text variant="mono" color={isCurrent ? 'text' : 'textTertiary'} style={styles.value}>
        {props.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 },
  index: { width: 16, textAlign: 'center' },
  value: { flex: 1 },
});
