import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Chip({ label, selected = false, onPress, icon, disabled = false, style, testID }: ChipProps) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected, disabled }}
      testID={testID}
      style={({ pressed }) => [
        styles.chip,
        {
          minHeight: theme.sizes.touchMin,
          borderRadius: theme.radius.full,
          paddingHorizontal: theme.spacing.lg,
          backgroundColor: selected ? colors.bgSunken : pressed ? colors.bgSunken : colors.bgElevated,
          borderColor: selected ? colors.text : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}>
      {selected ? <Icon name="checkmark" size={theme.sizes.iconSm} color="text" /> : icon ? <Icon name={icon} size={theme.sizes.iconSm} color="textSecondary" /> : null}
      <Text variant="callout" color="text" style={selected ? styles.selectedText : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  selectedText: { fontWeight: '600' },
});
