import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export type SectionHeaderProps = {
  title: string;
  action?: { label: string; onPress: () => void };
};

export function SectionHeader({ title, action }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { marginTop: theme.spacing.xxl, marginBottom: theme.spacing.sm }]}>
      <Text variant="label" color="textSecondary" style={styles.title}>
        {title.toUpperCase()}
      </Text>
      {action ? <Button variant="ghost" label={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  title: { flex: 1 },
});
