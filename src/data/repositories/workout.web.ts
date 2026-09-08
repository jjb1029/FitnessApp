import type { Exercise, Experience, SessionSummary, SwapReason, TargetSnapshot, WeightUnit } from '@/domain';
import { advanceDayIndex, detectPr, estimateOneRepMax, suggestNextTargets, E1RM_FORMULA, type ExerciseBests, type ExerciseExposure, type PrResult, type ProgressionTemplate, type Targets } from '@/engine';
import { localDate, nowIso } from '@/lib/dates';
import { uuidv7 } from '@/lib/uuid';

import type { PerformedSetRow, SessionExerciseRow, SessionRow } from '../schema';
import type { ActiveProgram } from './program.web';
import { demo, demoExercises, notifyDemo } from './webDemo';

export type LoadedExercise = SessionExerciseRow & { exercise: Exercise; sets: PerformedSetRow[] };
export type LoadedSession = { session: SessionRow; exercises: LoadedExercise[] };
export type StartSessionInput = { userId: string; active: ActiveProgram; dayIndex: number; unit: WeightUnit; experience: Experience; outOfSequence?: boolean };
export type SaveSetInput = { userId: string; exercise: Exercise; sessionId: string; sessionExerciseId: string; setId?: string; order: number; setType: PerformedSetRow['setType']; enteredLoad: number | null; enteredUnit: WeightUnit; loadKg: number | null; addedLoadKg: number | null; reps: number; rir: number | null; suggestedLoadKg: number | null; suggestedReps: number | null };
export type SwapInput = { userId: string; session: SessionRow; sessionExercise: SessionExerciseRow; toExercise: Exercise; reason: SwapReason; scope: 'session' | 'program'; unit: WeightUnit; experience: Experience };
export type NextTimeRow = { exercise: Exercise; sessionExerciseId: string; targets: Targets; previousLoadKg: number | null };

const sync = () => {
  const now = nowIso();
  return { createdAt: now, updatedAt: now, deletedAt: null, version: 1 };
};

function findSet(sessionExerciseId: string) {
  for (const s of demo.sessions.values()) {
    const e = s.exercises.find((x) => x.id === sessionExerciseId);
    if (e) return { s, e };
  }
  return null;
}

export async function getExerciseHistory(_userId: string, exerciseId: string, limit = 6, excludeSessionId?: string): Promise<ExerciseExposure[]> {
  const out: ExerciseExposure[] = [];
  const completed = [...demo.sessions.values()].filter((s) => s.session.status === 'completed' && s.session.id !== excludeSessionId).sort((a, b) => (b.session.endedAt ?? '').localeCompare(a.session.endedAt ?? ''));
  for (const s of completed) {
    for (const e of s.exercises) {
      if (e.exerciseId !== exerciseId) continue;
      const sets = e.sets.filter((x) => x.setType === 'working');
      if (sets.length === 0) continue;
      out.push({ sessionId: s.session.id, localDate: s.session.localDate, endedAt: s.session.endedAt ?? s.session.startedAt, sets: sets.map((x) => ({ loadKg: x.loadKg ?? x.addedLoadKg, reps: x.reps, rir: x.rir, suggestedLoadKg: x.suggestedLoadKg })) });
    }
    if (out.length >= limit) break;
  }
  return out;
}

export async function getExerciseBests(_userId: string, exerciseId: string, excludeSetId?: string, currentSessionId?: string): Promise<ExerciseBests> {
  let bestE1rmKg: number | null = null;
  let bestLoadKg: number | null = null;
  let hasHistory = false;
  for (const s of demo.sessions.values()) {
    const fromCompleted = s.session.status === 'completed' && s.session.id !== currentSessionId;
    if (!fromCompleted && s.session.id !== currentSessionId) continue;
    for (const e of s.exercises) {
      if (e.exerciseId !== exerciseId) continue;
      for (const x of e.sets) {
        if (x.setType !== 'working' || x.id === excludeSetId) continue;
        if (fromCompleted) hasHistory = true;
        const load = x.loadKg ?? x.addedLoadKg;
        if (x.e1rmKg !== null && (bestE1rmKg === null || x.e1rmKg > bestE1rmKg)) bestE1rmKg = x.e1rmKg;
        if (load !== null && load > 0 && (bestLoadKg === null || load > bestLoadKg)) bestLoadKg = load;
      }
    }
  }
  return { bestE1rmKg, bestLoadKg, bestRepsAtBestLoad: null, hasHistory };
}

async function targetsFor(userId: string, exercise: Exercise, template: ProgressionTemplate, unit: WeightUnit, experience: Experience, excludeSessionId?: string, today?: Date): Promise<Targets> {
  const history = await getExerciseHistory(userId, exercise.id, 6, excludeSessionId);
  return suggestNextTargets({ exercise, template, history, experience, unit, today });
}

function snapshotFrom(targets: Targets, t: ProgressionTemplate & { restSeconds: number }): TargetSnapshot {
  return { repRange: t.repRange, targetRir: t.targetRir, restSeconds: t.restSeconds, workingSets: t.workingSets, suggestedLoadKg: targets.loadKg, suggestedReps: targets.reps, explanation: targets.explanation };
}

export async function startSession(input: StartSessionInput): Promise<string> {
  const day = input.active.days[input.dayIndex];
  if (!day) throw new Error('Program day not found');
  const id = uuidv7();
  const exercises: LoadedExercise[] = [];
  for (const [order, te] of day.exercises.entries()) {
    const template = { repRange: te.repRange, targetRir: te.targetRir, progressionScheme: te.progressionScheme as ProgressionTemplate['progressionScheme'], workingSets: te.workingSets, restSeconds: te.restSeconds };
    const targets = await targetsFor(input.userId, te.exercise, template, input.unit, input.experience);
    exercises.push({ id: uuidv7(), sessionId: id, order, exerciseId: te.exercise.id, templateExerciseId: te.id, substitutedFromExerciseId: null, substitutionReason: null, targetSnapshot: snapshotFrom(targets, template), skipped: false, skipReason: null, restSecondsOverride: null, notes: null, ...sync(), exercise: te.exercise, sets: [] });
  }
  const session: SessionRow = { id, userId: input.userId, programId: input.active.program.id, programDayId: day.id, name: day.name, status: 'in_progress', startedAt: nowIso(), endedAt: null, localDate: localDate(), outOfSequence: input.outOfSequence ?? false, modifications: { compressedToMinutes: null, swaps: [] }, notes: null, summary: null, ...sync() };
  demo.sessions.set(id, { session, exercises });
  notifyDemo();
  return id;
}

export async function loadSession(sessionId: string): Promise<LoadedSession | null> {
  const s = demo.sessions.get(sessionId);
  return s ? { session: s.session, exercises: s.exercises.map((e) => ({ ...e, sets: [...e.sets] })) } : null;
}

export async function saveSet(input: SaveSetInput): Promise<{ row: PerformedSetRow; pr: PrResult }> {
  const found = findSet(input.sessionExerciseId);
  if (!found) throw new Error('Session exercise not found');
  const isWorking = input.setType === 'working';
  const load = input.loadKg ?? input.addedLoadKg;
  const bests: ExerciseBests = isWorking ? await getExerciseBests(input.userId, input.exercise.id, input.setId, input.sessionId) : { bestE1rmKg: null, bestLoadKg: null, bestRepsAtBestLoad: null, hasHistory: false };
  const pr = isWorking ? detectPr(load, input.reps, bests) : { isPr: false, kinds: [], e1rmKg: estimateOneRepMax(load, input.reps), e1rmDeltaKg: null };
  const row: PerformedSetRow = { id: input.setId ?? uuidv7(), sessionExerciseId: input.sessionExerciseId, order: input.order, setType: input.setType, loadKg: input.loadKg, enteredLoad: input.enteredLoad, enteredUnit: input.enteredUnit, addedLoadKg: input.addedLoadKg, reps: input.reps, rir: input.rir, completedAt: nowIso(), suggestedLoadKg: input.suggestedLoadKg, suggestedReps: input.suggestedReps, e1rmKg: isWorking ? pr.e1rmKg : null, e1rmFormula: isWorking && pr.e1rmKg !== null ? E1RM_FORMULA : null, isPr: pr.isPr, notes: null, ...sync() };
  found.e.sets = [...found.e.sets.filter((x) => x.id !== row.id), row].sort((a, b) => a.order - b.order);
  notifyDemo();
  return { row, pr };
}

export async function deleteSet(setId: string): Promise<void> {
  for (const s of demo.sessions.values()) for (const e of s.exercises) e.sets = e.sets.filter((x) => x.id !== setId);
  notifyDemo();
}

export async function updateSessionExercise(id: string, patch: Partial<Pick<SessionExerciseRow, 'skipped' | 'skipReason' | 'notes' | 'restSecondsOverride' | 'order'>>): Promise<void> {
  const found = findSet(id);
  if (found) Object.assign(found.e, patch);
  notifyDemo();
}

export async function updateSessionNotes(sessionId: string, notes: string | null): Promise<void> {
  const s = demo.sessions.get(sessionId);
  if (s) s.session = { ...s.session, notes };
}

export async function swapSessionExercise(input: SwapInput): Promise<SessionExerciseRow> {
  const found = findSet(input.sessionExercise.id);
  if (!found) throw new Error('Session exercise not found');
  const snap = input.sessionExercise.targetSnapshot;
  const template = { repRange: snap.repRange, targetRir: snap.targetRir, progressionScheme: 'double_progression' as const, workingSets: snap.workingSets, restSeconds: snap.restSeconds };
  const targets = await targetsFor(input.userId, input.toExercise, template, input.unit, input.experience);
  const updated: SessionExerciseRow = { ...input.sessionExercise, exerciseId: input.toExercise.id, substitutedFromExerciseId: input.sessionExercise.substitutedFromExerciseId ?? input.sessionExercise.exerciseId, substitutionReason: input.reason, targetSnapshot: snapshotFrom(targets, template), updatedAt: nowIso() };
  Object.assign(found.e, updated, { exercise: input.toExercise, sets: [] });
  if (input.scope === 'program' && demo.program) {
    for (const d of demo.program.days) for (const te of d.exercises) if (te.id === input.sessionExercise.templateExerciseId) Object.assign(te, { exerciseId: input.toExercise.id, exercise: input.toExercise });
  }
  notifyDemo();
  return updated;
}

export async function addSessionExercise(sessionId: string, userId: string, exercise: Exercise, order: number, unit: WeightUnit, experience: Experience): Promise<SessionExerciseRow> {
  const s = demo.sessions.get(sessionId);
  if (!s) throw new Error('Session not found');
  const template = { repRange: exercise.repRangeDefault, targetRir: 2, progressionScheme: 'double_progression' as const, workingSets: 3, restSeconds: exercise.category === 'compound' ? 120 : 75 };
  const targets = await targetsFor(userId, exercise, template, unit, experience);
  const row: SessionExerciseRow = { id: uuidv7(), sessionId, order, exerciseId: exercise.id, templateExerciseId: null, substitutedFromExerciseId: null, substitutionReason: null, targetSnapshot: snapshotFrom(targets, template), skipped: false, skipReason: null, restSecondsOverride: null, notes: null, ...sync() };
  s.exercises.push({ ...row, exercise, sets: [] });
  notifyDemo();
  return row;
}

export async function finishSession(input: { userId: string; loaded: LoadedSession; unit: WeightUnit; experience: Experience }): Promise<{ summary: SessionSummary; nextTime: NextTimeRow[] }> {
  const s = demo.sessions.get(input.loaded.session.id);
  if (!s) throw new Error('Session not found');
  const now = nowIso();
  const working = s.exercises.flatMap((e) => e.sets.filter((x) => x.setType === 'working'));
  const summary: SessionSummary = {
    totalWorkingSets: working.length,
    totalVolumeKg: Number(working.reduce((a, x) => a + (x.loadKg ?? 0) * x.reps, 0).toFixed(1)),
    durationSeconds: Math.max(0, Math.round((Date.parse(now) - Date.parse(s.session.startedAt)) / 1000)),
    prs: s.exercises.flatMap((e) => e.sets.filter((x) => x.isPr).map((x) => ({ exerciseId: e.exercise.id, exerciseName: e.exercise.name, kind: 'e1rm' as const, label: `${x.loadKg ?? x.addedLoadKg ?? 0} × ${x.reps}`, e1rmKg: x.e1rmKg, deltaKg: null }))),
  };
  s.session = { ...s.session, status: 'completed', endedAt: now, summary };
  if (demo.program && !s.session.outOfSequence) {
    const dayIndex = demo.program.days.findIndex((d) => d.id === s.session.programDayId);
    if (dayIndex >= 0) demo.program = { ...demo.program, program: { ...demo.program.program, nextDayIndex: advanceDayIndex(demo.program.days, dayIndex) } };
  }
  // Next-time targets assume the next session is on a later day, so the same-day guard does not apply.
  const tomorrow = new Date(Date.now() + 86_400_000);
  const nextTime: NextTimeRow[] = [];
  for (const e of s.exercises) {
    const ws = e.sets.filter((x) => x.setType === 'working');
    if (e.skipped || ws.length === 0) continue;
    const snap = e.targetSnapshot;
    const targets = await targetsFor(input.userId, e.exercise, { repRange: snap.repRange, targetRir: snap.targetRir, progressionScheme: 'double_progression', workingSets: snap.workingSets }, input.unit, input.experience, undefined, tomorrow);
    nextTime.push({ exercise: e.exercise, sessionExerciseId: e.id, targets, previousLoadKg: ws[0]!.loadKg ?? ws[0]!.addedLoadKg });
  }
  notifyDemo();
  return { summary, nextTime };
}

export async function abandonSession(sessionId: string): Promise<void> {
  const s = demo.sessions.get(sessionId);
  if (s) s.session = { ...s.session, status: 'abandoned', endedAt: nowIso() };
  notifyDemo();
}

export async function getSessionRow(sessionId: string): Promise<SessionRow | null> {
  return demo.sessions.get(sessionId)?.session ?? null;
}

export async function findExerciseById(id: string): Promise<Exercise | null> {
  return demoExercises.get(id) ?? null;
}
