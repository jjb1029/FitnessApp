import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

export type StepperProps = {
  value: number;
  onChange: (next: number) => void;
  step: number;
  min?: number;
  max?: number;
  /** Shown under the value, e.g. "lb" or "reps". */
  unit?: string;
  /** Tap on the number, e.g. open the keypad. */
  onPressValue?: () => void;
  formatValue?: (value: number) => string;
  /** Visual weight: primary fields are bolder than optional ones. */
  emphasis?: 'primary' | 'secondary';
  /** `action` is for the number the user is about to act on (docs/15 §3). */
  size?: 'md' | 'action';
  /** Called on every detent (each increment or decrement); the caller decides haptics. */
  onBump?: () => void;
  /** Dims the control without disabling it, e.g. during rest. */
  muted?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const REPEAT_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 150;

/** Large numeric stepper for the workout dock: 56 pt tall, long-press repeats. */
export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  unit,
  onPressValue,
  formatValue,
  emphasis = 'primary',
  size = 'md',
  onBump,
  muted = false,
  accessibilityLabel,
  style,
  testID,
}: StepperProps) {
  const theme = useTheme();
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clamp = (n: number) => Math.min(max, Math.max(min, Number(n.toFixed(3))));
  const bump = (direction: 1 | -1) => {
    const next = clamp(valueRef.current + direction * step);
    if (next !== valueRef.current) {
      onChange(next);
      onBump?.();
    }
  };

  const stopRepeat = () => {
    if (delay.current) clearTimeout(delay.current);
    if (timer.current) clearInterval(timer.current);
    delay.current = null;
    timer.current = null;
  };
  const startRepeat = (direction: 1 | -1) => {
    stopRepeat();
    delay.current = setTimeout(() => {
      timer.current = setInterval(() => bump(direction), REPEAT_INTERVAL_MS);
    }, REPEAT_DELAY_MS);
  };
  useEffect(() => stopRepeat, []);

  const display = formatValue ? formatValue(value) : String(value);
  const isPrimary = emphasis === 'primary';

  return (
    <View
      style={[
        styles.container,
        {
          height: size === 'action' ? 72 : theme.sizes.controlLg,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.bgSunken,
          borderColor: theme.colors.border,
          opacity: muted ? 0.6 : 1,
        },
        style,
      ]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: unit ? `${display} ${unit}` : display }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => bump(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      testID={testID}>
      <Pressable
        onPress={() => bump(-1)}
        onLongPress={() => startRepeat(-1)}
        onPressOut={stopRepeat}
        disabled={value <= min}
        accessibilityLabel={`Decrease ${accessibilityLabel}`}
        style={({ pressed }) => [styles.side, pressed && { backgroundColor: theme.colors.border }, value <= min && styles.disabled]}>
        <Icon name="remove" color="textSecondary" />
      </Pressable>
      <Pressable
        onPress={onPressValue}
        disabled={!onPressValue}
        accessibilityLabel={`Edit ${accessibilityLabel}`}
        style={({ pressed }) => [styles.middle, pressed && onPressValue && { opacity: 0.6 }]}>
        <Text
          variant={size === 'action' && isPrimary ? 'monoAction' : isPrimary ? 'monoLarge' : 'mono'}
          color={isPrimary ? 'text' : 'textSecondary'}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={styles.value}>
          {display}
        </Text>
        {unit ? (
          <Text variant="caption" color="textTertiary" style={styles.unit}>
            {unit}
          </Text>
        ) : null}
      </Pressable>
      <Pressable
        onPress={() => bump(1)}
        onLongPress={() => startRepeat(1)}
        onPressOut={stopRepeat}
        disabled={value >= max}
        accessibilityLabel={`Increase ${accessibilityLabel}`}
        style={({ pressed }) => [styles.side, pressed && { backgroundColor: theme.colors.border }, value >= max && styles.disabled]}>
        <Icon name="add" color="textSecondary" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'stretch', borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  side: { width: 44, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  value: { includeFontPadding: false },
  unit: { marginTop: -2 },
  disabled: { opacity: 0.35 },
});
