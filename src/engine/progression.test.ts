import type { Exercise } from '@/domain';
import { EXERCISE_SEED } from '@/exercises';
import { lbToKg } from '@/lib/units';

import { suggestNextTargets, suggestWarmups, type ExerciseExposure, type SetRecord } from './progression';
import { detectPr, estimateOneRepMax } from './strength';

const exercises = new Map<string, Exercise>(EXERCISE_SEED.map((e) => [e.id, { ...e, isCustom: false, createdByUserId: null, catalogVersion: 1 }]));
const ex = (id: string) => exercises.get(id)!;
const TODAY = new Date('2026-09-10T10:00:00Z');

function exposure(daysAgo: number, sets: [number | null, number, number | null][], suggested?: number | null): ExerciseExposure {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return {
    sessionId: `s-${daysAgo}`,
    localDate: d.toISOString().slice(0, 10),
    endedAt: d.toISOString(),
    sets: sets.map<SetRecord>(([lb, reps, rir]) => ({ loadKg: lb === null ? null : lbToKg(lb), reps, rir, suggestedLoadKg: suggested === undefined ? undefined : suggested === null ? null : lbToKg(suggested) })),
  };
}

const lb = (kg: number | null) => (kg === null ? null : Math.round((kg / 0.45359237) * 10) / 10);

const incline = { exercise: ex('incline_dumbbell_press'), template: { repRange: { min: 8, max: 12 }, targetRir: 2, progressionScheme: 'double_progression' as const, workingSets: 3 }, experience: 'intermediate' as const, unit: 'lb' as const, today: TODAY };

describe('suggestNextTargets · double progression (brief examples)', () => {
  it('seeds with no history', () => {
    const t = suggestNextTargets({ ...incline, history: [] });
    expect(t.ruleId).toBe('progression.seed');
    expect(t.loadKg).toBeNull();
    expect(t.reps).toBe(8);
  });

  it('75×10@2, 75×10@1, 75×9@1 → hold 75 and add a rep', () => {
    const t = suggestNextTargets({ ...incline, history: [exposure(3, [[75, 10, 2], [75, 10, 1], [75, 9, 1]])] });
    expect(t.ruleId).toBe('progression.double.add_rep');
    expect(lb(t.loadKg)).toBe(75);
    expect(t.reps).toBe(11);
    expect(t.explanation.short).toMatch(/inside your rep range/i);
  });

  it('75×12@3, 75×12@2, 75×12@2 → increase to 80', () => {
    const t = suggestNextTargets({ ...incline, history: [exposure(3, [[75, 12, 3], [75, 12, 2], [75, 12, 2]])] });
    expect(t.ruleId).toBe('progression.double.increase_load');
    expect(lb(t.loadKg)).toBe(80);
    expect(t.reps).toBe(8);
    expect(t.explanation.counterfactual).toMatch(/80 lb/);
    expect(t.explanation.factors[0]?.value).toBe('75 × 12 · 12 · 12 @ 2.33 RIR');
  });

  it('top of range at 0 RIR → consolidate', () => {
    const t = suggestNextTargets({ ...incline, history: [exposure(3, [[75, 12, 0], [75, 12, 0], [75, 12, 0]])] });
    expect(t.ruleId).toBe('progression.double.consolidate');
    expect(lb(t.loadKg)).toBe(75);
    expect(t.reps).toBe(12);
  });

  it('very easy on a barbell → larger jump', () => {
    const bench = { ...incline, exercise: ex('barbell_bench_press'), template: { ...incline.template, repRange: { min: 6, max: 10 } } };
    const t = suggestNextTargets({ ...bench, history: [exposure(3, [[135, 10, 4], [135, 10, 4], [135, 10, 4]])] });
    expect(t.ruleId).toBe('progression.double.increase_load_large');
    expect(lb(t.loadKg)).toBe(145);
  });

  it('missed once → hold; missed twice → reduce', () => {
    const once = suggestNextTargets({ ...incline, history: [exposure(3, [[80, 7, 0], [80, 6, 0], [80, 6, 0]]), exposure(7, [[75, 12, 2], [75, 12, 2], [75, 12, 2]])] });
    expect(once.ruleId).toBe('progression.hold_after_miss');
    expect(lb(once.loadKg)).toBe(80);
    const twice = suggestNextTargets({ ...incline, history: [exposure(3, [[80, 7, 0], [80, 6, 0], [80, 6, 0]]), exposure(7, [[80, 7, 0], [80, 7, 0], [80, 6, 0]])] });
    expect(twice.ruleId).toBe('progression.reduce_load');
    expect(twice.flags).toContain('reduce_load');
    expect(lb(twice.loadKg)).toBeLessThanOrEqual(75);
  });

  it('reps decide when RIR is missing', () => {
    const t = suggestNextTargets({ ...incline, history: [exposure(3, [[75, 12, null], [75, 12, null], [75, 12, null]])] });
    expect(t.ruleId).toBe('progression.double.increase_load_reps');
    expect(lb(t.loadKg)).toBe(80);
    const inside = suggestNextTargets({ ...incline, history: [exposure(3, [[75, 10, null], [75, 9, null], [75, 9, null]])] });
    expect(inside.ruleId).toBe('progression.double.add_rep');
    expect(inside.explanation.ruleId).toBe('progression.reps_only');
  });

  it('eases after a layoff', () => {
    const t = suggestNextTargets({ ...incline, history: [exposure(20, [[80, 10, 2], [80, 10, 2], [80, 9, 2]])] });
    expect(t.ruleId).toBe('progression.layoff');
    expect(lb(t.loadKg)).toBe(70); // 80 × 0.9 = 72 → nearest 5 lb
    expect(t.explanation.short).toMatch(/20 days/);
  });

  it('does not progress twice in one day', () => {
    const t = suggestNextTargets({ ...incline, history: [exposure(0, [[75, 12, 2], [75, 12, 2], [75, 12, 2]])] });
    expect(t.ruleId).toBe('progression.same_day');
    expect(lb(t.loadKg)).toBe(75);
  });

  it('calibrates after three upward overrides', () => {
    const h = [exposure(3, [[85, 12, 2], [85, 12, 2]], 80), exposure(7, [[80, 12, 2], [80, 12, 2]], 75), exposure(11, [[75, 12, 2], [75, 12, 2]], 70)];
    const t = suggestNextTargets({ ...incline, history: h });
    expect(t.ruleId).toBe('progression.calibrate');
    expect(t.flags).toContain('calibrated');
    expect(lb(t.loadKg)).toBe(95); // two increments
    expect(t.explanation.overrideNote).toMatch(/heavier/);
  });

  it('never moves load by more than two increments', () => {
    const cases = [
      [[75, 12, 5], [75, 12, 5], [75, 12, 5]],
      [[75, 3, 0], [75, 3, 0], [75, 2, 0]],
    ] as [number, number, number][][];
    for (const sets of cases) {
      const t = suggestNextTargets({ ...incline, history: [exposure(3, sets), exposure(7, sets)] });
      expect(Math.abs((lb(t.loadKg) ?? 75) - 75)).toBeLessThanOrEqual(10);
    }
  });
});

describe('suggestNextTargets · linear and bodyweight', () => {
  const legPress = { exercise: ex('leg_press'), template: { repRange: { min: 8, max: 12 }, targetRir: 2, progressionScheme: 'linear_load' as const, workingSets: 3 }, experience: 'beginner' as const, unit: 'lb' as const, today: TODAY };

  it('adds weight every session while reps are hit', () => {
    const t = suggestNextTargets({ ...legPress, history: [exposure(3, [[180, 10, 2], [180, 9, 2], [180, 8, 1]])] });
    expect(t.ruleId).toBe('progression.linear.increase_load');
    expect(lb(t.loadKg)).toBe(190);
  });

  it('switches to double progression after two misses', () => {
    const t = suggestNextTargets({ ...legPress, history: [exposure(3, [[200, 7, 0], [200, 6, 0], [200, 6, 0]]), exposure(6, [[200, 7, 0], [200, 7, 0], [200, 6, 0]])] });
    expect(t.ruleId).toBe('progression.linear.to_double');
    expect(t.flags).toContain('switch_to_double');
  });

  const pullUp = { exercise: ex('pull_up'), template: { repRange: { min: 5, max: 10 }, targetRir: 2, progressionScheme: 'double_progression' as const, workingSets: 3 }, experience: 'intermediate' as const, unit: 'lb' as const, today: TODAY };

  it('bodyweight: reps first, then added load', () => {
    const reps = suggestNextTargets({ ...pullUp, history: [exposure(3, [[0, 7, 2], [0, 6, 1], [0, 6, 1]])] });
    expect(reps.ruleId).toBe('progression.double.add_rep');
    expect(reps.reps).toBe(8);
    const add = suggestNextTargets({ ...pullUp, history: [exposure(3, [[0, 10, 2], [0, 10, 2], [0, 10, 1]])] });
    expect(add.ruleId).toBe('progression.bodyweight.add_load');
    expect(lb(add.loadKg)).toBe(5);
    const regress = suggestNextTargets({ ...pullUp, history: [exposure(3, [[0, 3, 0], [0, 2, 0], [0, 2, 0]])] });
    expect(regress.ruleId).toBe('progression.bodyweight.regress');
    expect(regress.flags).toContain('regress');
  });
});

describe('strength', () => {
  it('estimates e1RM with Epley up to 12 reps', () => {
    expect(estimateOneRepMax(100, 1)).toBeCloseTo(103.333, 2);
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.333, 2);
    expect(estimateOneRepMax(100, 13)).toBeNull();
    expect(estimateOneRepMax(null, 10)).toBeNull();
  });

  it('detects PRs but not baselines', () => {
    expect(detectPr(100, 10, { bestE1rmKg: null, bestLoadKg: null, bestRepsAtBestLoad: null, hasHistory: false }).isPr).toBe(false);
    // A first session never produces records, even when later sets beat earlier ones.
    expect(detectPr(100, 10, { bestE1rmKg: 120, bestLoadKg: 100, bestRepsAtBestLoad: 8, hasHistory: false }).isPr).toBe(false);
    const pr = detectPr(100, 10, { bestE1rmKg: 130, bestLoadKg: 100, bestRepsAtBestLoad: 8, hasHistory: true });
    expect(pr.isPr).toBe(true);
    expect(pr.kinds).toEqual(['e1rm']);
    expect(pr.e1rmDeltaKg).toBeCloseTo(3.333, 2);
    const heavier = detectPr(105, 5, { bestE1rmKg: 130, bestLoadKg: 100, bestRepsAtBestLoad: 8, hasHistory: true });
    expect(heavier.kinds).toEqual(['load']);
  });

  it('progression reasons about the load actually used, not a stray first set', () => {
    const t = suggestNextTargets({ ...incline, history: [exposure(3, [[0, 9, 2], [75, 9, 2], [75, 9, 2]])] });
    expect(lb(t.loadKg)).toBe(75);
  });
});

describe('suggestWarmups', () => {
  it('suggests a ramp for a primary barbell lift and nothing for isolation', () => {
    const w = suggestWarmups(ex('barbell_bench_press'), lbToKg(185), 1, 'lb');
    expect(w).not.toBeNull();
    expect(w!.sets.map((s) => lb(s.loadKg))).toEqual([95, 130, 155]);
    expect(w!.explanation.short).toMatch(/Three lighter sets/);
    expect(suggestWarmups(ex('dumbbell_lateral_raise'), 10, 3, 'lb')).toBeNull();
    expect(suggestWarmups(ex('barbell_bench_press'), lbToKg(65), 1, 'lb')).toBeNull();
  });
});
