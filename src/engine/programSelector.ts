import type { EquipmentId, Exercise, Experience, Explanation, GoalType, MuscleId, ProgramTemplate, TemplateExerciseSeed } from '@/domain';

import { buildExplanation } from './explanations';
import { trimToMinutes, type TrimChange } from './programs/estimate';
import { isEquipmentAvailable, rankSubstitutes } from './substitution';

export type SelectProgramInput = {
  experience: Experience;
  daysPerWeek: number;
  sessionMinutes: number;
  goal: GoalType;
  availableEquipment: ReadonlySet<EquipmentId>;
  avoidIds?: ReadonlySet<string>;
  templates: ProgramTemplate[];
  exercises: ReadonlyMap<string, Exercise>;
};

export type ResolvedExercise = TemplateExerciseSeed & {
  exercise: Exercise;
  swappedFrom?: Exercise;
  swapExplanation?: Explanation;
};

export type ResolvedDay = {
  name: string;
  focusMuscleIds: MuscleId[];
  exercises: ResolvedExercise[];
  estimatedMinutes: number;
  trim: TrimChange[];
  /** Template exercises with no available substitute, dropped from the day. */
  dropped: Exercise[];
};

export type ProgramRecommendation = {
  template: ProgramTemplate;
  days: ResolvedDay[];
  explanation: Explanation;
  alternatives: { template: ProgramTemplate; explanation: Explanation }[];
};

type Scored = { template: ProgramTemplate; score: number; daysDiff: number; experienceMatch: boolean; goalIndex: number };

function scoreTemplate(t: ProgramTemplate, input: SelectProgramInput): Scored {
  const daysDiff = Math.abs(t.daysPerWeek - input.daysPerWeek);
  const experienceMatch = t.experienceLevels.includes(input.experience);
  const goalIndex = t.goalTypes.indexOf(input.goal);
  let score = -daysDiff * 10;
  if (t.daysPerWeek <= input.daysPerWeek) score += 5; // prefer fewer days over more
  score += experienceMatch ? 20 : -15;
  score += goalIndex >= 0 ? 10 - goalIndex : -20;
  return { template: t, score, daysDiff, experienceMatch, goalIndex };
}

function alternativeReason(s: Scored, input: SelectProgramInput): string {
  if (s.daysDiff > 0 && s.template.daysPerWeek > input.daysPerWeek) {
    const n = s.template.daysPerWeek - input.daysPerWeek;
    return `it needs ${n} more training ${n === 1 ? 'day' : 'days'} a week than you planned`;
  }
  if (s.daysDiff > 0) return 'it uses fewer training days than you want';
  if (!s.experienceMatch) return input.experience === 'beginner' ? 'it is built for more experienced lifters' : 'it is built for newer lifters';
  return 'it fits your goal a little less well';
}

/** Goal-specific adjustments applied to template exercises (docs/05 §9). */
function applyGoal(ex: ResolvedExercise, goal: GoalType): ResolvedExercise {
  if (goal === 'get_stronger' && ex.priority === 1 && ex.exercise.category === 'compound') {
    const min = Math.max(ex.exercise.repRangeAllowed.min, 4);
    const max = Math.min(ex.exercise.repRangeAllowed.max, Math.max(6, min + 2));
    return { ...ex, repRange: { min, max }, restSeconds: Math.max(ex.restSeconds, 180) };
  }
  if (goal === 'general_fitness' && ex.priority >= 2 && ex.sets > 2) {
    return { ...ex, sets: ex.sets - 1 };
  }
  return ex;
}

/**
 * Choose a program template and resolve it against the user's equipment,
 * preferences, and session length. Deterministic; every decision explained.
 */
export function selectProgram(input: SelectProgramInput): ProgramRecommendation {
  if (input.templates.length === 0) throw new Error('No program templates available');
  const scored = input.templates.map((t) => scoreTemplate(t, input)).sort((a, b) => b.score - a.score);
  const best = scored[0]!;
  const template = best.template;

  const days = template.days.map((day) => resolveDay(day.name, day.focusMuscleIds, day.exercises, input));

  const isBeginnerTemplate = template.experienceLevels.length === 1 && template.experienceLevels[0] === 'beginner';
  const explanation = buildExplanation({
    ruleId: isBeginnerTemplate ? 'program.select.beginner' : 'program.select',
    vars: { days: template.daysPerWeek },
    confidence: best.daysDiff === 0 && best.experienceMatch ? 'high' : 'medium',
    factors: [
      { label: 'Training days', value: `${input.daysPerWeek} a week` },
      { label: 'Experience', value: input.experience === 'beginner' ? 'under a year' : input.experience === 'intermediate' ? '1–4 years' : '4+ years' },
      { label: 'Session length', value: `${input.sessionMinutes} min` },
    ],
    evidence: [{ kind: 'profile', label: `Goal: ${input.goal.replace(/_/g, ' ')}` }],
    counterfactual: best.daysDiff > 0 ? `If you can train ${template.daysPerWeek} days a week, this program fits exactly.` : `If your schedule changes, a different split will be recommended.`,
    alternatives: scored.slice(1, 3).map((s) => ({ label: s.template.name, reason: alternativeReason(s, input) })),
  });

  const alternatives = scored.slice(1, 3).map((s) => ({
    template: s.template,
    explanation: buildExplanation({
      ruleId: 'program.select.alternative',
      vars: { reason: alternativeReason(s, input) },
      confidence: 'medium',
      factors: [{ label: 'Training days', value: `${s.template.daysPerWeek} a week` }],
    }),
  }));

  return { template, days, explanation, alternatives };
}

export function resolveDay(name: string, focusMuscleIds: MuscleId[], seeds: TemplateExerciseSeed[], input: SelectProgramInput): ResolvedDay {
  const candidates = [...input.exercises.values()];
  const dropped: Exercise[] = [];
  const resolved: ResolvedExercise[] = [];

  for (const seed of seeds) {
    const exercise = input.exercises.get(seed.exerciseId);
    if (!exercise) continue;
    const avoided = input.avoidIds?.has(exercise.id) ?? false;
    const unavailable = !isEquipmentAvailable(exercise, input.availableEquipment);
    if (!avoided && !unavailable) {
      resolved.push(applyGoal({ ...seed, exercise }, input.goal));
      continue;
    }
    const [best] = rankSubstitutes({
      source: exercise,
      reason: avoided ? 'dislike' : 'program_fill',
      candidates,
      availableEquipment: input.availableEquipment,
      avoidIds: input.avoidIds,
      repRange: seed.repRange,
      limit: 3,
    });
    if (!best) {
      dropped.push(exercise);
      continue;
    }
    const swapExplanation = buildExplanation({
      ruleId: avoided ? 'program.preference_swap' : 'program.equipment_swap',
      vars: { from: exercise.name, to: best.exercise.name },
      confidence: best.explanation.confidence,
      factors: best.explanation.factors,
      evidence: best.explanation.evidence,
      alternatives: best.explanation.alternatives,
      counterfactual: best.explanation.counterfactual,
    });
    resolved.push(applyGoal({ ...seed, exerciseId: best.exercise.id, exercise: best.exercise, swappedFrom: exercise, swapExplanation }, input.goal));
  }

  const trimmed = trimToMinutes(resolved, input.sessionMinutes);
  return {
    name,
    focusMuscleIds,
    exercises: trimmed.exercises,
    estimatedMinutes: trimmed.minutes,
    trim: trimmed.changes,
    dropped,
  };
}
