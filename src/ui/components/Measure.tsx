import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { measureLabel, unitLayoutFor } from '../numeric';
import type { ColorName, NumericSize } from '../tokens';
import { Text } from './Text';

export type MeasureProps = {
  /** The number itself, already formatted for display. */
  value: string | number;
  /** Display unit, e.g. "lb", "reps", "+kg". Rendered a step down and tertiary. */
  unit?: string | null;
  size?: NumericSize;
  tone?: ColorName;
  /** Overrides the unit's default tertiary tone; rarely needed. */
  unitTone?: ColorName;
  /** `auto` follows the ramp: stacked at action sizes, inline below them. */
  layout?: 'auto' | 'inline' | 'stacked';
  /** Shrinks the value to fit its container, e.g. inside a stepper. */
  fit?: boolean;
  /** Set false when an ancestor already exposes this value to a screen reader. */
  accessible?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A measured value (docs/16 §4d, V2). Numbers are a different material from
 * words: tabular figures from the numeric ramp, with the unit one step down in
 * `textTertiary` so the number reads first. Everything the engine measured or
 * decided goes through this — loads, reps, countdowns, deltas, estimated maxes
 * — which is what makes the treatment a signature rather than a one-off.
 *
 * The value and its unit are always announced as a single node ("80 pounds").
 */
export function Measure({
  value,
  unit,
  size = 'numBody',
  tone = 'text',
  unitTone = 'textTertiary',
  layout = 'auto',
  fit = false,
  accessible = true,
  accessibilityLabel,
  style,
  containerStyle,
  testID,
}: MeasureProps) {
  const text = String(value);
  const resolved = layout === 'auto' ? unitLayoutFor(size) : layout;
  const label = accessibilityLabel ?? measureLabel(text, unit);
  const a11y = accessible ? { accessible: true, accessibilityLabel: label } : { importantForAccessibility: 'no-hide-descendants' as const };

  if (!unit || resolved === 'inline') {
    return (
      <Text
        variant={size}
        color={tone}
        numberOfLines={1}
        adjustsFontSizeToFit={fit}
        minimumFontScale={fit ? 0.6 : undefined}
        style={[styles.value, style]}
        testID={testID}
        {...a11y}>
        {text}
        {unit ? (
          <Text variant="caption" color={unitTone}>
            {` ${unit}`}
          </Text>
        ) : null}
      </Text>
    );
  }

  return (
    <View style={[styles.stack, containerStyle]} testID={testID} {...a11y}>
      <Text variant={size} color={tone} numberOfLines={1} adjustsFontSizeToFit={fit} minimumFontScale={fit ? 0.6 : undefined} style={[styles.value, style]}>
        {text}
      </Text>
      {/* Stacked units sit in narrow columns (the reps stepper is ~100 pt wide),
          so the unit shrinks rather than truncating to "r…". */}
      <Text variant="caption" color={unitTone} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.stackedUnit}>
        {unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  value: { includeFontPadding: false },
  stack: { alignItems: 'center', justifyContent: 'center' },
  stackedUnit: { marginTop: -2 },
});
