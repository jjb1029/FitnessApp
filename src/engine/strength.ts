/** Estimated one-rep max and personal records (docs/05 §3). */

export const E1RM_FORMULA = 'epley';
export const E1RM_MAX_REPS = 12;

/** Epley estimate, only meaningful for 1–12 reps with a real load. */
export function estimateOneRepMax(loadKg: number | null, reps: number): number | null {
  if (loadKg === null || loadKg <= 0 || reps <= 0 || reps > E1RM_MAX_REPS) return null;
  return Number((loadKg * (1 + reps / 30)).toFixed(3));
}

export type ExerciseBests = {
  bestE1rmKg: number | null;
  bestLoadKg: number | null;
  /** Best reps at the best load. */
  bestRepsAtBestLoad: number | null;
  /** True once at least one completed session contains this exercise. A first session sets baselines, not records. */
  hasHistory: boolean;
};

export type PrResult = {
  isPr: boolean;
  kinds: ('e1rm' | 'load')[];
  e1rmKg: number | null;
  e1rmDeltaKg: number | null;
};

/** Compares a working set to prior bests. Warm-ups never count. */
export function detectPr(loadKg: number | null, reps: number, bests: ExerciseBests): PrResult {
  const e1rmKg = estimateOneRepMax(loadKg, reps);
  const kinds: PrResult['kinds'] = [];
  if (e1rmKg !== null && (bests.bestE1rmKg === null || e1rmKg > bests.bestE1rmKg + 0.01)) kinds.push('e1rm');
  if (loadKg !== null && loadKg > 0 && (bests.bestLoadKg === null || loadKg > bests.bestLoadKg + 0.01)) kinds.push('load');
  // The first session for an exercise sets baselines, not records.
  const isBaseline = !bests.hasHistory || (bests.bestE1rmKg === null && bests.bestLoadKg === null);
  return {
    isPr: !isBaseline && kinds.length > 0,
    kinds: isBaseline ? [] : kinds,
    e1rmKg,
    e1rmDeltaKg: e1rmKg !== null && bests.bestE1rmKg !== null ? Number((e1rmKg - bests.bestE1rmKg).toFixed(3)) : null,
  };
}
