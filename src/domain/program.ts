import { z } from 'zod';

import { GoalType, MuscleId, ProgressionScheme, SchedulingMode, SetType, Split } from './enums';
import { Explanation } from './explanation';
import { RepRange } from './exercise';

export const TemplateSet = z.object({
  id: z.string(),
  templateExerciseId: z.string(),
  order: z.number().int().nonnegative(),
  setType: SetType,
  repRangeOverride: RepRange.nullable(),
  targetRirOverride: z.number().nullable(),
});
export type TemplateSet = z.infer<typeof TemplateSet>;

export const TemplateExercise = z.object({
  id: z.string(),
  programDayId: z.string(),
  order: z.number().int().nonnegative(),
  exerciseId: z.string(),
  /** 1 = primary movement, 2 = secondary, 3 = accessory. Drives compression and warm-ups. */
  priority: z.number().int().min(1).max(3),
  repRange: RepRange,
  targetRir: z.number().min(0).max(5),
  restSeconds: z.number().int().positive(),
  progressionScheme: ProgressionScheme,
  notes: z.string().nullable(),
  supersetGroup: z.string().nullable(),
  workingSets: z.number().int().min(1).max(10),
});
export type TemplateExercise = z.infer<typeof TemplateExercise>;

export const ProgramDay = z.object({
  id: z.string(),
  programId: z.string(),
  order: z.number().int().nonnegative(),
  name: z.string().min(1),
  focusMuscleIds: z.array(MuscleId),
  estimatedMinutes: z.number().int().positive(),
  isRest: z.boolean(),
});
export type ProgramDay = z.infer<typeof ProgramDay>;

export const Program = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1),
  templateId: z.string().nullable(),
  split: Split,
  daysPerWeek: z.number().int().min(1).max(7),
  goalType: GoalType,
  description: z.string(),
  rationale: z.string(),
  explanation: Explanation.nullable(),
  isActive: z.boolean(),
  startedAt: z.string().nullable(),
  schedulingMode: SchedulingMode,
  weekdayMap: z.record(z.string(), z.number().int().min(0).max(6)).nullable(),
  nextDayIndex: z.number().int().nonnegative(),
  deloadEveryWeeks: z.number().int().positive().nullable(),
});
export type Program = z.infer<typeof Program>;

// ---------- Catalog templates (seeded, immutable) ----------

export const TemplateExerciseSeed = z.object({
  exerciseId: z.string(),
  priority: z.number().int().min(1).max(3),
  sets: z.number().int().min(1).max(10),
  repRange: RepRange,
  targetRir: z.number().min(0).max(5),
  restSeconds: z.number().int().positive(),
  progressionScheme: ProgressionScheme.default('double_progression'),
  supersetGroup: z.string().nullable().default(null),
});
export type TemplateExerciseSeed = z.infer<typeof TemplateExerciseSeed>;

export const ProgramDaySeed = z.object({
  name: z.string().min(1),
  focusMuscleIds: z.array(MuscleId),
  exercises: z.array(TemplateExerciseSeed).min(1),
});
export type ProgramDaySeed = z.infer<typeof ProgramDaySeed>;

export const ProgramTemplate = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  split: Split,
  daysPerWeek: z.number().int().min(1).max(7),
  /** Which goals this template suits, in preference order. */
  goalTypes: z.array(GoalType).min(1),
  /** Which experience levels this template suits. */
  experienceLevels: z.array(z.enum(['beginner', 'intermediate', 'advanced'])).min(1),
  sessionMinutes: z.number().int().positive(),
  description: z.string(),
  intent: z.string(),
  deloadEveryWeeks: z.number().int().positive().nullable(),
  days: z.array(ProgramDaySeed).min(1),
  catalogVersion: z.number().int().nonnegative().default(1),
});
export type ProgramTemplate = z.infer<typeof ProgramTemplate>;
