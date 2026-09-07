import { Pressable, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';

export type CardProps = ViewProps & {
  onPress?: () => void;
  padded?: boolean;
  /** Use the accent-tinted background (e.g. the Today card). */
  tone?: 'default' | 'accent';
  style?: StyleProp<ViewStyle>;
};

export function Card({ onPress, padded = true, tone = 'default', style, children, ...rest }: CardProps) {
  const theme = useTheme();
  const base: ViewStyle = {
    backgroundColor: tone === 'accent' ? theme.colors.accentSubtle : theme.colors.bgElevated,
    borderColor: tone === 'accent' ? 'transparent' : theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.lg,
    padding: padded ? theme.sizes.cardPadding : 0,
  };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [base, pressed && { backgroundColor: theme.colors.bgSunken }, style]}
        {...rest}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  );
}
