import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type ExplainableValueProps = {
  /** Leading label, e.g. exercise name. Optional. */
  label?: string;
  /** The value itself, e.g. "80 lb". */
  value: string;
  /** Change indicator, e.g. "↑ 5" or "keep". */
  delta?: string;
  deltaTone?: 'up' | 'down' | 'neutral';
  onPressWhy: () => void;
  whyLabel?: string;
  compact?: boolean;
};

/**
 * Tier 0 of the explainability system: a value with an always-visible "Why?"
 * text button. Used for loads, reps, sets, durations, and rankings.
 */
export function ExplainableValue({ label, value, delta, deltaTone = 'neutral', onPressWhy, whyLabel = 'Why?', compact = false }: ExplainableValueProps) {
  const theme = useTheme();
  const deltaColor = deltaTone === 'up' ? 'success' : deltaTone === 'down' ? 'warning' : 'textSecondary';
  return (
    <View style={[styles.row, { minHeight: compact ? theme.sizes.touchMin : theme.sizes.controlMd }]}>
      {label ? (
        <Text variant={compact ? 'callout' : 'body'} style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      <Text variant="mono">{value}</Text>
      {delta ? (
        <Text variant="callout" color={deltaColor}>
          {delta}
        </Text>
      ) : null}
      <Pressable
        onPress={onPressWhy}
        accessibilityRole="button"
        accessibilityLabel={`${whyLabel} ${label ?? ''} ${value}`}
        hitSlop={8}
        style={({ pressed }) => [styles.why, { minHeight: theme.sizes.touchMin, opacity: pressed ? 0.6 : 1 }]}>
        <Text variant="callout" color="accent" style={styles.whyText}>
          {whyLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1 },
  why: { justifyContent: 'center', paddingHorizontal: 4 },
  whyText: { fontWeight: '600' },
});
