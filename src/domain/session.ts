import { z } from 'zod';

import { SessionStatus, SetType, SkipReason, SwapReason, WeightUnit } from './enums';
import { Explanation } from './explanation';
import { RepRange } from './exercise';

/** What the engine suggested for an exercise at session creation. Immutable history. */
export const TargetSnapshot = z.object({
  repRange: RepRange,
  targetRir: z.number(),
  restSeconds: z.number().int(),
  workingSets: z.number().int(),
  suggestedLoadKg: z.number().nullable(),
  suggestedReps: z.number().int().nullable(),
  explanation: Explanation,
});
export type TargetSnapshot = z.infer<typeof TargetSnapshot>;

export const SessionModifications = z.object({
  compressedToMinutes: z.number().int().nullable().default(null),
  swaps: z
    .array(
      z.object({
        fromExerciseId: z.string(),
        toExerciseId: z.string(),
        reason: SwapReason,
        scope: z.enum(['session', 'program']),
      }),
    )
    .default([]),
});
export type SessionModifications = z.infer<typeof SessionModifications>;

export const SessionSummary = z.object({
  totalWorkingSets: z.number().int(),
  totalVolumeKg: z.number(),
  durationSeconds: z.number().int(),
  prs: z.array(
    z.object({
      exerciseId: z.string(),
      exerciseName: z.string(),
      kind: z.enum(['load', 'reps_at_load', 'e1rm']),
      label: z.string(),
      e1rmKg: z.number().nullable(),
      deltaKg: z.number().nullable(),
    }),
  ),
});
export type SessionSummary = z.infer<typeof SessionSummary>;

export const Session = z.object({
  id: z.string(),
  userId: z.string(),
  programId: z.string().nullable(),
  programDayId: z.string().nullable(),
  name: z.string(),
  status: SessionStatus,
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  localDate: z.string(),
  /** True when this session was started out of the program's sequence. */
  outOfSequence: z.boolean(),
  modifications: SessionModifications,
  notes: z.string().nullable(),
  summary: SessionSummary.nullable(),
});
export type Session = z.infer<typeof Session>;

export const SessionExercise = z.object({
  id: z.string(),
  sessionId: z.string(),
  order: z.number().int().nonnegative(),
  exerciseId: z.string(),
  templateExerciseId: z.string().nullable(),
  substitutedFromExerciseId: z.string().nullable(),
  substitutionReason: SwapReason.nullable(),
  targetSnapshot: TargetSnapshot,
  skipped: z.boolean(),
  skipReason: SkipReason.nullable(),
  restSecondsOverride: z.number().int().nullable(),
  notes: z.string().nullable(),
});
export type SessionExercise = z.infer<typeof SessionExercise>;

export const PerformedSet = z.object({
  id: z.string(),
  sessionExerciseId: z.string(),
  order: z.number().int().nonnegative(),
  setType: SetType,
  /** Canonical load. Null for pure bodyweight. */
  loadKg: z.number().nullable(),
  enteredLoad: z.number().nullable(),
  enteredUnit: WeightUnit.nullable(),
  /** Weighted bodyweight adds; assisted stores a negative value. */
  addedLoadKg: z.number().nullable(),
  /** For unilateral exercises reps are per side by convention. */
  reps: z.number().int().nonnegative(),
  rir: z.number().nullable(),
  completedAt: z.string(),
  suggestedLoadKg: z.number().nullable(),
  suggestedReps: z.number().int().nullable(),
  e1rmKg: z.number().nullable(),
  e1rmFormula: z.string().nullable(),
  isPr: z.boolean(),
  notes: z.string().nullable(),
});
export type PerformedSet = z.infer<typeof PerformedSet>;
