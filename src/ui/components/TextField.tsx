import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type TextFieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  suffix?: string;
};

export function TextField({ label, hint, error, suffix, style, ...rest }: TextFieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" color="textSecondary">
          {label.toUpperCase()}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            height: theme.sizes.controlLg,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.bgSunken,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            paddingHorizontal: theme.spacing.lg,
          },
        ]}>
        <TextInput
          placeholderTextColor={theme.colors.textTertiary}
          accessibilityLabel={label}
          {...rest}
          style={[theme.typography.body, { color: theme.colors.text, flex: 1, paddingVertical: 0 }, style]}
        />
        {suffix ? (
          <Text variant="callout" color="textSecondary">
            {suffix}
          </Text>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textTertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, gap: 8 },
});
