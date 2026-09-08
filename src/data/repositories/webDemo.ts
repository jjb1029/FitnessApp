/**
 * Web preview only. An in-memory stand-in for SQLite so every screen,
 * including the workout, can be exercised in a browser. Nothing here ships
 * in native builds (Metro only resolves the `.web.ts` files on web).
 */
import { defaultUserSettings, type Exercise } from '@/domain';
import { EXERCISE_SEED } from '@/exercises';

import type { ProfileRow, SessionExerciseRow, SessionRow, PerformedSetRow, UserRow, ProgramRow, ProgramDayRow, TemplateExerciseRow, BodyweightEntryRow } from '../schema';

export const demoExercises = new Map<string, Exercise>(EXERCISE_SEED.map((e) => [e.id, { ...e, isCustom: false, createdByUserId: null, catalogVersion: 1 }]));

export const demo = {
  user: {
    id: 'web-demo-user',
    authUserId: null,
    settings: defaultUserSettings('lb'),
    onboardingCompletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    version: 1,
  } as UserRow,
  profile: null as ProfileRow | null,
  program: null as { program: ProgramRow; days: (ProgramDayRow & { exercises: (TemplateExerciseRow & { exercise: Exercise })[] })[] } | null,
  sessions: new Map<string, { session: SessionRow; exercises: (SessionExerciseRow & { exercise: Exercise; sets: PerformedSetRow[] })[] }>(),
  bodyweight: [] as BodyweightEntryRow[],
  listeners: new Set<() => void>(),
};

export function notifyDemo(): void {
  for (const l of demo.listeners) l();
}
