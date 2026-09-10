import { StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type ToggleProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

export function Toggle({ label, description, value, onValueChange, disabled }: ToggleProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { minHeight: theme.sizes.controlLg, paddingVertical: theme.spacing.sm }]}>
      <View style={styles.text}>
        <Text>{label}</Text>
        {description ? (
          <Text variant="caption" color="textSecondary">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        // A switch is the user's own control, so it carries ink, not teal.
        trackColor={{ true: theme.colors.ink, false: theme.colors.border }}
        thumbColor={value ? theme.colors.inkText : theme.isDark ? theme.colors.text : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  text: { flex: 1, gap: 2 },
});
