import { Pressable, StyleSheet, View } from 'react-native';

import type { LoadedExercise } from '@/data/repositories';
import type { IntensityScale, WeightUnit } from '@/domain';
import type { Draft } from '@/store/sessionStore';
import { Button, IconButton, StatusPill, Text, useTheme } from '@/ui';
import { trimNumber } from '@/lib/units';

import { SetRow } from './SetRow';
import { formatEffort, formatSetLoad } from './format';

export type ExerciseBlockProps = {
  item: LoadedExercise;
  index: number;
  isCurrent: boolean;
  isDone: boolean;
  draft: Draft | null;
  unit: WeightUnit;
  scale: IntensityScale;
  previous: string | null;
  warmupHint: string | null;
  onSelect: () => void;
  onEditSet: (setId: string) => void;
  onDeleteSet: (setId: string) => void;
  onAddSet: () => void;
  onAddWarmups: () => void;
  onSwap: () => void;
  onNote: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  onMenu: () => void;
};

/** One exercise in the vertical list: expanded when current, one line otherwise (docs/13 §W1). */
export function ExerciseBlock(p: ExerciseBlockProps) {
  const theme = useTheme();
  const { item, unit, scale } = p;
  const snap = item.targetSnapshot;
  const working = item.sets.filter((s) => s.setType === 'working');
  const planned = snap.workingSets;

  if (!p.isCurrent) {
    const summary = item.skipped
      ? `Skipped${item.skipReason ? ` · ${skipLabel(item.skipReason)}` : ''}`
      : p.isDone
        ? `✓ ${working.length} ${working.length === 1 ? 'set' : 'sets'}`
        : `${planned} × ${snap.repRange.min}–${snap.repRange.max}${p.previous ? ` · last ${p.previous}` : ''}`;
    return (
      <Pressable
        onPress={p.onSelect}
        accessibilityRole="button"
        accessibilityLabel={`${item.exercise.name}, ${working.length} of ${planned} sets. ${summary}`}
        style={({ pressed }) => [styles.collapsed, { minHeight: 60, paddingHorizontal: theme.sizes.screenPaddingH, backgroundColor: pressed ? theme.colors.bgSunken : 'transparent', borderBottomColor: theme.colors.border }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline" color={item.skipped ? 'textTertiary' : p.isDone ? 'textSecondary' : 'text'} numberOfLines={1}>
            {item.exercise.name}
          </Text>
          <Text variant="caption" color="textTertiary" numberOfLines={1}>
            {summary}
          </Text>
        </View>
        <Text variant="mono" color={p.isDone ? 'success' : 'textTertiary'}>
          {working.length} / {planned}
        </Text>
      </Pressable>
    );
  }

  const rows: React.ReactNode[] = [];
  let workingIndex = 0;
  for (const set of item.sets) {
    if (set.setType === 'working') workingIndex += 1;
    rows.push(
      <SetRow
        key={set.id}
        kind="done"
        index={set.setType === 'working' ? workingIndex : 0}
        set={set}
        exercise={item.exercise}
        unit={unit}
        scale={scale}
        editing={p.draft?.setId === set.id}
        onPress={() => p.onEditSet(set.id)}
        onDelete={() => p.onDeleteSet(set.id)}
      />,
    );
  }
  const currentLabel = p.draft && p.draft.setId === null ? draftLabel(p.draft, item, unit, scale) : null;
  if (currentLabel && !item.skipped) {
    rows.push(<SetRow key="current" kind="current" index={workingIndex + 1} label={currentLabel} setType={p.draft?.setType ?? 'working'} />);
    for (let i = workingIndex + 2; i <= planned; i++) {
      rows.push(<SetRow key={`pending-${i}`} kind="pending" index={i} label={pendingLabel(p.draft!, item, unit)} setType="working" />);
    }
  }

  return (
    <View style={[styles.expanded, { backgroundColor: theme.colors.bgElevated, borderColor: theme.colors.border, paddingHorizontal: theme.sizes.screenPaddingH, paddingVertical: theme.spacing.md }]}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title2" numberOfLines={2}>
            {item.exercise.name}
          </Text>
          <Text variant="callout" color="textSecondary">
            {planned} × {snap.repRange.min}–{snap.repRange.max} · {formatEffort(snap.targetRir, scale)} · rest {formatRest(item.restSecondsOverride ?? snap.restSeconds)}
          </Text>
          <Text variant="caption" color="textTertiary">
            {p.previous ? `Last time ${p.previous}` : 'First time'}
          </Text>
        </View>
        <IconButton icon="ellipsis-horizontal" accessibilityLabel="Exercise options" onPress={p.onMenu} />
      </View>

      {item.notes ? (
        <Text variant="caption" color="textSecondary" style={{ fontStyle: 'italic', marginTop: 4 }}>
          {item.notes}
        </Text>
      ) : null}
      {item.substitutedFromExerciseId ? <StatusPill label="Swapped in" tone="neutral" icon="swap-horizontal" /> : null}

      {item.skipped ? (
        <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
          <StatusPill label={`Skipped${item.skipReason ? ` · ${skipLabel(item.skipReason)}` : ''}`} tone="warning" icon="remove-circle-outline" />
          <Button label="Do it after all" variant="secondary" onPress={p.onUnskip} />
        </View>
      ) : (
        <>
          <View style={{ marginTop: theme.spacing.md, gap: 2 }}>{rows}</View>
          {p.warmupHint && item.sets.length === 0 ? (
            <Pressable onPress={p.onAddWarmups} accessibilityRole="button" style={{ minHeight: 40, justifyContent: 'center' }}>
              <Text variant="callout" color="accent">
                {p.warmupHint}
              </Text>
            </Pressable>
          ) : null}
          <View style={[styles.actions, { marginTop: theme.spacing.sm }]}>
            <Button label="Add set" variant="ghost" icon="add" onPress={p.onAddSet} />
            <View style={styles.actionsRight}>
              <Button label="Swap" variant="ghost" onPress={p.onSwap} />
              <Button label="Note" variant="ghost" onPress={p.onNote} />
              <Button label="Skip" variant="ghost" onPress={p.onSkip} />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

function draftLabel(draft: Draft, item: LoadedExercise, unit: WeightUnit, scale: IntensityScale): string {
  const load = draft.load === null ? (item.exercise.loadType === 'external' ? '—' : 'BW') : formatDraftLoad(draft.load, item, unit);
  return `${load} × ${draft.reps}${draft.rir !== null ? ` · ${formatEffort(draft.rir, scale)}` : ''}`;
}

function pendingLabel(draft: Draft, item: LoadedExercise, unit: WeightUnit): string {
  const load = draft.load === null ? (item.exercise.loadType === 'external' ? '—' : 'BW') : formatDraftLoad(draft.load, item, unit);
  return `${load} × –`;
}

function formatDraftLoad(load: number, item: LoadedExercise, unit: WeightUnit): string {
  if (item.exercise.loadType === 'bodyweight' || item.exercise.loadType === 'bodyweight_plus') return load > 0 ? `BW +${trimNumber(load)} ${unit}` : 'BW';
  return `${trimNumber(load)} ${unit}`;
}

export function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

export function previousSummary(item: LoadedExercise, previous: { loadKg: number | null; addedLoadKg?: number | null; reps: number }[] | null, unit: WeightUnit): string | null {
  if (!previous || previous.length === 0) return null;
  const loads = new Set(previous.map((s) => formatSetLoad(item.exercise, s.loadKg, s.addedLoadKg ?? null, unit)));
  const load = loads.size === 1 ? [...loads][0] : previous.map((s) => formatSetLoad(item.exercise, s.loadKg, s.addedLoadKg ?? null, unit)).join('/');
  return `${load} × ${previous.map((s) => s.reps).join(' · ')}`;
}

function skipLabel(reason: string): string {
  return { no_time: 'no time', equipment_busy: 'equipment busy', not_feeling_it: 'not feeling it', discomfort: 'discomfort' }[reason] ?? reason;
}

const styles = StyleSheet.create({
  collapsed: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  expanded: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: -8 },
  actionsRight: { flexDirection: 'row' },
});
