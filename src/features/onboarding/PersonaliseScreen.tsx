import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { commitOnboarding, updateUserSettings } from '@/data/repositories';
import type { Sex, WeightUnit } from '@/domain';
import { useUiStore } from '@/store/uiStore';
import { AVOID_CHIPS, chipsToEquipment, useOnboardingStore } from '@/store/onboardingStore';
import { Chip, Text, TextField, useTheme, useToast } from '@/ui';
import { unitToCm, unitToKg } from '@/lib/units';

import { useCurrentUser } from '../app/UserProvider';
import { OnboardingFrame } from './OnboardingFrame';

const SEX: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unspecified', label: 'Prefer not to say' },
];

export function PersonaliseScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { user, refresh } = useCurrentUser();
  const draft = useOnboardingStore();
  const unitWeight = useUiStore((s) => s.unitWeight);
  const [unit, setUnit] = useState<WeightUnit>(unitWeight);
  const [weightText, setWeightText] = useState('');
  const [yearText, setYearText] = useState('');
  const [heightText, setHeightText] = useState('');
  const [sex, setSex] = useState<Sex>('unspecified');
  const [saving, setSaving] = useState(false);
  const showAvoid = draft.experience !== 'beginner';

  const commit = async (includeDetails: boolean) => {
    if (!draft.goal || !draft.recommendation) {
      router.replace('/onboarding/goal');
      return;
    }
    setSaving(true);
    try {
      const weight = includeDetails ? Number(weightText) : NaN;
      const year = includeDetails ? Number(yearText) : NaN;
      const height = includeDetails ? Number(heightText) : NaN;
      if (unit !== unitWeight) await updateUserSettings(user.id, { unitWeight: unit, unitLength: unit === 'lb' ? 'in' : 'cm' });
      await commitOnboarding({
        userId: user.id,
        goal: draft.goal,
        experience: draft.experience,
        daysPerWeek: draft.daysPerWeek,
        sessionMinutes: draft.sessionMinutes,
        location: draft.location,
        equipment: chipsToEquipment(draft.equipmentChips),
        avoidExerciseIds: includeDetails ? [...draft.avoidExerciseIds] : [],
        recommendation: draft.recommendation,
        bodyweightKg: Number.isFinite(weight) && weight > 0 ? unitToKg(weight, unit) : null,
        birthYear: Number.isInteger(year) && year > 1900 && year < 2030 ? year : null,
        sex: includeDetails ? sex : 'unspecified',
        heightCm: Number.isFinite(height) && height > 0 ? unitToCm(height, unit === 'lb' ? 'in' : 'cm') : null,
      });
      draft.reset();
      refresh();
      router.replace('/');
    } catch (e) {
      toast.show({ message: e instanceof Error ? e.message : 'Could not save. Try again.' });
      setSaving(false);
    }
  };

  return (
    <OnboardingFrame
      step={5}
      title="A couple of details to personalise"
      subtitle="Only you see these. Everything here can be changed in settings."
      primary={{ label: 'Done', onPress: () => commit(true), loading: saving }}
      secondary={{ label: 'Skip for now', onPress: () => commit(false) }}>
      <View style={{ gap: theme.spacing.xxl }}>
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <TextField label="Bodyweight" placeholder={unit === 'lb' ? '180' : '82'} keyboardType="decimal-pad" value={weightText} onChangeText={setWeightText} suffix={unit} />
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing.xs, paddingBottom: 2 }}>
              <Chip label="lb" selected={unit === 'lb'} onPress={() => setUnit('lb')} />
              <Chip label="kg" selected={unit === 'kg'} onPress={() => setUnit('kg')} />
            </View>
          </View>
          <Text variant="caption" color="textTertiary">
            Used for your weight trend and bodyweight exercises.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <TextField label="Birth year" placeholder="1995" keyboardType="number-pad" value={yearText} onChangeText={setYearText} hint="Optional" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Height" placeholder={unit === 'lb' ? '70' : '178'} keyboardType="decimal-pad" value={heightText} onChangeText={setHeightText} suffix={unit === 'lb' ? 'in' : 'cm'} hint="Optional" />
          </View>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="label" color="textSecondary">
            SEX
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            {SEX.map((s) => (
              <Chip key={s.value} label={s.label} selected={sex === s.value} onPress={() => setSex(s.value)} />
            ))}
          </View>
        </View>

        {showAvoid ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="label" color="textSecondary">
              {"ANYTHING YOU'D RATHER AVOID?"}
            </Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              {AVOID_CHIPS.map((c) => (
                <Chip key={c.exerciseId} label={c.label} selected={draft.avoidExerciseIds.has(c.exerciseId)} onPress={() => draft.toggleAvoid(c.exerciseId)} />
              ))}
            </View>
            <Text variant="caption" color="textTertiary">
              Avoided movements are swapped for the closest alternative, with a reason.
            </Text>
          </View>
        ) : null}
      </View>
    </OnboardingFrame>
  );
}
