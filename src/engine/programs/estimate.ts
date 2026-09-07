/** Session duration estimate and the trimming rules (docs/05 §8, §9). */

export const SET_SECONDS = 45;
export const TRANSITION_SECONDS = 60;
export const MIN_ISOLATION_REST_SECONDS = 60;

export type DurationExercise = {
  sets: number;
  restSeconds: number;
  /** 1 primary, 2 secondary, 3 accessory. */
  priority: number;
};

export function estimateMinutes(exercises: DurationExercise[]): number {
  const seconds = exercises.reduce((acc, e) => acc + e.sets * (SET_SECONDS + e.restSeconds), 0) + exercises.length * TRANSITION_SECONDS;
  return Math.round(seconds / 60);
}

export type TrimChange =
  | { kind: 'remove_set'; index: number }
  | { kind: 'shorten_rest'; index: number; from: number; to: number }
  | { kind: 'remove_exercise'; index: number };

export type TrimResult<T extends DurationExercise> = {
  exercises: T[];
  changes: TrimChange[];
  minutes: number;
};

/**
 * Reduce a day until it fits the available minutes, cheapest changes first.
 * Priority-1 exercises are never removed. Indices in `changes` refer to the
 * original array. Returns the original list unchanged when it already fits.
 */
export function trimToMinutes<T extends DurationExercise>(original: T[], targetMinutes: number): TrimResult<T> {
  const items: { e: T; index: number; removed: boolean }[] = original.map((e, index) => ({ e: { ...e }, index, removed: false }));
  const changes: TrimChange[] = [];
  const live = (): T[] => items.filter((i) => !i.removed).map((i) => i.e);
  const fits = () => estimateMinutes(live()) <= targetMinutes;

  const pickMostSets = (priority: number) =>
    items.filter((i) => !i.removed && i.e.priority === priority && i.e.sets > 1).sort((a, b) => b.e.sets - a.e.sets)[0];

  let guard = 0;
  while (!fits() && guard++ < 100) {
    // 1. Drop sets from accessories (keep at least one).
    const acc = pickMostSets(3);
    if (acc) {
      acc.e.sets -= 1;
      changes.push({ kind: 'remove_set', index: acc.index });
      continue;
    }
    // 2. Shorten accessory rest to the floor.
    const longRest = items.find((i) => !i.removed && i.e.priority === 3 && i.e.restSeconds > MIN_ISOLATION_REST_SECONDS);
    if (longRest) {
      changes.push({ kind: 'shorten_rest', index: longRest.index, from: longRest.e.restSeconds, to: MIN_ISOLATION_REST_SECONDS });
      longRest.e.restSeconds = MIN_ISOLATION_REST_SECONDS;
      continue;
    }
    // 3. Remove accessories entirely, last first.
    const lastAcc = [...items].reverse().find((i) => !i.removed && i.e.priority === 3);
    if (lastAcc) {
      lastAcc.removed = true;
      changes.push({ kind: 'remove_exercise', index: lastAcc.index });
      continue;
    }
    // 4. Drop sets from secondary movements.
    const sec = pickMostSets(2);
    if (sec) {
      sec.e.sets -= 1;
      changes.push({ kind: 'remove_set', index: sec.index });
      continue;
    }
    // 5. Never touch priority 1. Stop.
    break;
  }

  const exercises = live();
  return { exercises, changes, minutes: estimateMinutes(exercises) };
}
