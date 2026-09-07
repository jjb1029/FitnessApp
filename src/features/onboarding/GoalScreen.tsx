import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { GOAL_OPTIONS, useOnboardingStore } from '@/store/onboardingStore';
import { useTheme, type IconName } from '@/ui';

import { OnboardingFrame } from './OnboardingFrame';
import { OptionRow } from './OptionRow';

export function GoalScreen() {
  const theme = useTheme();
  const router = useRouter();
  const goal = useOnboardingStore((s) => s.goal);
  const set = useOnboardingStore((s) => s.set);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <OnboardingFrame step={1} title="What do you want to accomplish?" subtitle="One choice shapes everything. You can change it later." canGoBack={false}>
      <View style={{ gap: theme.spacing.sm }}>
        {GOAL_OPTIONS.map((option) => (
          <OptionRow
            key={option.type}
            label={option.label}
            subtitle={option.subtitle}
            icon={option.icon as IconName}
            selected={goal === option.type}
            onPress={() => {
              set({ goal: option.type });
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => router.push('/onboarding/schedule'), theme.reduceMotion ? 0 : 250);
            }}
          />
        ))}
      </View>
    </OnboardingFrame>
  );
}
