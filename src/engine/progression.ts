import type { EvidenceRef, Exercise, Experience, Explanation, Factor, ProgressionScheme, RepRange, WeightUnit } from '@/domain';
import { daysBetween } from '@/lib/dates';
import { displayLoad, incrementStepInUnit, kgToUnit, roundToStep, trimNumber, unitToKg } from '@/lib/units';

import { buildExplanation, type RuleId } from './explanations';
import { layoffReductionPercent } from './scheduling';

/** One working set as the engine sees it. */
export type SetRecord = {
  loadKg: number | null;
  reps: number;
  rir: number | null;
  /** What the app prefilled for this set, to detect overrides. */
  suggestedLoadKg?: number | null;
};

/** One past session's working sets for an exercise, newest first in the history array. */
export type ExerciseExposure = {
  sessionId: string;
  localDate: string;
  endedAt: string;
  sets: SetRecord[];
};

export type ProgressionTemplate = {
  repRange: RepRange;
  targetRir: number;
  progressionScheme: ProgressionScheme;
  workingSets: number;
};

export type SuggestTargetsInput = {
  exercise: Exercise;
  template: ProgressionTemplate;
  /** Newest first, working sets only, up to ~6 exposures. */
  history: ExerciseExposure[];
  experience: Experience;
  unit: WeightUnit;
  today?: Date;
};

export type ProgressionFlag = 'reduce_load' | 'switch_to_double' | 'regress' | 'calibrated';

export type Targets = {
  ruleId: RuleId;
  /** Canonical load (or added load for bodyweight movements). Null means "choose a weight". */
  loadKg: number | null;
  reps: number;
  rir: number;
  explanation: Explanation;
  flags: ProgressionFlag[];
};

const RIR_COVERAGE_MIN = 0.7;
const CALIBRATE_STREAK = 3;

function formatLoad(kg: number | null, unit: WeightUnit, exercise: Exercise): string {
  if (kg === null) return 'BW';
  return `${trimNumber(displayLoad(kg, unit, exercise.incrementKg))}`;
}

function describeExposure(e: ExerciseExposure, unit: WeightUnit, exercise: Exercise): string {
  const loads = new Set(e.sets.map((s) => formatLoad(s.loadKg, unit, exercise)));
  const load = loads.size === 1 ? [...loads][0] : e.sets.map((s) => formatLoad(s.loadKg, unit, exercise)).join('/');
  const reps = e.sets.map((s) => s.reps).join(' · ');
  const rirs = e.sets.map((s) => s.rir).filter((r): r is number => r !== null);
  const rir = rirs.length === e.sets.length && rirs.length > 0 ? ` @ ${trimNumber(rirs.reduce((a, b) => a + b, 0) / rirs.length)} RIR` : '';
  return `${load} × ${reps}${rir}`;
}

function evidenceFor(exposures: ExerciseExposure[], unit: WeightUnit, exercise: Exercise): EvidenceRef[] {
  return exposures.slice(0, 2).flatMap((e) =>
    e.sets.map((s, i) => ({
      kind: 'set' as const,
      performedSetId: `${e.sessionId}:${i}`,
      date: e.localDate,
      label: `${formatLoad(s.loadKg, unit, exercise)} ${unit === 'kg' ? 'kg' : 'lb'} × ${s.reps}${s.rir !== null ? ` @ ${trimNumber(s.rir)} RIR` : ''}`,
    })),
  );
}

function stepKg(exercise: Exercise, unit: WeightUnit, multiplier = 1): number {
  const step = incrementStepInUnit(exercise.incrementKg, unit) * multiplier;
  return unitToKg(step, unit);
}

/** Round a kg load so it displays on the exercise's increment in the user's unit. */
function snap(kg: number, exercise: Exercise, unit: WeightUnit): number {
  const step = incrementStepInUnit(exercise.incrementKg, unit);
  return Number(unitToKg(roundToStep(kgToUnit(kg, unit), step), unit).toFixed(4));
}

/** The load the session was really done at: the most common working-set load, heaviest on a tie. */
export function primaryLoad(sets: SetRecord[]): number | null {
  const counts = new Map<number, number>();
  for (const s of sets) if (s.loadKg !== null) counts.set(s.loadKg, (counts.get(s.loadKg) ?? 0) + 1);
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]![0];
}

function rirCoverage(history: ExerciseExposure[]): number {
  const sets = history.slice(0, 3).flatMap((e) => e.sets);
  if (sets.length === 0) return 0;
  return sets.filter((s) => s.rir !== null).length / sets.length;
}

function averageRir(sets: SetRecord[]): number | null {
  const known = sets.map((s) => s.rir).filter((r): r is number => r !== null);
  if (known.length === 0) return null;
  return known.reduce((a, b) => a + b, 0) / known.length;
}

function overrideStreak(history: ExerciseExposure[]): 'up' | 'down' | null {
  const recent = history.slice(0, CALIBRATE_STREAK);
  if (recent.length < CALIBRATE_STREAK) return null;
  const dirs = recent.map((e) => {
    const s = e.sets[0];
    if (!s || s.suggestedLoadKg == null || s.loadKg == null) return 0;
    return s.loadKg > s.suggestedLoadKg + 0.01 ? 1 : s.loadKg < s.suggestedLoadKg - 0.01 ? -1 : 0;
  });
  if (dirs.every((d) => d === 1)) return 'up';
  if (dirs.every((d) => d === -1)) return 'down';
  return null;
}

/**
 * Next-session targets for one exercise (docs/05 §2). Deterministic and
 * explained. Works from the first session; never changes load by more than
 * two increments.
 */
export function suggestNextTargets(input: SuggestTargetsInput): Targets {
  const { exercise, template, history, unit } = input;
  const today = input.today ?? new Date();
  const range = template.repRange;
  const unitLabel = unit;
  const targetFactor: Factor = { label: 'Target', value: `${range.min}–${range.max} reps @ ${trimNumber(template.targetRir)} RIR` };
  const isBodyweight = exercise.loadType === 'bodyweight' || exercise.loadType === 'bodyweight_plus';
  const isAssisted = exercise.loadType === 'assisted';

  const last = history[0];
  if (!last || last.sets.length === 0) {
    return {
      ruleId: 'progression.seed',
      loadKg: isBodyweight ? 0 : null,
      reps: range.min,
      rir: template.targetRir,
      flags: [],
      explanation: buildExplanation({
        ruleId: 'progression.seed',
        confidence: 'medium',
        factors: [targetFactor],
        evidence: [{ kind: 'template', label: `${exercise.name}: ${template.workingSets} × ${range.min}–${range.max}` }],
        counterfactual: isBodyweight ? 'Reach the top of the range on every set and I will add weight.' : `Pick a weight you can do ${range.min} reps with about ${trimNumber(template.targetRir)} reps to spare. I will adjust from there.`,
      }),
    };
  }

  const lastFactor: Factor = { label: 'Last time', value: describeExposure(last, unit, exercise), unit: isBodyweight ? undefined : unitLabel };
  const evidence = evidenceFor(history, unit, exercise);
  const lastLoad = primaryLoad(last.sets) ?? (isBodyweight ? 0 : null);
  const allTop = last.sets.every((s) => s.reps >= range.max);
  const anyBelow = last.sets.some((s) => s.reps < range.min);
  const coverage = rirCoverage(history);
  const rirKnown = coverage >= RIR_COVERAGE_MIN;
  const avgRir = rirKnown ? averageRir(last.sets) : null;
  const streak = overrideStreak(history);
  const flags: ProgressionFlag[] = [];
  const overrideNote = streak === 'up' ? 'You have gone heavier than suggested three sessions running, so the jumps are larger now.' : streak === 'down' ? 'You chose lighter than suggested three sessions running, so I have kept the weight this time.' : undefined;
  if (streak) flags.push('calibrated');

  const build = (ruleId: RuleId, vars: Record<string, string | number> = {}, extra: { counterfactual?: string; confidence?: 'high' | 'medium' | 'low'; factors?: Factor[] } = {}) =>
    buildExplanation({
      ruleId,
      vars,
      confidence: extra.confidence ?? 'high',
      factors: extra.factors ?? [lastFactor, targetFactor],
      evidence,
      counterfactual: extra.counterfactual,
      overrideNote,
    });

  // Same-day repeat: do not progress twice in one day.
  const daysSince = daysBetween(last.endedAt, today);
  if (daysSince <= 0) {
    return { ruleId: 'progression.same_day', loadKg: lastLoad, reps: last.sets[0]?.reps ?? range.min, rir: template.targetRir, flags, explanation: build('progression.same_day') };
  }

  // Layoff.
  const layoffPercent = layoffReductionPercent(daysSince);
  if (layoffPercent > 0 && lastLoad !== null && lastLoad > 0 && !isAssisted) {
    const eased = snap(lastLoad * (1 - layoffPercent / 100), exercise, unit);
    return {
      ruleId: 'progression.layoff',
      loadKg: eased,
      reps: range.min,
      rir: template.targetRir,
      flags,
      explanation: build('progression.layoff', { days: daysSince, percent: layoffPercent }, { confidence: 'medium', counterfactual: 'Train this once at the eased load and the next target returns to normal progression.' }),
    };
  }

  // Bodyweight movements: reps first, then added load.
  if (isBodyweight) {
    const added = lastLoad ?? 0;
    if (allTop) {
      return { ruleId: 'progression.bodyweight.add_load', loadKg: snap(added + stepKg(exercise, unit), exercise, unit), reps: range.min, rir: template.targetRir, flags, explanation: build('progression.bodyweight.add_load', {}, { counterfactual: `If ${range.min} reps with the added weight is too hard, drop the weight and keep building reps.` }) };
    }
    if (anyBelow && added <= 0) {
      flags.push('regress');
      return { ruleId: 'progression.bodyweight.regress', loadKg: 0, reps: range.min, rir: template.targetRir, flags, explanation: build('progression.bodyweight.regress', {}, { confidence: 'medium', counterfactual: `Reach ${range.min} reps on every set and this stays in the program as is.` }) };
    }
    const nextReps = Math.min(range.max, (last.sets[0]?.reps ?? range.min) + 1);
    return { ruleId: 'progression.double.add_rep', loadKg: added, reps: nextReps, rir: template.targetRir, flags, explanation: build('progression.double.add_rep', {}, { counterfactual: `Hit ${range.max} on every set and I will add weight.` }) };
  }

  // Assisted movements: progress by reducing assistance.
  if (isAssisted) {
    const assist = lastLoad ?? 0; // negative or zero
    if (allTop) {
      return { ruleId: 'progression.assisted.reduce', loadKg: snap(Math.min(0, assist + stepKg(exercise, unit)), exercise, unit), reps: range.min, rir: template.targetRir, flags, explanation: build('progression.assisted.reduce') };
    }
    const nextReps = Math.min(range.max, (last.sets[0]?.reps ?? range.min) + 1);
    return { ruleId: 'progression.double.add_rep', loadKg: assist, reps: nextReps, rir: template.targetRir, flags, explanation: build('progression.double.add_rep') };
  }

  if (lastLoad === null) {
    return { ruleId: 'progression.seed', loadKg: null, reps: range.min, rir: template.targetRir, flags, explanation: build('progression.seed', {}, { confidence: 'medium' }) };
  }

  // Beginner linear progression on primary compounds.
  if (template.progressionScheme === 'linear_load') {
    const hitAll = last.sets.every((s) => s.reps >= range.min) && (avgRir === null || avgRir >= 1);
    if (hitAll) {
      return { ruleId: 'progression.linear.increase_load', loadKg: snap(lastLoad + stepKg(exercise, unit), exercise, unit), reps: range.min, rir: template.targetRir, flags, explanation: build('progression.linear.increase_load', {}, { counterfactual: `Miss ${range.min} reps twice in a row and this lift moves to adding reps before weight.` }) };
    }
    const prev = history[1];
    const prevMissed = prev ? prev.sets.some((s) => s.reps < range.min) : false;
    if (prevMissed) {
      flags.push('switch_to_double');
      return { ruleId: 'progression.linear.to_double', loadKg: lastLoad, reps: range.min, rir: template.targetRir, flags, explanation: build('progression.linear.to_double', {}, { confidence: 'medium' }) };
    }
    return { ruleId: 'progression.hold_after_miss', loadKg: lastLoad, reps: range.min, rir: template.targetRir, flags, explanation: build('progression.hold_after_miss', {}, { counterfactual: `Hit ${range.min} reps on every set and the weight goes up next time.` }) };
  }

  // Double progression.
  if (anyBelow) {
    const prev = history[1];
    const prevBelow = prev ? prev.sets.some((s) => s.reps < range.min) : false;
    if (prevBelow) {
      flags.push('reduce_load');
      const reduced = snap(lastLoad * 0.925, exercise, unit);
      return { ruleId: 'progression.reduce_load', loadKg: Math.min(reduced, lastLoad - stepKg(exercise, unit)), reps: range.min, rir: template.targetRir, flags, explanation: build('progression.reduce_load', {}, { confidence: 'medium', counterfactual: `Get ${range.min} reps on every set at the lighter weight and normal progression resumes.` }) };
    }
    return { ruleId: 'progression.hold_after_miss', loadKg: lastLoad, reps: range.min, rir: template.targetRir, flags, explanation: build('progression.hold_after_miss', {}, { counterfactual: `Reach ${range.min} reps on every set and we build from there. Miss again and I will ease the weight.` }) };
  }

  if (allTop) {
    if (streak === 'down') {
      return { ruleId: 'progression.calibrate', loadKg: lastLoad, reps: range.max, rir: template.targetRir, flags, explanation: build('progression.calibrate', {}, { confidence: 'medium' }) };
    }
    if (rirKnown && avgRir !== null && avgRir < Math.max(0.5, template.targetRir - 1)) {
      return { ruleId: 'progression.double.consolidate', loadKg: lastLoad, reps: range.max, rir: template.targetRir, flags, explanation: build('progression.double.consolidate', {}, { counterfactual: `Hit ${range.max} again with ${trimNumber(template.targetRir)} reps in reserve and the weight goes up.` }) };
    }
    const big = (rirKnown && avgRir !== null && avgRir >= template.targetRir + 2 && exercise.equipmentIds.includes('barbell')) || streak === 'up';
    const multiplier = big ? 2 : 1;
    const nextLoad = snap(lastLoad + stepKg(exercise, unit, multiplier), exercise, unit);
    const ruleId: RuleId = streak === 'up' ? 'progression.calibrate' : big ? 'progression.double.increase_load_large' : rirKnown ? 'progression.double.increase_load' : 'progression.double.increase_load_reps';
    const nextDisplay = `${trimNumber(displayLoad(nextLoad, unit, exercise.incrementKg))} ${unit}`;
    return {
      ruleId,
      loadKg: nextLoad,
      reps: range.min,
      rir: template.targetRir,
      flags,
      explanation: build(ruleId, { rir: avgRir !== null ? trimNumber(avgRir) : '' }, { counterfactual: `If ${range.min} reps at ${nextDisplay} is too hard, I will keep ${nextDisplay} and aim for the bottom of the range next time.` }),
    };
  }

  // Inside the range.
  const firstReps = last.sets[0]?.reps ?? range.min;
  if (rirKnown && avgRir !== null && avgRir < Math.max(0.5, template.targetRir - 1)) {
    return { ruleId: 'progression.double.hold_reps', loadKg: lastLoad, reps: firstReps, rir: template.targetRir, flags, explanation: build('progression.double.hold_reps', {}, { counterfactual: `Repeat ${firstReps} reps with ${trimNumber(template.targetRir)} in reserve and the next target is ${Math.min(range.max, firstReps + 1)}.` }) };
  }
  const nextReps = Math.min(range.max, firstReps + 1);
  return {
    ruleId: 'progression.double.add_rep',
    loadKg: lastLoad,
    reps: nextReps,
    rir: template.targetRir,
    flags,
    explanation: build(rirKnown ? 'progression.double.add_rep' : 'progression.reps_only', {}, {
      counterfactual: `Get ${range.max} reps on every set${rirKnown ? ` with about ${trimNumber(template.targetRir)} reps in reserve` : ''} and I will add weight.`,
    }),
  };
}

// ---------- Warm-ups ----------

export type WarmupSet = { loadKg: number; reps: number };

export type WarmupSuggestion = { sets: WarmupSet[]; explanation: Explanation } | null;

/** Two or three ramp-up sets for primary compounds (docs/05 §9c). */
export function suggestWarmups(exercise: Exercise, workingLoadKg: number | null, priority: number, unit: WeightUnit): WarmupSuggestion {
  if (priority !== 1 || exercise.category !== 'compound' || workingLoadKg === null) return null;
  const threshold = exercise.equipmentIds.includes('barbell') ? 40 : 30;
  if (workingLoadKg < threshold) return null;
  const ladder: [number, number][] = workingLoadKg >= 60 ? [[0.5, 8], [0.7, 5], [0.85, 2]] : [[0.5, 8], [0.7, 4]];
  const sets = ladder.map(([pct, reps]) => ({ loadKg: snap(workingLoadKg * pct, exercise, unit), reps }));
  const load = `${trimNumber(displayLoad(workingLoadKg, unit, exercise.incrementKg))} ${unit}`;
  return {
    sets,
    explanation: buildExplanation({
      ruleId: 'warmup.suggest',
      vars: { count: sets.length === 3 ? 'Three' : 'Two', load },
      factors: [{ label: 'Working load', value: load }],
      evidence: [{ kind: 'template', label: `${exercise.name} · primary movement` }],
    }),
  };
}
