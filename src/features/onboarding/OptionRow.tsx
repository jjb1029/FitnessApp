import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text, useTheme, type IconName } from '@/ui';

export type OptionRowProps = {
  label: string;
  subtitle?: string;
  icon?: IconName;
  selected?: boolean;
  onPress: () => void;
};

/** Large single-choice row for onboarding questions. */
export function OptionRow({ label, subtitle, icon, selected = false, onPress }: OptionRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={subtitle ? `${label}, ${subtitle}` : label}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: 68,
          borderRadius: theme.radius.lg,
          paddingHorizontal: theme.spacing.lg,
          backgroundColor: selected ? theme.colors.bgSunken : pressed ? theme.colors.bgSunken : theme.colors.bgElevated,
          borderColor: selected ? theme.colors.text : theme.colors.border,
        },
      ]}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: selected ? theme.colors.ink : theme.colors.bgSunken, borderRadius: theme.radius.md }]}>
          <Icon name={icon} size={20} rawColor={selected ? theme.colors.inkText : theme.colors.textSecondary} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text variant="headline">{label}</Text>
        {subtitle ? (
          <Text variant="callout" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {selected ? <Icon name="checkmark-circle" color="text" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  iconWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
