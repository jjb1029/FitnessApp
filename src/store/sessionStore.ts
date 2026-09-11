import { create } from 'zustand';

import {
  abandonSession,
  addSessionExercise,
  deleteSet as deleteSetRepo,
  finishSession as finishSessionRepo,
  getExerciseBests,
  getExerciseHistory,
  loadSession,
  saveSet,
  swapSessionExercise,
  updateSessionExercise,
  updateSessionNotes,
  type LoadedExercise,
  type LoadedSession,
  type NextTimeRow,
} from '@/data/repositories';
import type { PerformedSetRow, SessionExerciseRow } from '@/data/schema';
import type { Exercise, Experience, SessionSummary, SkipReason, SwapReason, WeightUnit } from '@/domain';
import { exerciseDoneLine, gradeSet, prLine, setAcknowledgement, type SetRecord } from '@/engine';
import { displayLoad, kgToUnit, trimNumber, unitToKg } from '@/lib/units';
import { haptics } from '@/services/haptics';
import { cancelRestEnd, scheduleRestEnd } from '@/services/notifications';

/** The set the dock is editing: a new pending set, or an existing one. */
export type Draft = {
  sessionExerciseId: string;
  setId: string | null;
  order: number;
  setType: PerformedSetRow['setType'];
  /** In the user's unit. Null when the user has not chosen a weight yet. */
  load: number | null;
  reps: number;
  rir: number | null;
  suggestedLoad: number | null;
  suggestedReps: number | null;
};

export type RestState = { endsAt: number; totalSeconds: number; notificationId: string | null; exerciseName: string };

/** A transient line in the dock: Forma noticing something (docs/14 §2). */
export type Moment = { line: string; tone: 'neutral' | 'success' | 'accent'; until: number };

export type Finished = { summary: SessionSummary; nextTime: NextTimeRow[]; early: boolean };

type SessionState = {
  loaded: LoadedSession | null;
  loading: boolean;
  error: Error | null;
  currentExerciseId: string | null;
  draft: Draft | null;
  rest: RestState | null;
  moment: Moment | null;
  /** The set that just landed; drives the one-time landing highlight. */
  justLandedSetId: string | null;
  /** Previous session's working sets per exercise id, for "last time" and better-than-last-time grading. */
  previous: Record<string, SetRecord[]>;
  /** Heaviest working load ever logged per exercise id, so Forma can say when a weight is new. */
  bests: Record<string, number | null>;
  finished: Finished | null;
  unit: WeightUnit;
  experience: Experience;
  userId: string;
  autoStartRest: boolean;

  configure: (opts: { unit: WeightUnit; experience: Experience; userId: string; autoStartRest: boolean }) => void;
  load: (sessionId: string) => Promise<void>;
  clear: () => void;
  setCurrent: (sessionExerciseId: string) => void;
  updateDraft: (patch: Partial<Pick<Draft, 'load' | 'reps' | 'rir'>>) => void;
  completeSet: () => Promise<void>;
  editSet: (sessionExerciseId: string, setId: string) => void;
  cancelEdit: () => void;
  deleteSet: (sessionExerciseId: string, setId: string) => Promise<void>;
  addSet: (sessionExerciseId: string, setType?: PerformedSetRow['setType']) => void;
  addWarmups: (sessionExerciseId: string, sets: { loadKg: number; reps: number }[]) => Promise<void>;
  skipExercise: (sessionExerciseId: string, reason: SkipReason) => Promise<void>;
  unskipExercise: (sessionExerciseId: string) => Promise<void>;
  setNotes: (sessionExerciseId: string, notes: string | null) => Promise<void>;
  setRestOverride: (sessionExerciseId: string, seconds: number | null) => Promise<void>;
  swap: (sessionExerciseId: string, toExercise: Exercise, reason: SwapReason, scope: 'session' | 'program') => Promise<void>;
  addExercise: (exercise: Exercise) => Promise<void>;
  startRest: (seconds: number, exerciseName: string) => Promise<void>;
  adjustRest: (deltaSeconds: number) => void;
  skipRest: () => void;
  setMoment: (line: string, tone: Moment['tone'], durationMs: number) => void;
  finish: (early: boolean) => Promise<Finished | null>;
  abandon: () => Promise<void>;
  saveSessionNotes: (notes: string | null) => Promise<void>;
};

function isDone(e: LoadedExercise): boolean {
  return e.skipped || e.sets.filter((s) => s.setType === 'working').length >= e.targetSnapshot.workingSets;
}

function firstPending(loaded: LoadedSession): string | null {
  return loaded.exercises.find((e) => !isDone(e))?.id ?? loaded.exercises[0]?.id ?? null;
}

function isBodyweight(e: LoadedExercise): boolean {
  return e.exercise.loadType === 'bodyweight' || e.exercise.loadType === 'bodyweight_plus';
}

/** Prefill for the next pending set of an exercise (docs/13 §W1 prefill rules). */
function draftFor(e: LoadedExercise, unit: WeightUnit): Draft {
  const working = e.sets.filter((s) => s.setType === 'working');
  const order = e.sets.length;
  const previous = working[working.length - 1];
  const snap = e.targetSnapshot;
  const bw = isBodyweight(e);
  const suggestedLoad = snap.suggestedLoadKg === null ? null : displayLoad(snap.suggestedLoadKg, unit, e.exercise.incrementKg);
  if (previous) {
    const prevLoadKg = bw ? previous.addedLoadKg : previous.loadKg;
    return {
      sessionExerciseId: e.id,
      setId: null,
      order,
      setType: 'working',
      load: prevLoadKg === null ? null : displayLoad(prevLoadKg, unit, e.exercise.incrementKg),
      reps: previous.reps,
      rir: snap.targetRir,
      suggestedLoad,
      suggestedReps: snap.suggestedReps,
    };
  }
  return {
    sessionExerciseId: e.id,
    setId: null,
    order,
    setType: 'working',
    load: bw ? (suggestedLoad ?? 0) : suggestedLoad,
    reps: snap.suggestedReps ?? snap.repRange.min,
    rir: snap.targetRir,
    suggestedLoad,
    suggestedReps: snap.suggestedReps,
  };
}

function replaceExercise(loaded: LoadedSession, id: string, update: (e: LoadedExercise) => LoadedExercise): LoadedSession {
  return { ...loaded, exercises: loaded.exercises.map((e) => (e.id === id ? update(e) : e)) };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  loaded: null,
  loading: false,
  error: null,
  currentExerciseId: null,
  draft: null,
  rest: null,
  moment: null,
  justLandedSetId: null,
  previous: {},
  bests: {},
  finished: null,
  unit: 'lb',
  experience: 'intermediate',
  userId: '',
  autoStartRest: true,

  configure: (opts) => set(opts),

  load: async (sessionId) => {
    set({ loading: true, error: null, finished: null, moment: null, justLandedSetId: null });
    try {
      const loaded = await loadSession(sessionId);
      if (!loaded) throw new Error('Session not found');
      const previous: Record<string, SetRecord[]> = {};
      const bests: Record<string, number | null> = {};
      for (const e of loaded.exercises) {
        if (previous[e.exercise.id]) continue;
        const [history, best] = await Promise.all([getExerciseHistory(get().userId, e.exercise.id, 1, sessionId), getExerciseBests(get().userId, e.exercise.id)]);
        previous[e.exercise.id] = history[0]?.sets ?? [];
        bests[e.exercise.id] = best.bestLoadKg;
      }
      const currentExerciseId = firstPending(loaded);
      const current = loaded.exercises.find((e) => e.id === currentExerciseId);
      set({ loaded, previous, bests, loading: false, currentExerciseId, draft: current ? draftFor(current, get().unit) : null });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e : new Error(String(e)) });
    }
  },

  clear: () => {
    const { rest } = get();
    if (rest) cancelRestEnd(rest.notificationId).catch(() => undefined);
    set({ loaded: null, currentExerciseId: null, draft: null, rest: null, moment: null, justLandedSetId: null, previous: {}, bests: {}, finished: null, error: null });
  },

  setCurrent: (id) => {
    const { loaded, unit } = get();
    const e = loaded?.exercises.find((x) => x.id === id);
    if (!e) return;
    set({ currentExerciseId: id, draft: draftFor(e, unit) });
  },

  updateDraft: (patch) => {
    const { draft } = get();
    if (!draft) return;
    set({ draft: { ...draft, ...patch } });
  },

  setMoment: (line, tone, durationMs) => set({ moment: { line, tone, until: Date.now() + durationMs } }),

  completeSet: async () => {
    const { loaded, draft, unit, userId, autoStartRest, previous } = get();
    if (!loaded || !draft) return;
    const e = loaded.exercises.find((x) => x.id === draft.sessionExerciseId);
    if (!e) return;
    const bw = isBodyweight(e);
    const loadKg = draft.load === null ? null : unitToKg(draft.load, unit);
    const { row, pr } = await saveSet({
      sessionId: loaded.session.id,
      userId,
      exercise: e.exercise,
      sessionExerciseId: e.id,
      setId: draft.setId ?? undefined,
      order: draft.order,
      setType: draft.setType,
      enteredLoad: draft.load,
      enteredUnit: unit,
      loadKg: bw ? null : loadKg,
      addedLoadKg: bw ? (loadKg ?? 0) : null,
      reps: draft.reps,
      rir: draft.rir,
      suggestedLoadKg: draft.suggestedLoad === null ? null : unitToKg(draft.suggestedLoad, unit),
      suggestedReps: draft.suggestedReps,
    });
    const updatedLoaded = replaceExercise(loaded, e.id, (x) => {
      const others = x.sets.filter((s) => s.id !== row.id);
      return { ...x, sets: [...others, row].sort((a, b) => a.order - b.order) };
    });
    const updatedExercise = updatedLoaded.exercises.find((x) => x.id === e.id)!;
    const wasEdit = draft.setId !== null;
    const isWorking = draft.setType === 'working';

    // Grade the set against the target and against the same set last time.
    const workingIndex = updatedExercise.sets.filter((s) => s.setType === 'working').findIndex((s) => s.id === row.id);
    const previousSet = isWorking ? (previous[e.exercise.id]?.[workingIndex] ?? null) : null;
    const outcome = gradeSet({ reps: draft.reps, loadKg, repRange: e.targetSnapshot.repRange, previous: previousSet, edit: wasEdit });
    const setsRemaining = Math.max(0, updatedExercise.targetSnapshot.workingSets - (workingIndex + 1));

    if (pr.isPr) {
      haptics.success();
      const e1rm = pr.e1rmKg !== null ? `${trimNumber(Math.round(kgToUnit(pr.e1rmKg, unit)))} ${unit}` : '';
      const delta = pr.e1rmDeltaKg !== null && pr.e1rmDeltaKg > 0 ? `${trimNumber(Math.round(kgToUnit(pr.e1rmDeltaKg, unit)))} ${unit}` : null;
      get().setMoment(prLine(e1rm, delta), 'accent', 3500);
    } else if (isWorking) {
      // Graded but quiet: a light tap for a tough set, a firm one for a good or better set.
      // The success pattern stays reserved for records, so it still means something.
      if (outcome === 'below' || outcome === 'edit') haptics.tick();
      else haptics.medium();
      get().setMoment(setAcknowledgement({ outcome, setIndex: workingIndex, setsRemaining }), outcome === 'better' || outcome === 'above' ? 'success' : 'neutral', 2500);
    } else {
      haptics.tick();
      get().setMoment(wasEdit ? 'Updated.' : 'Warm-up logged.', 'neutral', 1500);
    }

    let nextId = e.id;
    if (!wasEdit && isDone(updatedExercise)) {
      const next = updatedLoaded.exercises.find((x) => !isDone(x));
      if (next) nextId = next.id;
      else get().setMoment(exerciseDoneLine(e.exercise.name, null), 'accent', 3000);
    }
    const nextExercise = updatedLoaded.exercises.find((x) => x.id === nextId)!;
    set({ loaded: updatedLoaded, currentExerciseId: nextId, draft: draftFor(nextExercise, unit), justLandedSetId: row.id });

    if (!wasEdit && autoStartRest) {
      const restSeconds = draft.setType === 'warmup' ? 60 : (e.restSecondsOverride ?? e.targetSnapshot.restSeconds);
      await get().startRest(restSeconds, nextExercise.exercise.name);
    }
  },

  editSet: (sessionExerciseId, setId) => {
    const { loaded, unit } = get();
    const e = loaded?.exercises.find((x) => x.id === sessionExerciseId);
    const s = e?.sets.find((x) => x.id === setId);
    if (!e || !s) return;
    const kg = isBodyweight(e) ? s.addedLoadKg : s.loadKg;
    set({
      currentExerciseId: sessionExerciseId,
      draft: {
        sessionExerciseId,
        setId,
        order: s.order,
        setType: s.setType,
        load: s.enteredLoad ?? (kg === null ? null : displayLoad(kg, unit, e.exercise.incrementKg)),
        reps: s.reps,
        rir: s.rir,
        suggestedLoad: s.suggestedLoadKg === null ? null : displayLoad(s.suggestedLoadKg, unit, e.exercise.incrementKg),
        suggestedReps: s.suggestedReps,
      },
    });
  },

  cancelEdit: () => {
    const { loaded, currentExerciseId, unit } = get();
    const e = loaded?.exercises.find((x) => x.id === currentExerciseId);
    if (e) set({ draft: draftFor(e, unit) });
  },

  deleteSet: async (sessionExerciseId, setId) => {
    const { loaded, unit } = get();
    if (!loaded) return;
    await deleteSetRepo(setId);
    const updated = replaceExercise(loaded, sessionExerciseId, (x) => ({ ...x, sets: x.sets.filter((s) => s.id !== setId) }));
    const e = updated.exercises.find((x) => x.id === sessionExerciseId)!;
    set({ loaded: updated, currentExerciseId: sessionExerciseId, draft: draftFor(e, unit), moment: null });
  },

  addSet: (sessionExerciseId, setType = 'working') => {
    const { loaded, unit } = get();
    const e = loaded?.exercises.find((x) => x.id === sessionExerciseId);
    if (!loaded || !e) return;
    // Raising the planned count makes the exercise pending again; the dock prefills from the last set.
    const updated = replaceExercise(loaded, sessionExerciseId, (x) => ({ ...x, targetSnapshot: { ...x.targetSnapshot, workingSets: Math.max(x.targetSnapshot.workingSets, x.sets.filter((s) => s.setType === 'working').length + 1) } }));
    const e2 = updated.exercises.find((x) => x.id === sessionExerciseId)!;
    set({ loaded: updated, currentExerciseId: sessionExerciseId, draft: { ...draftFor(e2, unit), setType } });
  },

  addWarmups: async (sessionExerciseId, sets) => {
    const { loaded, unit, userId } = get();
    const e = loaded?.exercises.find((x) => x.id === sessionExerciseId);
    if (!loaded || !e) return;
    let updated = loaded;
    const shifted = e.sets.map((s) => ({ ...s, order: s.order + sets.length }));
    for (const s of shifted) {
      await saveSet({ userId, sessionId: loaded.session.id, exercise: e.exercise, sessionExerciseId, setId: s.id, order: s.order, setType: s.setType, enteredLoad: s.enteredLoad, enteredUnit: unit, loadKg: s.loadKg, addedLoadKg: s.addedLoadKg, reps: s.reps, rir: s.rir, suggestedLoadKg: s.suggestedLoadKg, suggestedReps: s.suggestedReps });
    }
    const rows: PerformedSetRow[] = [];
    for (const [i, w] of sets.entries()) {
      const { row } = await saveSet({ userId, sessionId: loaded.session.id, exercise: e.exercise, sessionExerciseId, order: i, setType: 'warmup', enteredLoad: displayLoad(w.loadKg, unit, e.exercise.incrementKg), enteredUnit: unit, loadKg: w.loadKg, addedLoadKg: null, reps: w.reps, rir: null, suggestedLoadKg: w.loadKg, suggestedReps: w.reps });
      rows.push(row);
    }
    updated = replaceExercise(updated, sessionExerciseId, (x) => ({ ...x, sets: [...rows, ...shifted].sort((a, b) => a.order - b.order) }));
    const e2 = updated.exercises.find((x) => x.id === sessionExerciseId)!;
    set({ loaded: updated, currentExerciseId: sessionExerciseId, draft: draftFor(e2, unit) });
    get().setMoment(`${rows.length} warm-up sets added.`, 'neutral', 2000);
  },

  skipExercise: async (sessionExerciseId, reason) => {
    const { loaded, unit } = get();
    if (!loaded) return;
    await updateSessionExercise(sessionExerciseId, { skipped: true, skipReason: reason });
    const updated = replaceExercise(loaded, sessionExerciseId, (x) => ({ ...x, skipped: true, skipReason: reason }));
    const next = updated.exercises.find((x) => !isDone(x)) ?? updated.exercises.find((x) => x.id === sessionExerciseId)!;
    set({ loaded: updated, currentExerciseId: next.id, draft: draftFor(next, unit) });
    get().setMoment('Skipped. I will not count it against you.', 'neutral', 2500);
  },

  unskipExercise: async (sessionExerciseId) => {
    const { loaded, unit } = get();
    if (!loaded) return;
    await updateSessionExercise(sessionExerciseId, { skipped: false, skipReason: null });
    const updated = replaceExercise(loaded, sessionExerciseId, (x) => ({ ...x, skipped: false, skipReason: null }));
    const e = updated.exercises.find((x) => x.id === sessionExerciseId)!;
    set({ loaded: updated, currentExerciseId: sessionExerciseId, draft: draftFor(e, unit), moment: null });
  },

  setNotes: async (sessionExerciseId, notes) => {
    const { loaded } = get();
    if (!loaded) return;
    await updateSessionExercise(sessionExerciseId, { notes });
    set({ loaded: replaceExercise(loaded, sessionExerciseId, (x) => ({ ...x, notes })) });
  },

  setRestOverride: async (sessionExerciseId, seconds) => {
    const { loaded } = get();
    if (!loaded) return;
    await updateSessionExercise(sessionExerciseId, { restSecondsOverride: seconds });
    set({ loaded: replaceExercise(loaded, sessionExerciseId, (x) => ({ ...x, restSecondsOverride: seconds })) });
  },

  swap: async (sessionExerciseId, toExercise, reason, scope) => {
    const { loaded, unit, userId, experience, previous, bests } = get();
    const e = loaded?.exercises.find((x) => x.id === sessionExerciseId);
    if (!loaded || !e) return;
    const row = await swapSessionExercise({ userId, session: loaded.session, sessionExercise: e, toExercise, reason, scope, unit, experience });
    const updated = replaceExercise(loaded, sessionExerciseId, (x) => ({ ...x, ...row, exercise: toExercise, sets: [] }));
    const e2 = updated.exercises.find((x) => x.id === sessionExerciseId)!;
    const history = previous[toExercise.id] ?? (await getExerciseHistory(userId, toExercise.id, 1, loaded.session.id))[0]?.sets ?? [];
    const best = bests[toExercise.id] ?? (await getExerciseBests(userId, toExercise.id)).bestLoadKg;
    set({ loaded: updated, previous: { ...previous, [toExercise.id]: history }, bests: { ...bests, [toExercise.id]: best }, currentExerciseId: sessionExerciseId, draft: draftFor(e2, unit) });
    get().setMoment(`${toExercise.name} instead. ${scope === 'program' ? 'I updated your program.' : 'Just for today.'}`, 'neutral', 3000);
  },

  addExercise: async (exercise) => {
    const { loaded, unit, userId, experience, previous, bests } = get();
    if (!loaded) return;
    const row: SessionExerciseRow = await addSessionExercise(loaded.session.id, userId, exercise, loaded.exercises.length, unit, experience);
    const e: LoadedExercise = { ...row, exercise, sets: [] };
    const updated = { ...loaded, exercises: [...loaded.exercises, e] };
    const history = previous[exercise.id] ?? (await getExerciseHistory(userId, exercise.id, 1, loaded.session.id))[0]?.sets ?? [];
    const best = bests[exercise.id] ?? (await getExerciseBests(userId, exercise.id)).bestLoadKg;
    set({ loaded: updated, previous: { ...previous, [exercise.id]: history }, bests: { ...bests, [exercise.id]: best }, currentExerciseId: e.id, draft: draftFor(e, unit) });
  },

  startRest: async (seconds, exerciseName) => {
    const { rest } = get();
    if (rest) await cancelRestEnd(rest.notificationId);
    const endsAt = Date.now() + seconds * 1000;
    set({ rest: { endsAt, totalSeconds: seconds, notificationId: null, exerciseName } });
    const notificationId = await scheduleRestEnd(endsAt, `${exerciseName} · next set`);
    const current = get().rest;
    if (current && current.endsAt === endsAt) set({ rest: { ...current, notificationId } });
  },

  adjustRest: (delta) => {
    const { rest } = get();
    if (!rest) return;
    const endsAt = Math.max(Date.now() + 1000, rest.endsAt + delta * 1000);
    const exerciseName = rest.exerciseName;
    cancelRestEnd(rest.notificationId).catch(() => undefined);
    set({ rest: { ...rest, endsAt, totalSeconds: Math.max(1, rest.totalSeconds + delta), notificationId: null } });
    scheduleRestEnd(endsAt, `${exerciseName} · next set`)
      .then((id) => {
        const current = get().rest;
        if (current && current.endsAt === endsAt) set({ rest: { ...current, notificationId: id } });
      })
      .catch(() => undefined);
  },

  skipRest: () => {
    const { rest } = get();
    if (rest) cancelRestEnd(rest.notificationId).catch(() => undefined);
    set({ rest: null });
  },

  finish: async (early) => {
    const { loaded, unit, userId, experience, rest } = get();
    if (!loaded) return null;
    if (rest) await cancelRestEnd(rest.notificationId);
    const result = await finishSessionRepo({ userId, loaded, unit, experience });
    haptics.success();
    set({ finished: { ...result, early }, rest: null, moment: null, loaded: { ...loaded, session: { ...loaded.session, status: 'completed', summary: result.summary } } });
    return { ...result, early };
  },

  abandon: async () => {
    const { loaded, rest } = get();
    if (!loaded) return;
    if (rest) await cancelRestEnd(rest.notificationId);
    await abandonSession(loaded.session.id);
    get().clear();
  },

  saveSessionNotes: async (notes) => {
    const { loaded } = get();
    if (!loaded) return;
    await updateSessionNotes(loaded.session.id, notes);
    set({ loaded: { ...loaded, session: { ...loaded.session, notes } } });
  },
}));

export { isDone as isExerciseDone };
