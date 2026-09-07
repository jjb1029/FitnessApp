import { Equipment, Exercise, Muscle, ProgramTemplate } from '@/domain';

import { EQUIPMENT_SEED, EXERCISE_SEED, MUSCLE_SEED, PROGRAM_TEMPLATES } from './index';

describe('exercise catalog seed', () => {
  const ids = new Set(EXERCISE_SEED.map((e) => e.id));

  it('validates every exercise against the domain schema', () => {
    for (const e of EXERCISE_SEED) {
      const result = Exercise.safeParse({ ...e, isCustom: false, createdByUserId: null, catalogVersion: 1 });
      if (!result.success) throw new Error(`${e.id}: ${result.error.message}`);
    }
  });

  it('has unique ids', () => {
    expect(ids.size).toBe(EXERCISE_SEED.length);
  });

  it('only references exercises that exist in regressions and alternatives', () => {
    for (const e of EXERCISE_SEED) {
      for (const ref of [...e.regressionIds, ...e.alternativeIds]) {
        if (!ids.has(ref)) throw new Error(`${e.id} references missing exercise ${ref}`);
      }
    }
  });

  it('has at least one primary muscle per exercise and sane rep ranges', () => {
    for (const e of EXERCISE_SEED) {
      expect(e.muscles.some((m) => m.role === 'primary')).toBe(true);
      expect(e.repRangeAllowed.min).toBeLessThanOrEqual(e.repRangeDefault.min);
      expect(e.repRangeAllowed.max).toBeGreaterThanOrEqual(e.repRangeDefault.max);
    }
  });

  it('covers every major movement pattern', () => {
    const patterns = new Set(EXERCISE_SEED.map((e) => e.movementPattern));
    for (const p of ['horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'squat', 'hinge', 'lunge', 'knee_extension', 'knee_flexion', 'elbow_flexion', 'elbow_extension', 'shoulder_abduction', 'calf_raise', 'trunk_flexion']) {
      expect(patterns.has(p as never)).toBe(true);
    }
  });

  it('validates muscles and equipment', () => {
    for (const m of MUSCLE_SEED) Muscle.parse(m);
    for (const eq of EQUIPMENT_SEED) Equipment.parse(eq);
  });
});

describe('program templates', () => {
  const ids = new Set(EXERCISE_SEED.map((e) => e.id));

  it('validate against the schema and reference real exercises', () => {
    for (const t of PROGRAM_TEMPLATES) {
      const parsed = ProgramTemplate.parse(t);
      expect(parsed.days.length).toBe(t.daysPerWeek);
      for (const day of parsed.days) {
        for (const ex of day.exercises) {
          if (!ids.has(ex.exerciseId)) throw new Error(`${t.id}/${day.name} references missing exercise ${ex.exerciseId}`);
        }
        expect(day.exercises.some((x) => x.priority === 1)).toBe(true);
      }
    }
  });

  it('keeps sessions within a realistic duration', () => {
    for (const t of PROGRAM_TEMPLATES) {
      for (const day of t.days) {
        const seconds = day.exercises.reduce((acc, x) => acc + x.sets * (45 + x.restSeconds), 0) + day.exercises.length * 60;
        expect(seconds / 60).toBeLessThanOrEqual(t.sessionMinutes + 15);
      }
    }
  });
});
