import { z } from 'zod';

import {
  Confidence,
  RecommendationSource,
  RecommendationStatus,
  RecommendationType,
} from './enums';
import { Explanation } from './explanation';

export const RecommendationScope = z.object({
  exerciseId: z.string().optional(),
  templateExerciseId: z.string().optional(),
  programDayId: z.string().optional(),
  programId: z.string().optional(),
  muscleId: z.string().optional(),
});
export type RecommendationScope = z.infer<typeof RecommendationScope>;

/** Concrete, typed change to apply. Validated by the engine before display. */
export const RecommendationPayload = z.discriminatedUnion('type', [
  z.object({ type: z.literal('load_target'), templateExerciseId: z.string(), loadKg: z.number() }),
  z.object({ type: z.literal('rep_target'), templateExerciseId: z.string(), reps: z.number().int() }),
  z.object({ type: z.literal('add_set'), templateExerciseId: z.string(), count: z.number().int().min(1).max(2) }),
  z.object({ type: z.literal('remove_set'), templateExerciseId: z.string(), count: z.number().int().min(1).max(2) }),
  z.object({
    type: z.literal('swap_exercise'),
    templateExerciseId: z.string(),
    toExerciseId: z.string(),
  }),
  z.object({ type: z.literal('deload'), programId: z.string(), setMultiplier: z.number(), rirDelta: z.number() }),
  z.object({ type: z.literal('reduce_volume'), muscleId: z.string(), setsPerWeek: z.number().int() }),
  z.object({ type: z.literal('increase_volume'), muscleId: z.string(), setsPerWeek: z.number().int() }),
  z.object({ type: z.literal('change_program'), templateId: z.string() }),
  z.object({ type: z.literal('restart_program'), programId: z.string() }),
  z.object({ type: z.literal('calorie_adjust'), deltaKcal: z.number().int() }),
  z.object({ type: z.literal('compress_session'), sessionId: z.string(), minutes: z.number().int() }),
  z.object({ type: z.literal('info') }),
]);
export type RecommendationPayload = z.infer<typeof RecommendationPayload>;

export const Recommendation = z.object({
  id: z.string(),
  userId: z.string(),
  type: RecommendationType,
  scope: RecommendationScope,
  title: z.string().min(1),
  summary: z.string().min(1),
  explanation: Explanation,
  payload: RecommendationPayload,
  source: RecommendationSource,
  confidence: Confidence,
  /** Higher wins when the pending cap is reached. */
  priority: z.number().int(),
  status: RecommendationStatus,
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
  expiresAt: z.string(),
});
export type Recommendation = z.infer<typeof Recommendation>;

export const MAX_PENDING_RECOMMENDATIONS = 3;
export const MAX_HOME_RECOMMENDATIONS = 1;
export const RECOMMENDATION_TTL_DAYS = 14;
