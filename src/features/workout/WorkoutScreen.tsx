import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getExerciseHistory, getExerciseMap, getProfile, type LoadedExercise } from '@/data/repositories';
import type { EquipmentId, Exercise, Explanation } from '@/domain';
import { suggestWarmups } from '@/engine';
import { formatDuration } from '@/lib/dates';
import { incrementStepInUnit, unitToKg } from '@/lib/units';
import { haptics } from '@/services/haptics';
import { isExerciseDone, useSessionStore } from '@/store/sessionStore';
import { useUiStore } from '@/store/uiStore';
import { ErrorState, IconButton, NumericKeypad, ProgressBar, Skeleton, Text, useTheme, useToast, WhySheet } from '@/ui';

import { useCurrentUser } from '../app/UserProvider';
import { useNow } from '../app/useNow';
import { ExerciseBlock, previousSummary } from './ExerciseBlock';
import { InputDock } from './InputDock';
import { SummaryView } from './SummaryView';
import { AddExerciseSheet, ConfirmSheet, ExerciseInfoSheet, ExerciseMenuSheet, NoteSheet, RirSheet, SessionMenuSheet, SkipSheet, SwapSheet } from './sheets';

const REST_DONE_LINGER_MS = 3000;

export function WorkoutScreen({ sessionId }: { sessionId: string }) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { user } = useCurrentUser();
  const unit = useUiStore((s) => s.unitWeight);
  const scale = useUiStore((s) => s.intensityScale);
  const keepAwake = user.settings.keepAwakeDuringWorkout;
  const store = useSessionStore();
  const now = useNow(250);
  const listRef = useRef<FlatList<LoadedExercise>>(null);
  const [dockHeight, setDockHeight] = useState(180);
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [previousByExercise, setPreviousByExercise] = useState<Record<string, string | null>>({});
  const [sheet, setSheet] = useState<null | 'rir' | 'keypad-load' | 'keypad-reps' | 'why' | 'swap' | 'note' | 'skip' | 'menu' | 'info' | 'session' | 'add' | 'finish' | 'discard'>(null);
  const [whyTarget, setWhyTarget] = useState<{ title: string; explanation: Explanation } | null>(null);

  useKeepAwake(keepAwake ? 'workout' : undefined);

  // Load session and profile once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const profile = await getProfile(user.id);
      store.configure({ unit, experience: (profile?.trainingExperience as 'beginner' | 'intermediate' | 'advanced') ?? 'intermediate', userId: user.id, autoStartRest: user.settings.restTimerAutoStart });
      await store.load(sessionId);
      const map = await getExerciseMap();
      if (!cancelled) setCatalog([...map.values()]);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, user.id]);

  const loaded = store.loaded;

  // Previous performance per exercise for the "Last time" lines.
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    (async () => {
      const entries: Record<string, string | null> = {};
      for (const e of loaded.exercises) {
        if (entries[e.exercise.id] !== undefined) continue;
        const history = await getExerciseHistory(user.id, e.exercise.id, 1, loaded.session.id);
        entries[e.exercise.id] = previousSummary(e, history[0]?.sets.map((s) => ({ loadKg: s.loadKg, addedLoadKg: null, reps: s.reps })) ?? null, unit);
      }
      if (!cancelled) setPreviousByExercise(entries);
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded?.exercises.map((e) => e.exercise.id).join('|'), user.id, unit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rest timer end: one haptic, linger "Rest done" for a moment, then clear.
  const rest = store.rest;
  const restEnded = rest !== null && rest.endsAt - now <= 0;
  const restEndsAt = rest?.endsAt ?? null;
  const firedFor = useRef<number | null>(null);
  useEffect(() => {
    if (!restEnded || restEndsAt === null) return undefined;
    if (firedFor.current !== restEndsAt) {
      firedFor.current = restEndsAt;
      haptics.tick();
    }
    const t = setTimeout(() => useSessionStore.getState().skipRest(), REST_DONE_LINGER_MS);
    return () => clearTimeout(t);
  }, [restEnded, restEndsAt]);

  // Scroll the current exercise to the top when it changes.
  const currentIndex = loaded?.exercises.findIndex((e) => e.id === store.currentExerciseId) ?? -1;
  useEffect(() => {
    if (currentIndex >= 0 && loaded) {
      const t = setTimeout(() => listRef.current?.scrollToIndex({ index: currentIndex, animated: !theme.reduceMotion, viewPosition: 0 }), 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [currentIndex, loaded, theme.reduceMotion]);

  const current = loaded?.exercises.find((e) => e.id === store.currentExerciseId) ?? null;
  const availableEquipment = useMemo(() => new Set<EquipmentId>(catalog.flatMap((c) => c.equipmentIds)), [catalog]);
  const allDone = loaded ? loaded.exercises.every(isExerciseDone) : false;
  const totalPlanned = loaded ? loaded.exercises.filter((e) => !e.skipped).reduce((a, e) => a + e.targetSnapshot.workingSets, 0) : 0;
  const totalDone = loaded ? loaded.exercises.reduce((a, e) => a + e.sets.filter((s) => s.setType === 'working').length, 0) : 0;
  const elapsed = loaded ? Math.max(0, (now - Date.parse(loaded.session.startedAt)) / 1000) : 0;

  const warmupHint = useMemo(() => {
    if (!current || !store.draft || store.draft.load === null) return null;
    const te = loaded?.exercises.find((e) => e.id === current.id);
    const priority = te?.templateExerciseId ? 1 : 2; // template exercises carry priority in the program; approximate for ad-hoc
    const w = suggestWarmups(current.exercise, unitToKg(store.draft.load, unit), priority, unit);
    if (!w) return null;
    return `Add ${w.sets.length} warm-up sets (${w.sets.map((s) => Math.round(displayInUnit(s.loadKg, unit, current.exercise.incrementKg))).join(', ')} ${unit})`;
  }, [current, store.draft, unit, loaded]);

  const openWhy = useCallback(() => {
    if (!current) return;
    const load = store.draft?.suggestedLoad;
    setWhyTarget({ title: load === null || load === undefined ? `${current.exercise.name}: starting load` : `${current.exercise.name}: ${load} ${unit}`, explanation: current.targetSnapshot.explanation });
    setSheet('why');
  }, [current, store.draft, unit]);

  const finish = async () => {
    setSheet(null);
    const result = await store.finish();
    if (!result) toast.show({ message: "Couldn't finish the session. Try again." });
  };

  const onPr = store.lastPr;
  useEffect(() => {
    if (onPr) {
      toast.show({ message: `New best on ${onPr.exerciseName}` });
      useSessionStore.setState({ lastPr: null });
    }
  }, [onPr, toast]);

  if (store.error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <ErrorState message={store.error.message} onRetry={() => store.load(sessionId)} />
      </SafeAreaView>
    );
  }

  if (store.finished && loaded) {
    return (
      <SummaryView
        name={loaded.session.name}
        summary={store.finished.summary}
        nextTime={store.finished.nextTime}
        unit={unit}
        onDone={async (note) => {
          if (note) await store.saveSessionNotes(note);
          store.clear();
          router.replace('/');
        }}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { paddingHorizontal: theme.spacing.sm }]}>
        <IconButton icon="chevron-down" accessibilityLabel="Minimise workout" onPress={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="headline" numberOfLines={1}>
            {loaded?.session.name ?? ''}
          </Text>
          <Text variant="caption" color="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>
            {formatDuration(elapsed)}
          </Text>
        </View>
        <IconButton icon="ellipsis-horizontal" accessibilityLabel="Workout options" onPress={() => setSheet('session')} />
      </View>
      <View style={[styles.progress, { paddingHorizontal: theme.sizes.screenPaddingH }]}>
        <View style={{ flex: 1 }}>
          <ProgressBar progress={totalPlanned > 0 ? totalDone / totalPlanned : 0} accessibilityLabel={`${totalDone} of ${totalPlanned} sets`} />
        </View>
        <Text variant="caption" color="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>
          {totalDone} / {totalPlanned} sets
        </Text>
      </View>

      {!loaded ? (
        <View style={{ padding: theme.sizes.screenPaddingH, gap: theme.spacing.md }}>
          <Skeleton height={28} width="60%" />
          <Skeleton height={16} width="40%" />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={loaded.exercises}
          keyExtractor={(e) => e.id}
          extraData={[store.currentExerciseId, store.draft, previousByExercise]}
          contentContainerStyle={{ paddingBottom: dockHeight + theme.spacing.xxl, paddingTop: theme.spacing.sm }}
          onScrollToIndexFailed={() => undefined}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <ExerciseBlock
              item={item}
              index={index}
              isCurrent={item.id === store.currentExerciseId}
              isDone={isExerciseDone(item)}
              draft={item.id === store.currentExerciseId ? store.draft : null}
              unit={unit}
              scale={scale}
              previous={previousByExercise[item.exercise.id] ?? null}
              warmupHint={item.id === store.currentExerciseId ? warmupHint : null}
              onSelect={() => store.setCurrent(item.id)}
              onEditSet={(setId) => store.editSet(item.id, setId)}
              onDeleteSet={(setId) => store.deleteSet(item.id, setId)}
              onAddSet={() => store.addSet(item.id)}
              onAddWarmups={() => {
                if (!store.draft || store.draft.load === null) return;
                const w = suggestWarmups(item.exercise, unitToKg(store.draft.load, unit), 1, unit);
                if (w) store.addWarmups(item.id, w.sets);
              }}
              onSwap={() => setSheet('swap')}
              onNote={() => setSheet('note')}
              onSkip={() => setSheet('skip')}
              onUnskip={() => store.unskipExercise(item.id)}
              onMenu={() => setSheet('menu')}
            />
          )}
        />
      )}

      <View style={styles.dockHost}>
        <InputDock
          exercise={current}
          draft={store.draft}
          unit={unit}
          scale={scale}
          rest={rest}
          now={now}
          restDone={restEnded}
          allDone={allDone}
          onChange={store.updateDraft}
          onOpenKeypad={(field) => setSheet(field === 'load' ? 'keypad-load' : 'keypad-reps')}
          onOpenRir={() => setSheet('rir')}
          onComplete={() => {
            if (allDone && store.draft?.setId == null && current) {
              store.addSet(current.id);
              return;
            }
            store.completeSet().catch(() => toast.show({ message: "Couldn't save that set", action: { label: 'Retry', onPress: () => store.completeSet() } }));
          }}
          onCancelEdit={store.cancelEdit}
          onWhy={openWhy}
          onFinish={() => (allDone ? finish() : setSheet('finish'))}
          onAdjustRest={store.adjustRest}
          onSkipRest={store.skipRest}
          onLayout={setDockHeight}
        />
      </View>

      <NumericKeypad
        visible={sheet === 'keypad-load' || sheet === 'keypad-reps'}
        title={sheet === 'keypad-reps' ? 'Reps' : current && (current.exercise.loadType === 'bodyweight' || current.exercise.loadType === 'bodyweight_plus') ? 'Added weight' : 'Weight'}
        initialValue={sheet === 'keypad-reps' ? (store.draft?.reps ?? 0) : (store.draft?.load ?? 0)}
        unit={sheet === 'keypad-reps' ? 'reps' : unit}
        allowDecimal={sheet !== 'keypad-reps'}
        quickAdds={sheet === 'keypad-reps' || !current ? [] : [incrementStepInUnit(current.exercise.incrementKg, unit), incrementStepInUnit(current.exercise.incrementKg, unit) * 2, incrementStepInUnit(current.exercise.incrementKg, unit) * 4]}
        onSubmit={(v) => store.updateDraft(sheet === 'keypad-reps' ? { reps: Math.round(v) } : { load: v })}
        onClose={() => setSheet(null)}
      />
      <RirSheet visible={sheet === 'rir'} value={store.draft?.rir ?? null} scale={scale} onSelect={(rir) => store.updateDraft({ rir })} onClose={() => setSheet(null)} />
      <WhySheet visible={sheet === 'why'} onClose={() => setSheet(null)} title={whyTarget?.title ?? ''} explanation={whyTarget?.explanation ?? null} />
      <SwapSheet
        visible={sheet === 'swap'}
        item={current}
        candidates={catalog}
        availableEquipment={availableEquipment}
        onSwap={async (to, reason, scope) => {
          if (!current) return;
          setSheet(null);
          await store.swap(current.id, to, reason, scope);
          toast.show({ message: `Swapped to ${to.name}${scope === 'program' ? ' in your program' : ''}` });
        }}
        onClose={() => setSheet(null)}
      />
      <NoteSheet key={`${current?.id ?? ''}:${current?.notes ?? ''}`} visible={sheet === 'note'} title={current ? `Note · ${current.exercise.name}` : 'Note'} initial={current?.notes ?? null} onSave={(t) => current && store.setNotes(current.id, t)} onClose={() => setSheet(null)} />
      <SkipSheet
        visible={sheet === 'skip'}
        exerciseName={current?.exercise.name ?? ''}
        onSkip={(reason) => {
          setSheet(null);
          if (current) store.skipExercise(current.id, reason);
        }}
        onClose={() => setSheet(null)}
      />
      <ExerciseMenuSheet
        visible={sheet === 'menu'}
        item={current}
        onClose={() => setSheet(null)}
        onInfo={() => setSheet('info')}
        onSwap={() => setSheet('swap')}
        onNote={() => setSheet('note')}
        onSkip={() => setSheet('skip')}
        onRest={(s) => {
          if (current) store.setRestOverride(current.id, s);
          setSheet(null);
        }}
      />
      <ExerciseInfoSheet visible={sheet === 'info'} exercise={current?.exercise ?? null} onClose={() => setSheet(null)} />
      <SessionMenuSheet
        visible={sheet === 'session'}
        onClose={() => setSheet(null)}
        onFinish={() => (allDone ? finish() : setSheet('finish'))}
        onAddExercise={() => setSheet('add')}
        onDiscard={() => setSheet('discard')}
        autoRest={store.autoStartRest}
        onToggleAutoRest={() => useSessionStore.setState({ autoStartRest: !store.autoStartRest })}
      />
      <AddExerciseSheet
        visible={sheet === 'add'}
        candidates={catalog}
        onPick={(e) => {
          setSheet(null);
          store.addExercise(e);
        }}
        onClose={() => setSheet(null)}
      />
      <ConfirmSheet
        visible={sheet === 'finish'}
        title="Finish early?"
        message={`${Math.max(0, totalPlanned - totalDone)} planned sets are not done. You can finish now and keep what you logged.`}
        confirmLabel="Finish workout"
        onConfirm={finish}
        onClose={() => setSheet(null)}
      />
      <ConfirmSheet
        visible={sheet === 'discard'}
        title="Discard this workout?"
        message="Nothing from this session will be kept."
        confirmLabel="Discard"
        destructive
        onConfirm={async () => {
          setSheet(null);
          await store.abandon();
          router.replace('/');
        }}
        onClose={() => setSheet(null)}
      />
    </SafeAreaView>
  );
}

function displayInUnit(kg: number, unit: 'lb' | 'kg', incrementKg: number): number {
  const step = incrementStepInUnit(incrementKg, unit);
  const value = unit === 'kg' ? kg : kg / 0.45359237;
  return Math.round(value / step) * step;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', height: 56, gap: 8 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 4 },
  dockHost: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
