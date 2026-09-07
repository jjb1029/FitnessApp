import { useRouter } from 'expo-router';
import { View } from 'react-native';

import type { Experience } from '@/domain';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Chip, Text, useTheme } from '@/ui';

import { OnboardingFrame } from './OnboardingFrame';
import { OptionRow } from './OptionRow';

const EXPERIENCE: { value: Experience; label: string; subtitle: string }[] = [
  { value: 'beginner', label: 'New to lifting', subtitle: 'Under a year of consistent training' },
  { value: 'intermediate', label: '1 to 4 years', subtitle: 'Comfortable with the main lifts' },
  { value: 'advanced', label: '4+ years', subtitle: 'Experienced and looking for structure' },
];
const DAYS = [2, 3, 4, 5, 6];
const MINUTES = [30, 45, 60, 75, 90];

export function ScheduleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { experience, daysPerWeek, sessionMinutes, set } = useOnboardingStore();

  return (
    <OnboardingFrame step={2} title="How much do you train?" primary={{ label: 'Continue', onPress: () => router.push('/onboarding/equipment') }}>
      <View style={{ gap: theme.spacing.sm }}>
        {EXPERIENCE.map((e) => (
          <OptionRow key={e.value} label={e.label} subtitle={e.subtitle} selected={experience === e.value} onPress={() => set({ experience: e.value })} />
        ))}
      </View>

      <Text variant="label" color="textSecondary" style={{ marginTop: theme.spacing.xxxl, marginBottom: theme.spacing.sm }}>
        DAYS A WEEK
      </Text>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        {DAYS.map((d) => (
          <Chip key={d} label={String(d)} selected={daysPerWeek === d} onPress={() => set({ daysPerWeek: d })} style={{ minWidth: 56, justifyContent: 'center' }} />
        ))}
      </View>

      <Text variant="label" color="textSecondary" style={{ marginTop: theme.spacing.xxl, marginBottom: theme.spacing.sm }}>
        TIME PER SESSION
      </Text>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        {MINUTES.map((m) => (
          <Chip key={m} label={`${m} min`} selected={sessionMinutes === m} onPress={() => set({ sessionMinutes: m })} />
        ))}
      </View>
    </OnboardingFrame>
  );
}
