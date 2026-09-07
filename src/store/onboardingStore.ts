import { create } from 'zustand';

import type { EquipmentId, Experience, GoalType, Sex, TrainingLocation } from '@/domain';
import type { ProgramRecommendation } from '@/engine';

/** Equipment chips shown in onboarding, mapped to catalog equipment ids. */
export const EQUIPMENT_CHIPS: { id: string; label: string; equipment: EquipmentId[] }[] = [
  { id: 'barbell', label: 'Barbell & rack', equipment: ['barbell', 'rack', 'ez_bar', 'trap_bar'] },
  { id: 'dumbbell', label: 'Dumbbells', equipment: ['dumbbell'] },
  { id: 'cable', label: 'Cables', equipment: ['cable'] },
  { id: 'machine', label: 'Machines', equipment: ['machine'] },
  { id: 'smith', label: 'Smith machine', equipment: ['smith'] },
  { id: 'bench', label: 'Bench', equipment: ['bench'] },
  { id: 'pullup', label: 'Pull-up / dip bars', equipment: ['pullup_bar', 'dip_station'] },
  { id: 'band', label: 'Resistance bands', equipment: ['band'] },
  { id: 'kettlebell', label: 'Kettlebells', equipment: ['kettlebell'] },
];
export const GYM_DEFAULT_CHIPS = ['barbell', 'dumbbell', 'cable', 'machine', 'smith', 'bench', 'pullup'];

export function chipsToEquipment(chipIds: ReadonlySet<string>): EquipmentId[] {
  const ids = new Set<EquipmentId>(['bodyweight']);
  for (const chip of EQUIPMENT_CHIPS) if (chipIds.has(chip.id)) for (const e of chip.equipment) ids.add(e);
  return [...ids];
}

type OnboardingState = {
  goal: GoalType | null;
  experience: Experience;
  daysPerWeek: number;
  sessionMinutes: number;
  location: TrainingLocation;
  equipmentChips: Set<string>;
  avoidExerciseIds: Set<string>;
  /** Template chosen from "See other options"; null means the engine's first pick. */
  chosenTemplateId: string | null;
  recommendation: ProgramRecommendation | null;
  bodyweight: number | null;
  birthYear: number | null;
  sex: Sex;
  heightCm: number | null;
  set: (patch: Partial<Omit<OnboardingState, 'set' | 'reset' | 'toggleChip' | 'toggleAvoid'>>) => void;
  toggleChip: (id: string) => void;
  toggleAvoid: (exerciseId: string) => void;
  reset: () => void;
};

const initial = {
  goal: null,
  experience: 'intermediate' as Experience,
  daysPerWeek: 4,
  sessionMinutes: 60,
  location: 'gym' as TrainingLocation,
  equipmentChips: new Set(GYM_DEFAULT_CHIPS),
  avoidExerciseIds: new Set<string>(),
  chosenTemplateId: null,
  recommendation: null,
  bodyweight: null,
  birthYear: null,
  sex: 'unspecified' as Sex,
  heightCm: null,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initial,
  set: (patch) => set(patch),
  toggleChip: (id) =>
    set((s) => {
      const next = new Set(s.equipmentChips);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { equipmentChips: next };
    }),
  toggleAvoid: (exerciseId) =>
    set((s) => {
      const next = new Set(s.avoidExerciseIds);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return { avoidExerciseIds: next };
    }),
  reset: () => set({ ...initial, equipmentChips: new Set(GYM_DEFAULT_CHIPS), avoidExerciseIds: new Set() }),
}));

export const GOAL_OPTIONS: { type: GoalType; label: string; subtitle: string; icon: string }[] = [
  { type: 'build_muscle', label: 'Build muscle', subtitle: 'Gain size and strength', icon: 'fitness-outline' },
  { type: 'lose_fat', label: 'Lose fat', subtitle: 'Get leaner while keeping muscle', icon: 'flame-outline' },
  { type: 'recomp', label: 'Build muscle and lose fat', subtitle: 'Recomposition, best for newer lifters', icon: 'swap-vertical-outline' },
  { type: 'get_stronger', label: 'Get stronger', subtitle: 'Lift heavier on the big movements', icon: 'barbell-outline' },
  { type: 'general_fitness', label: 'Improve general fitness', subtitle: 'Feel and move better', icon: 'heart-outline' },
  { type: 'maintain', label: 'Maintain', subtitle: 'Keep what you have built with less time', icon: 'shield-checkmark-outline' },
  { type: 'athletic_performance', label: 'Athletic performance', subtitle: 'Power and conditioning for sport', icon: 'speedometer-outline' },
];

export const GOAL_LABEL: Record<GoalType, string> = Object.fromEntries(GOAL_OPTIONS.map((g) => [g.type, g.label])) as Record<GoalType, string>;

/** Common movements people prefer to avoid, offered as chips for experienced lifters. */
export const AVOID_CHIPS: { exerciseId: string; label: string }[] = [
  { exerciseId: 'barbell_back_squat', label: 'Barbell back squat' },
  { exerciseId: 'conventional_deadlift', label: 'Deadlift' },
  { exerciseId: 'overhead_press', label: 'Overhead press' },
  { exerciseId: 'dip', label: 'Dips' },
  { exerciseId: 'pull_up', label: 'Pull-ups' },
  { exerciseId: 'walking_lunge', label: 'Lunges' },
  { exerciseId: 'bulgarian_split_squat', label: 'Split squats' },
  { exerciseId: 'leg_press', label: 'Leg press' },
  { exerciseId: 'barbell_bench_press', label: 'Barbell bench' },
  { exerciseId: 'hip_thrust', label: 'Hip thrust' },
  { exerciseId: 'face_pull', label: 'Face pulls' },
  { exerciseId: 'romanian_deadlift', label: 'Romanian deadlift' },
];
