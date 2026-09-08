import { useLocalSearchParams } from 'expo-router';

import { WorkoutScreen } from '@/features/workout/WorkoutScreen';

export default function WorkoutRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  return <WorkoutScreen sessionId={String(sessionId)} />;
}
