import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type EmptyStateProps = {
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  icon?: IconName;
};

/** One sentence and one action. No illustrations in Phase 1. */
export function EmptyState({ title, message, action, icon = 'leaf-outline' }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { padding: theme.spacing.xxxl, gap: theme.spacing.md }]}>
      <Icon name={icon} size={theme.sizes.iconLg} color="textTertiary" />
      <Text variant="headline" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="callout" color="textSecondary" align="center">
          {message}
        </Text>
      ) : null}
      {action ? <Button label={action.label} onPress={action.onPress} variant="secondary" style={{ marginTop: theme.spacing.sm }} /> : null}
    </View>
  );
}

export type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { padding: theme.spacing.xxxl, gap: theme.spacing.md }]} accessibilityRole="alert">
      <Icon name="alert-circle-outline" size={theme.sizes.iconLg} color="danger" />
      <Text variant="headline" align="center">
        {title}
      </Text>
      <Text variant="callout" color="textSecondary" align="center">
        {message}
      </Text>
      {onRetry ? <Button label="Try again" onPress={onRetry} variant="secondary" style={{ marginTop: theme.spacing.sm }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
