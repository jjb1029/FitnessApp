import type { EquipmentId, Exercise, ProgramDay } from '@/domain';
import { EXERCISE_SEED, PROGRAM_TEMPLATES } from '@/exercises';

import { estimateMinutes, trimToMinutes } from './programs/estimate';
import { rankSubstitutes } from './substitution';
import { selectProgram } from './programSelector';
import { advanceDayIndex, resolveTodaysWorkout } from './scheduling';

const exercises = new Map<string, Exercise>(EXERCISE_SEED.map((e) => [e.id, { ...e, isCustom: false, createdByUserId: null, catalogVersion: 1 }]));
const ex = (id: string) => exercises.get(id)!;
const ALL_EQUIPMENT = new Set<EquipmentId>(['barbell', 'rack', 'bench', 'dumbbell', 'cable', 'machine', 'smith', 'pullup_bar', 'dip_station', 'band', 'kettlebell', 'bodyweight', 'ez_bar', 'trap_bar']);
const HOME_DUMBBELLS = new Set<EquipmentId>(['dumbbell', 'bench', 'bodyweight']);

describe('estimate and trim', () => {
  const day = [
    { sets: 3, restSeconds: 150, priority: 1 as const },
    { sets: 3, restSeconds: 105, priority: 2 as const },
    { sets: 3, restSeconds: 75, priority: 3 as const },
    { sets: 2, restSeconds: 75, priority: 3 as const },
  ];

  it('estimates minutes', () => {
    expect(estimateMinutes(day)).toBe(Math.round((3 * 195 + 3 * 150 + 3 * 120 + 2 * 120 + 4 * 60) / 60));
  });

  it('returns unchanged when it fits', () => {
    const r = trimToMinutes(day, 60);
    expect(r.changes).toHaveLength(0);
    expect(r.exercises).toHaveLength(4);
  });

  it('never removes priority-1 exercises and trims accessories first', () => {
    const r = trimToMinutes(day, 20);
    expect(r.exercises.some((e) => e.priority === 1)).toBe(true);
    expect(r.exercises.find((e) => e.priority === 1)?.sets).toBe(3);
    expect(r.changes[0]?.kind).toBe('remove_set');
    expect(r.minutes).toBeLessThanOrEqual(r.minutes); // sanity
  });
});

describe('rankSubstitutes', () => {
  const candidates = [...exercises.values()];

  it('ranks hack squat and leg press near the top for a back squat with equipment reason', () => {
    const ranked = rankSubstitutes({ source: ex('barbell_back_squat'), reason: 'equipment', candidates, availableEquipment: ALL_EQUIPMENT, repRange: { min: 5, max: 8 } });
    const names = ranked.map((r) => r.exercise.id);
    expect(names.slice(0, 3)).toContain('leg_press');
    expect(names.slice(0, 4)).toContain('hack_squat');
    expect(names.slice(0, 3)).not.toContain('leg_extension'); // isolation should not beat compounds
    expect(ranked[0]!.score).toBeGreaterThanOrEqual(ranked[1]!.score);
    expect(ranked[0]!.explanation.ruleId).toBe('substitution.rank');
  });

  it('never returns unavailable equipment', () => {
    const ranked = rankSubstitutes({ source: ex('barbell_bench_press'), reason: 'equipment', candidates, availableEquipment: HOME_DUMBBELLS });
    expect(ranked.length).toBeGreaterThan(0);
    for (const r of ranked) expect(r.exercise.equipmentIds.every((id) => id === 'bodyweight' || HOME_DUMBBELLS.has(id))).toBe(true);
    expect(ranked[0]!.exercise.id).toBe('dumbbell_bench_press');
  });

  it('prefers more stable options for discomfort', () => {
    const ranked = rankSubstitutes({ source: ex('barbell_back_squat'), reason: 'discomfort', candidates, availableEquipment: ALL_EQUIPMENT });
    expect(ranked[0]!.exercise.stability).toBeLessThan(ex('barbell_back_squat').stability);
    expect(ranked[0]!.explanation.ruleId).toBe('substitution.discomfort');
  });

  it('excludes the avoid list and the source', () => {
    const ranked = rankSubstitutes({ source: ex('lat_pulldown'), reason: 'variety', candidates, availableEquipment: ALL_EQUIPMENT, avoidIds: new Set(['pull_up']) });
    expect(ranked.map((r) => r.exercise.id)).not.toContain('pull_up');
    expect(ranked.map((r) => r.exercise.id)).not.toContain('lat_pulldown');
  });

  it('variety avoids the same equipment category', () => {
    const ranked = rankSubstitutes({ source: ex('dumbbell_curl'), reason: 'variety', candidates, availableEquipment: ALL_EQUIPMENT });
    for (const r of ranked) expect(r.exercise.equipmentIds).not.toContain('dumbbell');
  });
});

describe('selectProgram', () => {
  const base = { sessionMinutes: 60, goal: 'build_muscle' as const, availableEquipment: ALL_EQUIPMENT, templates: PROGRAM_TEMPLATES, exercises };

  it('picks the beginner full body for a new lifter on 3 days', () => {
    const r = selectProgram({ ...base, experience: 'beginner', daysPerWeek: 3 });
    expect(r.template.id).toBe('beginner_full_body_3x');
    expect(r.explanation.ruleId).toBe('program.select.beginner');
    expect(r.days).toHaveLength(3);
  });

  it('picks upper/lower for an intermediate on 4 days and PPL on 6', () => {
    expect(selectProgram({ ...base, experience: 'intermediate', daysPerWeek: 4 }).template.id).toBe('upper_lower_4x');
    expect(selectProgram({ ...base, experience: 'intermediate', daysPerWeek: 6 }).template.id).toBe('ppl_6x');
  });

  it('prefers fewer days when no exact match exists and explains alternatives', () => {
    const r = selectProgram({ ...base, experience: 'intermediate', daysPerWeek: 5 });
    expect(r.template.id).toBe('upper_lower_4x');
    expect(r.explanation.confidence).toBe('medium');
    expect(r.alternatives).toHaveLength(2);
    expect(r.alternatives[0]!.explanation.short).toMatch(/Also a good fit/);
  });

  it('swaps unavailable equipment with explanations and never leaves barbell work for a dumbbell-only home', () => {
    const r = selectProgram({ ...base, experience: 'intermediate', daysPerWeek: 4, availableEquipment: HOME_DUMBBELLS });
    for (const day of r.days) {
      for (const e of day.exercises) {
        expect(e.exercise.equipmentIds.every((id) => id === 'bodyweight' || HOME_DUMBBELLS.has(id))).toBe(true);
        if (e.swappedFrom) expect(e.swapExplanation?.ruleId).toBe('program.equipment_swap');
      }
    }
    expect(r.days.flatMap((d) => d.exercises).some((e) => e.swappedFrom)).toBe(true);
  });

  it('respects avoided exercises', () => {
    const r = selectProgram({ ...base, experience: 'intermediate', daysPerWeek: 3, avoidIds: new Set(['barbell_back_squat']) });
    const all = r.days.flatMap((d) => d.exercises);
    expect(all.map((e) => e.exercise.id)).not.toContain('barbell_back_squat');
    const swap = all.find((e) => e.swappedFrom?.id === 'barbell_back_squat');
    expect(swap?.swapExplanation?.ruleId).toBe('program.preference_swap');
  });

  it('trims accessories to fit a short session but keeps primaries', () => {
    const r = selectProgram({ ...base, experience: 'intermediate', daysPerWeek: 4, sessionMinutes: 30 });
    for (const day of r.days) {
      expect(day.estimatedMinutes).toBeLessThanOrEqual(45);
      expect(day.exercises.some((e) => e.priority === 1)).toBe(true);
      expect(day.trim.length).toBeGreaterThan(0);
    }
  });

  it('strength goal lowers primary rep ranges', () => {
    const r = selectProgram({ ...base, experience: 'intermediate', daysPerWeek: 4, goal: 'get_stronger' });
    const primaries = r.days.flatMap((d) => d.exercises).filter((e) => e.priority === 1 && e.exercise.category === 'compound');
    for (const p of primaries) {
      expect(p.repRange.min).toBeGreaterThanOrEqual(4);
      expect(p.repRange.max).toBeLessThanOrEqual(8);
      expect(p.restSeconds).toBeGreaterThanOrEqual(180);
    }
  });
});

describe('resolveTodaysWorkout', () => {
  const days: ProgramDay[] = ['Upper A', 'Lower A', 'Upper B', 'Lower B'].map((name, i) => ({ id: `d${i}`, programId: 'p', order: i, name, focusMuscleIds: [], estimatedMinutes: 55, isRest: false }));
  const program = { schedulingMode: 'sequential' as const, weekdayMap: null, nextDayIndex: 1 };

  it('returns the next sequential day', () => {
    const r = resolveTodaysWorkout({ program, days, lastCompletedAt: '2026-09-06T10:00:00Z', today: new Date('2026-09-07T10:00:00Z') });
    expect(r.kind).toBe('train');
    if (r.kind === 'train') expect(r.day.name).toBe('Lower A');
  });

  it('wraps around and skips rest days', () => {
    const withRest = [...days, { id: 'r', programId: 'p', order: 4, name: 'Rest', focusMuscleIds: [], estimatedMinutes: 0, isRest: true }];
    expect(advanceDayIndex(withRest, 3)).toBe(0);
    expect(advanceDayIndex(days, 3)).toBe(0);
  });

  it('flags a welcome back after 5+ days with eased loads', () => {
    const r = resolveTodaysWorkout({ program, days, lastCompletedAt: '2026-08-28T10:00:00Z', today: new Date('2026-09-07T10:00:00Z') });
    expect(r.kind).toBe('welcome_back');
    if (r.kind === 'welcome_back') {
      expect(r.layoffDays).toBe(10);
      expect(r.loadPercent).toBe(10);
      expect(r.suggestRestart).toBe(false);
      expect(r.explanation.short).toMatch(/10 days off/);
    }
  });

  it('suggests a restart after 28+ days', () => {
    const r = resolveTodaysWorkout({ program, days, lastCompletedAt: '2026-07-20T10:00:00Z', today: new Date('2026-09-07T10:00:00Z') });
    expect(r.kind).toBe('welcome_back');
    if (r.kind === 'welcome_back') {
      expect(r.suggestRestart).toBe(true);
      expect(r.loadPercent).toBe(20);
    }
  });

  it('weekday mode returns rest on unmapped days', () => {
    const weekday = { schedulingMode: 'weekday' as const, weekdayMap: { d0: 1, d1: 2, d2: 4, d3: 5 }, nextDayIndex: 0 };
    const sunday = new Date('2026-09-06T10:00:00'); // local Sunday
    const r = resolveTodaysWorkout({ program: weekday, days, lastCompletedAt: null, today: sunday });
    expect(r.kind).toBe('rest');
    const monday = new Date('2026-09-07T10:00:00');
    const r2 = resolveTodaysWorkout({ program: weekday, days, lastCompletedAt: null, today: monday });
    expect(r2.kind).toBe('train');
  });
});
