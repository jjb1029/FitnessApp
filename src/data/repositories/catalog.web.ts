/** Web preview only: serve the catalog straight from the seed so onboarding screens render. */
import { Exercise, type Muscle, type ProgramTemplate } from '@/domain';
import { EXERCISE_SEED, MUSCLE_SEED, PROGRAM_TEMPLATES } from '@/exercises';

import type { ExerciseRow } from '../schema';

export function rowToExercise(row: ExerciseRow): Exercise {
  return Exercise.parse(row);
}

export async function getExerciseMap(): Promise<Map<string, Exercise>> {
  return new Map(EXERCISE_SEED.map((e) => [e.id, { ...e, isCustom: false, createdByUserId: null, catalogVersion: 1 }]));
}

export async function getExercise(id: string): Promise<Exercise | null> {
  return (await getExerciseMap()).get(id) ?? null;
}

export async function getTemplates(): Promise<ProgramTemplate[]> {
  return PROGRAM_TEMPLATES;
}

export async function getMuscles(): Promise<Muscle[]> {
  return MUSCLE_SEED;
}
