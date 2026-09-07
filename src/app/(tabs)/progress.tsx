import { EmptyState, Screen, Text } from '@/ui';

export default function ProgressTab() {
  return (
    <Screen>
      <Text variant="title1" style={{ marginTop: 16 }}>
        Progress
      </Text>
      <EmptyState title="Log a few sessions to see progress" message="Bodyweight, strength, and records show up here." icon="trending-up-outline" />
    </Screen>
  );
}
