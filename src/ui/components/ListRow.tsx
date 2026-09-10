import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Measure } from './Measure';
import { Text } from './Text';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Right-aligned measured value, e.g. "182.4". */
  value?: string;
  /** Unit for `value`, rendered a step down and tertiary. */
  valueUnit?: string;
  chevron?: boolean;
  icon?: IconName;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  value,
  valueUnit,
  chevron,
  icon,
  onPress,
  accessibilityLabel,
  style,
  testID,
}: ListRowProps) {
  const theme = useTheme();
  const showChevron = chevron ?? Boolean(onPress);
  const content = (
    <>
      {leading ?? (icon ? <Icon name={icon} color="textSecondary" /> : null)}
      <View style={styles.textBlock}>
        <Text variant="body" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? <Measure value={value} unit={valueUnit ?? null} size="numBody" tone="text" /> : null}
      {trailing}
      {showChevron ? <Icon name="chevron-forward" size={theme.sizes.iconSm} color="textTertiary" /> : null}
    </>
  );
  const rowStyle: ViewStyle = {
    minHeight: theme.sizes.controlLg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ')}
        testID={testID}
        style={({ pressed }) => [styles.row, rowStyle, pressed && { backgroundColor: theme.colors.bgSunken }, style]}>
        {content}
      </Pressable>
    );
  }
  return (
    <View style={[styles.row, rowStyle, style]} testID={testID} accessible accessibilityLabel={accessibilityLabel}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  textBlock: { flex: 1, gap: 2 },
});
