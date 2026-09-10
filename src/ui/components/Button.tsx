import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { primaryActionFill } from '../tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** `door` is Forma's "Why?" affordance and carries the teal; `ghost` is secondary navigation and does not. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'door' | 'destructive';
export type ButtonSize = 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const { colors } = theme;
  const height = size === 'lg' ? theme.sizes.controlLg : theme.sizes.controlMd;
  const isDisabled = disabled || loading;

  // The primary action is the user's, not Forma's, so it carries ink rather
  // than teal (docs/16 V3). `primaryActionFill` flips the whole app back.
  const primary =
    primaryActionFill === 'ink'
      ? { bg: colors.ink, bgPressed: colors.inkPressed, fg: colors.inkText, border: 'transparent' }
      : { bg: colors.accent, bgPressed: colors.accentPressed, fg: colors.textOnAccent, border: 'transparent' };

  const palette = {
    primary,
    secondary: { bg: colors.bgElevated, bgPressed: colors.bgSunken, fg: colors.text, border: colors.border },
    // Ghost buttons are secondary navigation ("Do later", "Skip"), not doors.
    ghost: { bg: 'transparent', bgPressed: colors.bgSunken, fg: colors.textSecondary, border: 'transparent' },
    door: { bg: 'transparent', bgPressed: colors.bgSunken, fg: colors.accent, border: 'transparent' },
    destructive: { bg: colors.dangerSubtle, bgPressed: colors.dangerSubtle, fg: colors.danger, border: 'transparent' },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      hitSlop={variant === 'ghost' || variant === 'door' ? 6 : undefined}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          minWidth: height,
          borderRadius: theme.radius.md,
          backgroundColor: pressed ? palette.bgPressed : palette.bg,
          borderColor: palette.border,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: variant === 'ghost' || variant === 'door' ? theme.spacing.sm : theme.spacing.xl,
          transform: [{ scale: pressed && !theme.reduceMotion && variant !== 'ghost' && variant !== 'door' ? 0.97 : 1 }],
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={theme.sizes.iconSm} rawColor={palette.fg} /> : null}
          <Text variant="headline" style={{ color: palette.fg }}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
