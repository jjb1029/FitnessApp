import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { TrainingLocation } from '@/domain';
import { EQUIPMENT_CHIPS, GYM_DEFAULT_CHIPS, useOnboardingStore } from '@/store/onboardingStore';
import { Chip, Text, useTheme } from '@/ui';

import { OnboardingFrame } from './OnboardingFrame';

const LOCATIONS: { value: TrainingLocation; label: string }[] = [
  { value: 'gym', label: 'Gym' },
  { value: 'home', label: 'Home' },
  { value: 'both', label: 'Both' },
];

export function EquipmentScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { location, equipmentChips, set, toggleChip } = useOnboardingStore();
  const bodyweightOnly = equipmentChips.size === 0;

  const chooseLocation = (value: TrainingLocation) => {
    set({ location: value, equipmentChips: new Set(value === 'home' ? [] : GYM_DEFAULT_CHIPS) });
  };

  return (
    <OnboardingFrame step={3} title="Where will you train?" subtitle="Pick what you have access to. Swaps are easy later." primary={{ label: 'Continue', onPress: () => router.push('/onboarding/recommendation') }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {LOCATIONS.map((l) => (
          <Chip key={l.value} label={l.label} selected={location === l.value} onPress={() => chooseLocation(l.value)} style={{ flex: 1, justifyContent: 'center' }} />
        ))}
      </View>

      <Text variant="label" color="textSecondary" style={{ marginTop: theme.spacing.xxxl, marginBottom: theme.spacing.sm }}>
        EQUIPMENT
      </Text>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        {EQUIPMENT_CHIPS.map((chip) => (
          <Chip key={chip.id} label={chip.label} selected={equipmentChips.has(chip.id)} onPress={() => toggleChip(chip.id)} />
        ))}
        <Chip label="Bodyweight only" selected={bodyweightOnly} onPress={() => set({ equipmentChips: new Set() })} />
      </View>

      <Pressable onPress={() => set({ equipmentChips: new Set(GYM_DEFAULT_CHIPS) })} accessibilityRole="button" style={{ marginTop: theme.spacing.xl, minHeight: 44, justifyContent: 'center' }}>
        <Text variant="callout" color="accent">
          Not sure? Use a typical gym setup
        </Text>
      </Pressable>
    </OnboardingFrame>
  );
}
