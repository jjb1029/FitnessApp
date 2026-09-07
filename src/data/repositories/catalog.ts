import { isNull } from 'drizzle-orm';

import type { Exercise, Muscle, ProgramTemplate } from '@/domain';

import { db } from '../db';
import { exercises, muscles, programTemplates, type ExerciseRow } from '../schema';

export function rowToExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    aliases: row.aliases,
    movementPattern: row.movementPattern,
    category: row.category as Exercise['category'],
    equipmentIds: row.equipmentIds,
    laterality: row.laterality as Exercise['laterality'],
    loadType: row.loadType as Exercise['loadType'],
    stability: row.stability,
    difficulty: row.difficulty,
    fatigueCost: row.fatigueCost,
    repRangeDefault: row.repRangeDefault,
    repRangeAllowed: row.repRangeAllowed,
    incrementKg: row.incrementKg,
    muscles: row.muscles,
    instructions: row.instructions,
    progressionNotes: row.progressionNotes ?? undefined,
    regressionIds: row.regressionIds,
    alternativeIds: row.alternativeIds,
    isCustom: row.isCustom,
    createdByUserId: row.createdByUserId,
    catalogVersion: row.catalogVersion,
  };
}

export async function getExerciseMap(): Promise<Map<string, Exercise>> {
  const rows = await db.select().from(exercises).where(isNull(exercises.deletedAt));
  return new Map(rows.map((r) => [r.id, rowToExercise(r)]));
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const row = await db.query.exercises.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  return row ? rowToExercise(row) : null;
}

export async function getTemplates(): Promise<ProgramTemplate[]> {
  const rows = await db.select().from(programTemplates);
  return rows.map((r) => r.data as ProgramTemplate);
}

export async function getMuscles(): Promise<Muscle[]> {
  const rows = await db.select().from(muscles);
  return rows.map((r) => ({ ...r, group: r.group as Muscle['group'] }));
}
