/**
 * What actually changed in a session (docs/15 §8 item 4). The finish screen
 * leads with a verdict and then shows the evidence for it, per lift, in the
 * user's own numbers. Pure derivation over sets that were already logged.
 */

import { primaryLoad, type SetRecord } from './progression';

export type Highlight =
  | { kind: 'pr'; exerciseName: string; e1rmKg: number | null }
  | { kind: 'load'; exerciseName: string; deltaKg: number; loadKg: number }
  | { kind: 'reps'; exerciseName: string; deltaReps: number; loadKg: number | null };

export type HighlightInput = {
  exerciseName: string;
  /** This session's working sets. */
  sets: SetRecord[];
  /** The previous session's working sets for the same exercise. */
  previous: SetRecord[];
  isPr: boolean;
  prE1rmKg: number | null;
};

function totalReps(sets: SetRecord[]): number {
  return sets.reduce((a, s) => a + s.reps, 0);
}

/**
 * One highlight per exercise at most, strongest first: a record, then a
 * heavier load, then more reps at the same load. Exercises with nothing to
 * report are left out rather than padded.
 */
export function sessionHighlights(items: HighlightInput[], limit = 4): Highlight[] {
  const prs: Highlight[] = [];
  const loads: Highlight[] = [];
  const reps: Highlight[] = [];

  for (const item of items) {
    if (item.sets.length === 0) continue;
    if (item.isPr) {
      prs.push({ kind: 'pr', exerciseName: item.exerciseName, e1rmKg: item.prE1rmKg });
      continue;
    }
    if (item.previous.length === 0) continue;
    const load = primaryLoad(item.sets);
    const prevLoad = primaryLoad(item.previous);
    if (load !== null && prevLoad !== null && load > prevLoad + 0.01) {
      loads.push({ kind: 'load', exerciseName: item.exerciseName, deltaKg: Number((load - prevLoad).toFixed(3)), loadKg: load });
      continue;
    }
    const sameLoad = load !== null && prevLoad !== null && Math.abs(load - prevLoad) <= 0.01;
    const bodyweight = load === null && prevLoad === null;
    const delta = totalReps(item.sets) - totalReps(item.previous);
    if ((sameLoad || bodyweight) && delta > 0 && item.sets.length === item.previous.length) {
      reps.push({ kind: 'reps', exerciseName: item.exerciseName, deltaReps: delta, loadKg: load });
    }
  }

  return [...prs, ...loads, ...reps].slice(0, limit);
}
