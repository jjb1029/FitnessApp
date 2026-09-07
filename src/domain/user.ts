import { z } from 'zod';

import {
  EquipmentId,
  Experience,
  GoalType,
  IntensityScale,
  LengthUnit,
  PreferenceSentiment,
  Sex,
  SwapReason,
  ThemePreference,
  TrainingLocation,
  WeightUnit,
} from './enums';

export const UserSettings = z.object({
  unitWeight: WeightUnit,
  unitLength: LengthUnit,
  intensityScale: IntensityScale,
  theme: ThemePreference,
  restTimerAutoStart: z.boolean(),
  restTimerSound: z.boolean(),
  haptics: z.boolean(),
  keepAwakeDuringWorkout: z.boolean(),
  advancedMode: z.boolean(),
  crashReportingOptIn: z.boolean(),
});
export type UserSettings = z.infer<typeof UserSettings>;

export const defaultUserSettings = (unitWeight: WeightUnit): UserSettings => ({
  unitWeight,
  unitLength: unitWeight === 'lb' ? 'in' : 'cm',
  intensityScale: 'rir',
  theme: 'system',
  restTimerAutoStart: true,
  restTimerSound: true,
  haptics: true,
  keepAwakeDuringWorkout: true,
  advancedMode: false,
  crashReportingOptIn: false,
});

export const User = z.object({
  id: z.string(),
  authUserId: z.string().nullable(),
  settings: UserSettings,
  onboardingCompletedAt: z.string().nullable(),
});
export type User = z.infer<typeof User>;

export const Profile = z.object({
  userId: z.string(),
  birthYear: z.number().int().nullable(),
  sex: Sex,
  heightCm: z.number().nullable(),
  trainingExperience: Experience,
  daysPerWeek: z.number().int().min(1).max(7),
  sessionMinutes: z.number().int().positive(),
  trainingLocation: TrainingLocation,
  limitations: z.array(z.string()),
});
export type Profile = z.infer<typeof Profile>;

export const Goal = z.object({
  id: z.string(),
  userId: z.string(),
  type: GoalType,
  isCurrent: z.boolean(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
});
export type Goal = z.infer<typeof Goal>;

export const EquipmentAccess = z.object({
  userId: z.string(),
  equipmentId: EquipmentId,
  location: z.enum(['gym', 'home']),
  available: z.boolean(),
});
export type EquipmentAccess = z.infer<typeof EquipmentAccess>;

export const ExercisePreference = z.object({
  id: z.string(),
  userId: z.string(),
  exerciseId: z.string(),
  sentiment: PreferenceSentiment,
  reason: SwapReason.nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
});
export type ExercisePreference = z.infer<typeof ExercisePreference>;
