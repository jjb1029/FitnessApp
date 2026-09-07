import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

export type StatusPillProps = {
  label: string;
  tone?: StatusTone;
  icon?: IconName;
};

const defaultIcons: Record<StatusTone, IconName> = {
  neutral: 'ellipse-outline',
  success: 'checkmark-circle',
  warning: 'alert-circle',
  danger: 'warning',
  accent: 'flash',
};

/** Status is never colour alone: every pill has an icon and text. */
export function StatusPill({ label, tone = 'neutral', icon }: StatusPillProps) {
  const theme = useTheme();
  const { colors } = theme;
  const palette = {
    neutral: { bg: colors.bgSunken, fg: colors.textSecondary },
    success: { bg: colors.successSubtle, fg: colors.success },
    warning: { bg: colors.warningSubtle, fg: colors.warning },
    danger: { bg: colors.dangerSubtle, fg: colors.danger },
    accent: { bg: colors.accentSubtle, fg: colors.accent },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg, borderRadius: theme.radius.full }]} accessible accessibilityLabel={label}>
      <Icon name={icon ?? defaultIcons[tone]} size={14} rawColor={palette.fg} />
      <Text variant="caption" style={{ color: palette.fg, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 26, alignSelf: 'flex-start' },
});
