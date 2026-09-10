import type { PerformedSetRow } from '@/data/schema';
import type { Exercise, IntensityScale, WeightUnit } from '@/domain';
import { displayLoad, trimNumber } from '@/lib/units';

export function isBodyweightExercise(exercise: Exercise): boolean {
  return exercise.loadType === 'bodyweight' || exercise.loadType === 'bodyweight_plus';
}

/** "80 lb", "BW", "BW +10 lb", "−20 lb assist" */
export function formatSetLoad(exercise: Exercise, loadKg: number | null, addedLoadKg: number | null, unit: WeightUnit): string {
  if (isBodyweightExercise(exercise)) {
    const added = addedLoadKg ?? 0;
    return added > 0 ? `BW +${trimNumber(displayLoad(added, unit, exercise.incrementKg))} ${unit}` : 'BW';
  }
  if (exercise.loadType === 'assisted') {
    const assist = Math.abs(addedLoadKg ?? loadKg ?? 0);
    return assist > 0 ? `−${trimNumber(displayLoad(assist, unit, exercise.incrementKg))} ${unit} assist` : 'unassisted';
  }
  if (loadKg === null) return '—';
  return `${trimNumber(displayLoad(loadKg, unit, exercise.incrementKg))} ${unit}`;
}

/**
 * The same load, split so the number and its unit can be set separately
 * (docs/16 V2). `text` is for loads that are not a measurement — "BW",
 * "unassisted", or nothing logged.
 */
export type LoadParts = { value: string; unit: string | null } | { text: string };

export function setLoadParts(exercise: Exercise, loadKg: number | null, addedLoadKg: number | null, unit: WeightUnit): LoadParts {
  if (isBodyweightExercise(exercise)) {
    const added = addedLoadKg ?? 0;
    return added > 0 ? { value: `BW +${trimNumber(displayLoad(added, unit, exercise.incrementKg))}`, unit } : { text: 'BW' };
  }
  if (exercise.loadType === 'assisted') {
    const assist = Math.abs(addedLoadKg ?? loadKg ?? 0);
    return assist > 0 ? { value: `−${trimNumber(displayLoad(assist, unit, exercise.incrementKg))}`, unit: `${unit} assist` } : { text: 'unassisted' };
  }
  if (loadKg === null) return { text: '—' };
  return { value: trimNumber(displayLoad(loadKg, unit, exercise.incrementKg)), unit };
}

export function formatSetRow(exercise: Exercise, set: PerformedSetRow, unit: WeightUnit, scale: IntensityScale): string {
  const load = formatSetLoad(exercise, set.loadKg, set.addedLoadKg, unit);
  const effort = set.rir === null ? '' : ` · ${formatEffort(set.rir, scale)}`;
  return `${load} × ${set.reps}${exercise.laterality === 'unilateral' ? '/side' : ''}${effort}`;
}

export function formatEffort(rir: number, scale: IntensityScale): string {
  if (scale === 'rpe') return `RPE ${trimNumber(10 - rir)}`;
  return `${trimNumber(rir)} RIR`;
}

export function effortLabel(scale: IntensityScale): string {
  return scale === 'rpe' ? 'RPE' : 'RIR';
}

export function effortValue(rir: number, scale: IntensityScale): string {
  return scale === 'rpe' ? trimNumber(10 - rir) : trimNumber(rir);
}
