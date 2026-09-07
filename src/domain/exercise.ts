import { z } from 'zod';

import {
  EquipmentCategory,
  EquipmentId,
  ExerciseCategory,
  Laterality,
  LoadType,
  MovementPattern,
  MuscleGroup,
  MuscleId,
} from './enums';

export const Muscle = z.object({
  id: MuscleId,
  name: z.string(),
  group: MuscleGroup,
  /** Advisory weekly working-set range used by the volume UI. Sourced from knowledge items. */
  weeklyRangeMin: z.number().int().nonnegative(),
  weeklyRangeMax: z.number().int().positive(),
});
export type Muscle = z.infer<typeof Muscle>;

export const Equipment = z.object({
  id: EquipmentId,
  name: z.string(),
  category: EquipmentCategory,
  /** Practical load increment in kg when this equipment sets the load. */
  defaultIncrementKg: z.number().positive(),
});
export type Equipment = z.infer<typeof Equipment>;

export const RepRange = z
  .object({ min: z.number().int().positive(), max: z.number().int().positive() })
  .refine((r) => r.max >= r.min, 'max must be >= min');
export type RepRange = z.infer<typeof RepRange>;

export const ExerciseMuscle = z.object({
  muscleId: MuscleId,
  role: z.enum(['primary', 'secondary']),
  /** Fraction of a set credited to this muscle for volume counting. Primary = 1. */
  contribution: z.number().min(0).max(1),
});
export type ExerciseMuscle = z.infer<typeof ExerciseMuscle>;

export const ExerciseInstructions = z.object({
  setup: z.array(z.string()),
  execution: z.array(z.string()),
  cues: z.array(z.string()),
  commonMistakes: z.array(z.string()),
});
export type ExerciseInstructions = z.infer<typeof ExerciseInstructions>;

/** Catalog exercise. `id` is a stable slug for seeded items and a UUID for custom ones. */
export const Exercise = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  movementPattern: MovementPattern,
  category: ExerciseCategory,
  /** Every listed equipment item is required (e.g. dumbbell + bench). */
  equipmentIds: z.array(EquipmentId),
  laterality: Laterality,
  loadType: LoadType,
  /** 1 = machine-stabilised, 5 = free and unstable. */
  stability: z.number().int().min(1).max(5),
  /** 1 = trivial technique, 5 = highly technical. */
  difficulty: z.number().int().min(1).max(5),
  /** 1 = low systemic fatigue per hard set, 5 = very high. */
  fatigueCost: z.number().int().min(1).max(5),
  repRangeDefault: RepRange,
  repRangeAllowed: RepRange,
  incrementKg: z.number().positive(),
  muscles: z.array(ExerciseMuscle).min(1),
  instructions: ExerciseInstructions,
  progressionNotes: z.string().optional(),
  regressionIds: z.array(z.string()),
  alternativeIds: z.array(z.string()),
  isCustom: z.boolean(),
  createdByUserId: z.string().nullable(),
  catalogVersion: z.number().int().nonnegative(),
});
export type Exercise = z.infer<typeof Exercise>;

/** Shape of an entry in the seed JSON. Defaults are applied by the seed validator. */
export const ExerciseSeed = Exercise.omit({ isCustom: true, createdByUserId: true, catalogVersion: true });
export type ExerciseSeed = z.infer<typeof ExerciseSeed>;
