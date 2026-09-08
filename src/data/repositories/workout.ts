import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';

import type { Exercise, Experience, SessionSummary, SkipReason, SwapReason, TargetSnapshot, WeightUnit } from '@/domain';
import {
  advanceDayIndex,
  detectPr,
  estimateOneRepMax,
  suggestNextTargets,
  E1RM_FORMULA,
  type ExerciseBests,
  type ExerciseExposure,
  type PrResult,
  type ProgressionTemplate,
  type Targets,
} from '@/engine';
import { localDate, nowIso } from '@/lib/dates';
import { uuidv7 } from '@/lib/uuid';

import { db } from '../db';
import {
  exercisePreferences,
  performedSets,
  programs,
  sessionExercises,
  sessions,
  templateExercises,
  type PerformedSetRow,
  type SessionExerciseRow,
  type SessionRow,
} from '../schema';
import { getExercise, rowToExercise } from './catalog';
import { getActiveProgram, type ActiveProgram } from './program';

// ---------- History and bests ----------

/** Working sets from completed sessions for one exercise, newest first. */
export async function getExerciseHistory(userId: string, exerciseId: string, limit = 6, excludeSessionId?: string): Promise<ExerciseExposure[]> {
  const rows = await db
    .select({
      sessionId: sessions.id,
      localDate: sessions.localDate,
      endedAt: sessions.endedAt,
      sessionExerciseId: sessionExercises.id,
    })
    .from(sessionExercises)
    .innerJoin(sessions, eq(sessionExercises.sessionId, sessions.id))
    .where(and(eq(sessions.userId, userId), eq(sessions.status, 'completed'), eq(sessionExercises.exerciseId, exerciseId), isNull(sessionExercises.deletedAt), isNull(sessions.deletedAt)))
    .orderBy(desc(sessions.endedAt))
    .limit(limit + 1);
  const exposures: ExerciseExposure[] = [];
  for (const r of rows) {
    if (excludeSessionId && r.sessionId === excludeSessionId) continue;
    const sets = await db
      .select()
      .from(performedSets)
      .where(and(eq(performedSets.sessionExerciseId, r.sessionExerciseId), eq(performedSets.setType, 'working'), isNull(performedSets.deletedAt)))
      .orderBy(asc(performedSets.order));
    if (sets.length === 0) continue;
    exposures.push({
      sessionId: r.sessionId,
      localDate: r.localDate,
      endedAt: r.endedAt ?? `${r.localDate}T12:00:00.000Z`,
      sets: sets.map((s) => ({ loadKg: effectiveLoad(s), reps: s.reps, rir: s.rir, suggestedLoadKg: s.suggestedLoadKg })),
    });
    if (exposures.length >= limit) break;
  }
  return exposures;
}

/** The load that progression reasons about: added load for bodyweight movements, external load otherwise. */
function effectiveLoad(set: Pick<PerformedSetRow, 'loadKg' | 'addedLoadKg'>): number | null {
  return set.loadKg ?? set.addedLoadKg ?? null;
}

/**
 * Prior bests for PR detection: every working set from completed sessions plus
 * the current session. `hasHistory` is false until a completed session exists,
 * so a first session sets baselines rather than records.
 */
export async function getExerciseBests(userId: string, exerciseId: string, excludeSetId?: string, currentSessionId?: string): Promise<ExerciseBests> {
  const rows = await db
    .select({ loadKg: performedSets.loadKg, addedLoadKg: performedSets.addedLoadKg, reps: performedSets.reps, e1rmKg: performedSets.e1rmKg, id: performedSets.id, sessionId: sessions.id, status: sessions.status })
    .from(performedSets)
    .innerJoin(sessionExercises, eq(performedSets.sessionExerciseId, sessionExercises.id))
    .innerJoin(sessions, eq(sessionExercises.sessionId, sessions.id))
    .where(and(eq(sessions.userId, userId), eq(sessionExercises.exerciseId, exerciseId), eq(performedSets.setType, 'working'), isNull(performedSets.deletedAt), isNull(sessionExercises.deletedAt), isNull(sessions.deletedAt)));
  let bestE1rmKg: number | null = null;
  let bestLoadKg: number | null = null;
  let bestRepsAtBestLoad: number | null = null;
  let hasHistory = false;
  for (const r of rows) {
    if (excludeSetId && r.id === excludeSetId) continue;
    const fromCompleted = r.status === 'completed' && r.sessionId !== currentSessionId;
    if (!fromCompleted && r.sessionId !== currentSessionId) continue; // abandoned or other in-progress sessions never count
    if (fromCompleted) hasHistory = true;
    const load = effectiveLoad(r);
    if (r.e1rmKg !== null && (bestE1rmKg === null || r.e1rmKg > bestE1rmKg)) bestE1rmKg = r.e1rmKg;
    if (load !== null && load > 0) {
      if (bestLoadKg === null || load > bestLoadKg + 0.01) {
        bestLoadKg = load;
        bestRepsAtBestLoad = r.reps;
      } else if (Math.abs(load - bestLoadKg) <= 0.01 && (bestRepsAtBestLoad === null || r.reps > bestRepsAtBestLoad)) {
        bestRepsAtBestLoad = r.reps;
      }
    }
  }
  return { bestE1rmKg, bestLoadKg, bestRepsAtBestLoad, hasHistory };
}

// ---------- Session lifecycle ----------

export type LoadedExercise = SessionExerciseRow & { exercise: Exercise; sets: PerformedSetRow[] };
export type LoadedSession = { session: SessionRow; exercises: LoadedExercise[] };

export type StartSessionInput = {
  userId: string;
  active: ActiveProgram;
  dayIndex: number;
  unit: WeightUnit;
  experience: Experience;
  outOfSequence?: boolean;
};

async function targetsFor(userId: string, exercise: Exercise, template: ProgressionTemplate, unit: WeightUnit, experience: Experience, excludeSessionId?: string, today?: Date): Promise<Targets> {
  const history = await getExerciseHistory(userId, exercise.id, 6, excludeSessionId);
  return suggestNextTargets({ exercise, template, history, experience, unit, today });
}

function snapshotFrom(targets: Targets, template: ProgressionTemplate & { restSeconds: number }): TargetSnapshot {
  return {
    repRange: template.repRange,
    targetRir: template.targetRir,
    restSeconds: template.restSeconds,
    workingSets: template.workingSets,
    suggestedLoadKg: targets.loadKg,
    suggestedReps: targets.reps,
    explanation: targets.explanation,
  };
}

/** Creates a session from a program day with engine targets snapshotted per exercise. */
export async function startSession(input: StartSessionInput): Promise<string> {
  const day = input.active.days[input.dayIndex];
  if (!day) throw new Error('Program day not found');
  const now = nowIso();
  const sync = { createdAt: now, updatedAt: now, deletedAt: null, version: 1 };
  const sessionId = uuidv7();

  const planned: { row: typeof sessionExercises.$inferInsert }[] = [];
  const schemeSwitches: string[] = [];
  for (const [order, te] of day.exercises.entries()) {
    const template = { repRange: te.repRange, targetRir: te.targetRir, progressionScheme: te.progressionScheme as ProgressionTemplate['progressionScheme'], workingSets: te.workingSets, restSeconds: te.restSeconds };
    const targets = await targetsFor(input.userId, te.exercise, template, input.unit, input.experience);
    if (targets.flags.includes('switch_to_double')) schemeSwitches.push(te.id);
    planned.push({
      row: {
        id: uuidv7(),
        sessionId,
        order,
        exerciseId: te.exercise.id,
        templateExerciseId: te.id,
        substitutedFromExerciseId: null,
        substitutionReason: null,
        targetSnapshot: snapshotFrom(targets, template),
        skipped: false,
        skipReason: null,
        restSecondsOverride: null,
        notes: null,
        ...sync,
      },
    });
  }

  await db.transaction(async (tx) => {
    await tx.insert(sessions).values({
      id: sessionId,
      userId: input.userId,
      programId: input.active.program.id,
      programDayId: day.id,
      name: day.name,
      status: 'in_progress',
      startedAt: now,
      endedAt: null,
      localDate: localDate(),
      outOfSequence: input.outOfSequence ?? false,
      modifications: { compressedToMinutes: null, swaps: [] },
      notes: null,
      summary: null,
      ...sync,
    });
    for (const p of planned) await tx.insert(sessionExercises).values(p.row);
    // Beginner linear progression that stalled twice moves to double progression (docs/05 §2.1 rule 6).
    for (const id of schemeSwitches) await tx.update(templateExercises).set({ progressionScheme: 'double_progression', updatedAt: now }).where(eq(templateExercises.id, id));
  });
  return sessionId;
}

export async function loadSession(sessionId: string): Promise<LoadedSession | null> {
  const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!session) return null;
  const rows = await db
    .select()
    .from(sessionExercises)
    .where(and(eq(sessionExercises.sessionId, sessionId), isNull(sessionExercises.deletedAt)))
    .orderBy(asc(sessionExercises.order));
  const exercises: LoadedExercise[] = [];
  const ids = rows.map((r) => r.id);
  const allSets = ids.length
    ? await db
        .select()
        .from(performedSets)
        .where(and(inArray(performedSets.sessionExerciseId, ids), isNull(performedSets.deletedAt)))
        .orderBy(asc(performedSets.order))
    : [];
  for (const r of rows) {
    const exRow = await db.query.exercises.findFirst({ where: (e, ops) => ops.eq(e.id, r.exerciseId) });
    if (!exRow) continue;
    exercises.push({ ...r, exercise: rowToExercise(exRow), sets: allSets.filter((s) => s.sessionExerciseId === r.id) });
  }
  return { session, exercises };
}

export type SaveSetInput = {
  userId: string;
  exercise: Exercise;
  sessionId: string;
  sessionExerciseId: string;
  setId?: string;
  order: number;
  setType: PerformedSetRow['setType'];
  /** Load in the user's unit as entered; null for bodyweight. */
  enteredLoad: number | null;
  enteredUnit: WeightUnit;
  loadKg: number | null;
  addedLoadKg: number | null;
  reps: number;
  rir: number | null;
  suggestedLoadKg: number | null;
  suggestedReps: number | null;
};

export async function saveSet(input: SaveSetInput): Promise<{ row: PerformedSetRow; pr: PrResult }> {
  const now = nowIso();
  const isWorking = input.setType === 'working';
  const load = input.loadKg ?? input.addedLoadKg;
  const bests: ExerciseBests = isWorking ? await getExerciseBests(input.userId, input.exercise.id, input.setId, input.sessionId) : { bestE1rmKg: null, bestLoadKg: null, bestRepsAtBestLoad: null, hasHistory: false };
  const pr = isWorking ? detectPr(load, input.reps, bests) : { isPr: false, kinds: [], e1rmKg: estimateOneRepMax(load, input.reps), e1rmDeltaKg: null };
  const base = {
    sessionExerciseId: input.sessionExerciseId,
    order: input.order,
    setType: input.setType,
    loadKg: input.loadKg,
    enteredLoad: input.enteredLoad,
    enteredUnit: input.enteredUnit,
    addedLoadKg: input.addedLoadKg,
    reps: input.reps,
    rir: input.rir,
    completedAt: now,
    suggestedLoadKg: input.suggestedLoadKg,
    suggestedReps: input.suggestedReps,
    e1rmKg: isWorking ? pr.e1rmKg : null,
    e1rmFormula: isWorking && pr.e1rmKg !== null ? E1RM_FORMULA : null,
    isPr: pr.isPr,
    notes: null,
  };
  if (input.setId) {
    const existing = await db.select().from(performedSets).where(eq(performedSets.id, input.setId)).get();
    const row: PerformedSetRow = { ...base, id: input.setId, createdAt: existing?.createdAt ?? now, updatedAt: now, deletedAt: null, version: (existing?.version ?? 0) + 1, completedAt: existing?.completedAt ?? now };
    await db.update(performedSets).set(row).where(eq(performedSets.id, input.setId));
    return { row, pr };
  }
  const row: PerformedSetRow = { ...base, id: uuidv7(), createdAt: now, updatedAt: now, deletedAt: null, version: 1 };
  await db.insert(performedSets).values(row);
  return { row, pr };
}

export async function deleteSet(setId: string): Promise<void> {
  await db.update(performedSets).set({ deletedAt: nowIso(), updatedAt: nowIso() }).where(eq(performedSets.id, setId));
}

export async function updateSessionExercise(id: string, patch: Partial<Pick<SessionExerciseRow, 'skipped' | 'skipReason' | 'notes' | 'restSecondsOverride' | 'order'>>): Promise<void> {
  await db.update(sessionExercises).set({ ...patch, updatedAt: nowIso() }).where(eq(sessionExercises.id, id));
}

export async function updateSessionNotes(sessionId: string, notes: string | null): Promise<void> {
  await db.update(sessions).set({ notes, updatedAt: nowIso() }).where(eq(sessions.id, sessionId));
}

export type SwapInput = {
  userId: string;
  session: SessionRow;
  sessionExercise: SessionExerciseRow;
  toExercise: Exercise;
  reason: SwapReason;
  scope: 'session' | 'program';
  unit: WeightUnit;
  experience: Experience;
};

/** Replaces an exercise in the session (and optionally the program) with fresh targets for the new movement. */
export async function swapSessionExercise(input: SwapInput): Promise<SessionExerciseRow> {
  const now = nowIso();
  const snap = input.sessionExercise.targetSnapshot;
  const template: ProgressionTemplate & { restSeconds: number } = {
    repRange: snap.repRange,
    targetRir: snap.targetRir,
    progressionScheme: 'double_progression',
    workingSets: snap.workingSets,
    restSeconds: snap.restSeconds,
  };
  const targets = await targetsFor(input.userId, input.toExercise, template, input.unit, input.experience);
  const updated: SessionExerciseRow = {
    ...input.sessionExercise,
    exerciseId: input.toExercise.id,
    substitutedFromExerciseId: input.sessionExercise.substitutedFromExerciseId ?? input.sessionExercise.exerciseId,
    substitutionReason: input.reason,
    targetSnapshot: snapshotFrom(targets, template),
    updatedAt: now,
    version: input.sessionExercise.version + 1,
  };
  await db.transaction(async (tx) => {
    await tx.update(sessionExercises).set(updated).where(eq(sessionExercises.id, input.sessionExercise.id));
    await tx
      .update(sessions)
      .set({
        modifications: {
          ...input.session.modifications,
          swaps: [...input.session.modifications.swaps, { fromExerciseId: input.sessionExercise.exerciseId, toExerciseId: input.toExercise.id, reason: input.reason, scope: input.scope }],
        },
        updatedAt: now,
      })
      .where(eq(sessions.id, input.session.id));
    if (input.reason === 'dislike' || input.reason === 'discomfort') {
      await tx.insert(exercisePreferences).values({ id: uuidv7(), userId: input.userId, exerciseId: input.sessionExercise.exerciseId, sentiment: input.reason === 'discomfort' ? 'avoid' : 'dislike', reason: input.reason, note: null, createdAt: now, updatedAt: now, deletedAt: null, version: 1 });
    }
    if (input.scope === 'program' && input.sessionExercise.templateExerciseId) {
      await tx.update(templateExercises).set({ exerciseId: input.toExercise.id, notes: `Replaces ${input.sessionExercise.exerciseId}`, updatedAt: now }).where(eq(templateExercises.id, input.sessionExercise.templateExerciseId));
    }
  });
  return updated;
}

export async function addSessionExercise(sessionId: string, userId: string, exercise: Exercise, order: number, unit: WeightUnit, experience: Experience): Promise<SessionExerciseRow> {
  const now = nowIso();
  const template = { repRange: exercise.repRangeDefault, targetRir: 2, progressionScheme: 'double_progression' as const, workingSets: 3, restSeconds: exercise.category === 'compound' ? 120 : 75 };
  const targets = await targetsFor(userId, exercise, template, unit, experience);
  const row: SessionExerciseRow = {
    id: uuidv7(),
    sessionId,
    order,
    exerciseId: exercise.id,
    templateExerciseId: null,
    substitutedFromExerciseId: null,
    substitutionReason: null,
    targetSnapshot: snapshotFrom(targets, template),
    skipped: false,
    skipReason: null,
    restSecondsOverride: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
  };
  await db.insert(sessionExercises).values(row);
  return row;
}

export type NextTimeRow = { exercise: Exercise; sessionExerciseId: string; targets: Targets; previousLoadKg: number | null };

/** Session summary + next-session targets. Marks the session complete and advances the program pointer. */
export async function finishSession(input: { userId: string; loaded: LoadedSession; unit: WeightUnit; experience: Experience }): Promise<{ summary: SessionSummary; nextTime: NextTimeRow[] }> {
  const { loaded } = input;
  const now = nowIso();
  const working = loaded.exercises.flatMap((e) => e.sets.filter((s) => s.setType === 'working'));
  const summary: SessionSummary = {
    totalWorkingSets: working.length,
    totalVolumeKg: Number(working.reduce((a, s) => a + (s.loadKg ?? 0) * s.reps, 0).toFixed(1)),
    durationSeconds: Math.max(0, Math.round((Date.parse(now) - Date.parse(loaded.session.startedAt)) / 1000)),
    prs: loaded.exercises.flatMap((e) =>
      e.sets
        .filter((s) => s.isPr)
        .map((s) => ({ exerciseId: e.exercise.id, exerciseName: e.exercise.name, kind: 'e1rm' as const, label: `${s.loadKg ?? s.addedLoadKg ?? 0} × ${s.reps}`, e1rmKg: s.e1rmKg, deltaKg: null })),
    ),
  };

  await db.transaction(async (tx) => {
    await tx.update(sessions).set({ status: 'completed', endedAt: now, summary, updatedAt: now }).where(eq(sessions.id, loaded.session.id));
    if (loaded.session.programId && loaded.session.programDayId && !loaded.session.outOfSequence) {
      const program = await tx.select().from(programs).where(eq(programs.id, loaded.session.programId)).get();
      if (program) {
        const active = await getActiveProgram(input.userId);
        if (active && active.program.id === program.id) {
          const dayIndex = active.days.findIndex((d) => d.id === loaded.session.programDayId);
          if (dayIndex >= 0) await tx.update(programs).set({ nextDayIndex: advanceDayIndex(active.days, dayIndex), updatedAt: now }).where(eq(programs.id, program.id));
        }
      }
    }
  });

  // Next-time targets assume the next session is on a later day, so the same-day guard does not apply.
  const tomorrow = new Date(Date.now() + 86_400_000);
  const nextTime: NextTimeRow[] = [];
  for (const e of loaded.exercises) {
    const workingSets = e.sets.filter((s) => s.setType === 'working');
    if (e.skipped || workingSets.length === 0) continue;
    const snap = e.targetSnapshot;
    const targets = await targetsFor(input.userId, e.exercise, { repRange: snap.repRange, targetRir: snap.targetRir, progressionScheme: 'double_progression', workingSets: snap.workingSets }, input.unit, input.experience, undefined, tomorrow);
    nextTime.push({ exercise: e.exercise, sessionExerciseId: e.id, targets, previousLoadKg: effectiveLoad(workingSets[0]!) });
  }
  return { summary, nextTime };
}

export async function abandonSession(sessionId: string): Promise<void> {
  const now = nowIso();
  await db.update(sessions).set({ status: 'abandoned', endedAt: now, updatedAt: now }).where(eq(sessions.id, sessionId));
}

export async function getSessionRow(sessionId: string): Promise<SessionRow | null> {
  return (await db.select().from(sessions).where(eq(sessions.id, sessionId)).get()) ?? null;
}

export async function findExerciseById(id: string): Promise<Exercise | null> {
  return getExercise(id);
}

export type SkipInput = { sessionExerciseId: string; reason: SkipReason };
