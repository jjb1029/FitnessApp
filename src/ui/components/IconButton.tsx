import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import type { ColorName } from '../tokens';
import { Icon, type IconName } from './Icon';

export type IconButtonProps = {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  size?: number;
  color?: ColorName;
  /** Filled circular background instead of plain glyph. */
  filled?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  size,
  color = 'text',
  filled = false,
  disabled = false,
  style,
  testID,
}: IconButtonProps) {
  const theme = useTheme();
  const box = theme.sizes.touchMin;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={4}
      testID={testID}
      style={({ pressed }) => [
        {
          width: box,
          height: box,
          borderRadius: theme.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: filled ? (pressed ? theme.colors.bgSunken : theme.colors.bgElevated) : pressed ? theme.colors.bgSunken : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}>
      <Icon name={icon} size={size ?? theme.sizes.iconMd} color={color} />
    </Pressable>
  );
}
