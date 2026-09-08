import type { Explanation, GoalType, ProgramTemplate } from '@/domain';
import type { ResolvedDay } from '@/engine';
import { nowIso } from '@/lib/dates';
import { uuidv7 } from '@/lib/uuid';

import type { ProgramDayRow, ProgramRow, TemplateExerciseRow } from '../schema';
import { demo, notifyDemo } from './webDemo';

export type ActiveProgram = { program: ProgramRow; days: (ProgramDayRow & { exercises: (TemplateExerciseRow & { exercise: import('@/domain').Exercise })[] })[] };

export async function getActiveProgram(): Promise<ActiveProgram | null> {
  return demo.program;
}

export async function setNextDayIndex(_programId: string, index: number): Promise<void> {
  if (demo.program) demo.program = { ...demo.program, program: { ...demo.program.program, nextDayIndex: index } };
  notifyDemo();
}

export type CreateProgramInput = { userId: string; template: ProgramTemplate; goal: GoalType; days: ResolvedDay[]; explanation: Explanation };

export async function createProgram(_tx: unknown, input: CreateProgramInput): Promise<string> {
  const now = nowIso();
  const sync = { createdAt: now, updatedAt: now, deletedAt: null, version: 1 };
  const programId = uuidv7();
  const program: ProgramRow = {
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
  };
  const days = input.days.map((day, order) => {
    const dayId = uuidv7();
    return {
      id: dayId,
      programId,
      order,
      name: day.name,
      focusMuscleIds: day.focusMuscleIds,
      estimatedMinutes: day.estimatedMinutes,
      isRest: false,
      ...sync,
      exercises: day.exercises.map((ex, i) => ({
        id: uuidv7(),
        programDayId: dayId,
        order: i,
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
        exercise: ex.exercise,
      })),
    };
  });
  demo.program = { program, days };
  notifyDemo();
  return programId;
}
