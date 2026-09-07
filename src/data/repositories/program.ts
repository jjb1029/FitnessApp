import { and, asc, eq, isNull } from 'drizzle-orm';

import type { Exercise, Explanation, GoalType, MuscleId, ProgramTemplate } from '@/domain';
import type { ResolvedDay } from '@/engine';
import { nowIso } from '@/lib/dates';
import { uuidv7 } from '@/lib/uuid';

import { db, type Db } from '../db';
import { programDays, programs, templateExercises, type ProgramDayRow, type ProgramRow, type TemplateExerciseRow } from '../schema';
import { rowToExercise } from './catalog';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export type ActiveProgram = {
  program: ProgramRow;
  days: (ProgramDayRow & { exercises: (TemplateExerciseRow & { exercise: Exercise })[] })[];
};

export async function getActiveProgram(userId: string): Promise<ActiveProgram | null> {
  const program = await db
    .select()
    .from(programs)
    .where(and(eq(programs.userId, userId), eq(programs.isActive, true), isNull(programs.deletedAt)))
    .get();
  if (!program) return null;
  const days = await db.select().from(programDays).where(and(eq(programDays.programId, program.id), isNull(programDays.deletedAt))).orderBy(asc(programDays.order));
  const result: ActiveProgram['days'] = [];
  for (const day of days) {
    const rows = await db.query.templateExercises.findMany({
      where: (t, ops) => ops.and(ops.eq(t.programDayId, day.id), ops.isNull(t.deletedAt)),
      orderBy: (t, ops) => [ops.asc(t.order)],
    });
    const exerciseRows = await Promise.all(rows.map((r) => db.query.exercises.findFirst({ where: (e, ops) => ops.eq(e.id, r.exerciseId) })));
    result.push({
      ...day,
      exercises: rows.map((r, i) => ({ ...r, exercise: rowToExercise(exerciseRows[i]!) })),
    });
  }
  return { program, days: result };
}

export async function setNextDayIndex(programId: string, index: number): Promise<void> {
  await db.update(programs).set({ nextDayIndex: index, updatedAt: nowIso() }).where(eq(programs.id, programId));
}

export type CreateProgramInput = {
  userId: string;
  template: ProgramTemplate;
  goal: GoalType;
  days: ResolvedDay[];
  explanation: Explanation;
};

/** Copies a resolved recommendation into user-owned program tables. Deactivates any other program. */
export async function createProgram(tx: Tx | Db, input: CreateProgramInput): Promise<string> {
  const now = nowIso();
  const sync = { createdAt: now, updatedAt: now, deletedAt: null, version: 1 };
  await tx.update(programs).set({ isActive: false, updatedAt: now }).where(eq(programs.userId, input.userId));
  const programId = uuidv7();
  await tx.insert(programs).values({
    id: programId,
    userId: input.userId,
    name: input.template.name,
    templateId: input.template.id,
    split: input.template.split,
    daysPerWeek: input.template.daysPerWeek,
    goalType: input.goal,
    description: input.template.description,
    rationale: input.explanation.short,
    explanation: input.explanation,
    isActive: true,
    startedAt: now,
    schedulingMode: 'sequential',
    weekdayMap: null,
    nextDayIndex: 0,
    deloadEveryWeeks: input.template.deloadEveryWeeks,
    ...sync,
  });
  for (const [dayOrder, day] of input.days.entries()) {
    const dayId = uuidv7();
    await tx.insert(programDays).values({
      id: dayId,
      programId,
      order: dayOrder,
      name: day.name,
      focusMuscleIds: day.focusMuscleIds as MuscleId[],
      estimatedMinutes: day.estimatedMinutes,
      isRest: false,
      ...sync,
    });
    for (const [order, ex] of day.exercises.entries()) {
      await tx.insert(templateExercises).values({
        id: uuidv7(),
        programDayId: dayId,
        order,
        exerciseId: ex.exercise.id,
        priority: ex.priority,
        repRange: ex.repRange,
        targetRir: ex.targetRir,
        restSeconds: ex.restSeconds,
        progressionScheme: ex.progressionScheme,
        workingSets: ex.sets,
        notes: ex.swappedFrom ? `Replaces ${ex.swappedFrom.name}` : null,
        supersetGroup: ex.supersetGroup,
        ...sync,
      });
    }
  }
  return programId;
}
