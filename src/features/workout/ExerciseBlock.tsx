import { Pressable, StyleSheet, View } from 'react-native';

import type { LoadedExercise } from '@/data/repositories';
import type { IntensityScale, WeightUnit } from '@/domain';
import type { SetRecord } from '@/engine';
import { trimNumber } from '@/lib/units';
import type { Draft } from '@/store/sessionStore';
import { Button, Icon, IconButton, StatusPill, Text, useTheme } from '@/ui';

import { SetRow, type RowParts } from './SetRow';
import { formatEffort, formatSetLoad, type LoadParts } from './format';

export type ExerciseBlockProps = {
  item: LoadedExercise;
  index: number;
  isCurrent: boolean;
  isDone: boolean;
  /** The exercise after the current one. */
  isNext: boolean;
  resting: boolean;
  draft: Draft | null;
  unit: WeightUnit;
  scale: IntensityScale;
  previous: SetRecord[] | null;
  justLandedSetId: string | null;
  warmupHint: string | null;
  onSelect: () => void;
  onEditSet: (setId: string) => void;
  onDeleteSet: (setId: string) => void;
  onAddSet: () => void;
  onAddWarmups: () => void;
  onUnskip: () => void;
  onMenu: () => void;
};

/**
 * One exercise in the vertical list: expanded when current, one line
 * otherwise (docs/13 §W1, docs/14 §1). The expanded block carries the
 * target in words, what happened last time, and the set rows; the actions
 * are Add set and a menu so the rows stay the loudest thing.
 */
export function ExerciseBlock(p: ExerciseBlockProps) {
  const theme = useTheme();
  const { item, unit, scale } = p;
  const snap = item.targetSnapshot;
  const working = item.sets.filter((s) => s.setType === 'working');
  const planned = snap.workingSets;
  const lastTime = previousSummary(item, p.previous, unit);

  if (!p.isCurrent) {
    const subtitle = item.skipped
      ? `Skipped · ${skipLabel(item.skipReason)}`
      : p.isDone
        ? `Done · ${working.length} ${working.length === 1 ? 'set' : 'sets'}`
        : working.length > 0
          ? `${working.length} of ${planned} sets · ${specLine(snap.workingSets, snap.repRange.min, snap.repRange.max)}`
          : `${specLine(planned, snap.repRange.min, snap.repRange.max)}${lastTime ? ` · last ${lastTime}` : ''}`;
    return (
      <Pressable
        onPress={p.onSelect}
        accessibilityRole="button"
        accessibilityLabel={`${item.exercise.name}. ${subtitle}${p.isNext ? '. Next.' : ''}`}
        style={({ pressed }) => [styles.collapsed, { minHeight: 60, paddingHorizontal: theme.sizes.screenPaddingH, backgroundColor: pressed ? theme.colors.bgSunken : 'transparent' }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.titleRow}>
            <Text variant="headline" color={item.skipped ? 'textTertiary' : p.isDone ? 'textSecondary' : 'text'} numberOfLines={1} style={{ flexShrink: 1 }}>
              {item.exercise.name}
            </Text>
            {p.isNext && !p.isDone && !item.skipped ? <StatusPill label="Next" tone="accent" icon="arrow-forward" /> : null}
          </View>
          <Text variant="caption" color="textTertiary" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {p.isDone && !item.skipped ? <Icon name="checkmark-circle" size={20} color="success" /> : null}
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
        justLanded={p.justLandedSetId === set.id}
        onPress={() => p.onEditSet(set.id)}
        onDelete={() => p.onDeleteSet(set.id)}
      />,
    );
  }
  const draftParts = p.draft && p.draft.setId === null ? draftRowParts(p.draft, item, unit, scale) : null;
  if (draftParts && !item.skipped) {
    rows.push(<SetRow key="current" kind="current" index={workingIndex + 1} parts={draftParts} setType={p.draft?.setType ?? 'working'} resting={p.resting} />);
    for (let i = workingIndex + 2; i <= planned; i++) {
      rows.push(<SetRow key={`pending-${i}`} kind="pending" index={i} parts={{ ...draftParts, reps: '–', effort: null }} setType="working" />);
    }
  }

  const firstTime = !lastTime;

  return (
    <View style={[styles.expanded, { backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.lg, marginHorizontal: theme.spacing.sm, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md }]}>
      {/* The dock owns the exercise's identity and its numbers; this block is the history. */}
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline" numberOfLines={2}>
            {item.exercise.name}
          </Text>
          <Text variant="caption" color="textTertiary">
            {firstTime ? 'First time' : `Last time ${lastTime}`} · {formatRest(item.restSecondsOverride ?? snap.restSeconds)} rest
          </Text>
        </View>
        <IconButton icon="ellipsis-horizontal" accessibilityLabel="Exercise options: swap, note, skip, how to do it, rest" onPress={p.onMenu} />
      </View>

      {item.notes ? (
        <Text variant="caption" color="textSecondary" style={{ fontStyle: 'italic', marginTop: 4 }}>
          {item.notes}
        </Text>
      ) : null}
      {item.substitutedFromExerciseId ? (
        <View style={{ marginTop: 6 }}>
          <StatusPill label="Swapped in" tone="neutral" icon="swap-horizontal" />
        </View>
      ) : null}

      {item.skipped ? (
        <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
          <StatusPill label={`Skipped · ${skipLabel(item.skipReason)}`} tone="warning" icon="remove-circle-outline" />
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
          <View style={[styles.actions, { marginTop: theme.spacing.xs }]}>
            <Button label="Add set" variant="ghost" icon="add" onPress={p.onAddSet} />
          </View>
        </>
      )}
    </View>
  );
}

export function specLine(sets: number, min: number, max: number): string {
  return `${sets} ${sets === 1 ? 'set' : 'sets'} of ${min}–${max}`;
}

/** The draft, split so the row is set with the same numeric treatment as a logged one. */
function draftRowParts(draft: Draft, item: LoadedExercise, unit: WeightUnit, scale: IntensityScale): RowParts {
  const bodyweight = item.exercise.loadType === 'bodyweight' || item.exercise.loadType === 'bodyweight_plus';
  const load: LoadParts =
    draft.load === null
      ? { text: item.exercise.loadType === 'external' ? '—' : 'BW' }
      : bodyweight
        ? draft.load > 0
          ? { value: `BW +${trimNumber(draft.load)}`, unit }
          : { text: 'BW' }
        : { value: trimNumber(draft.load), unit };
  return { load, reps: String(draft.reps), perSide: item.exercise.laterality === 'unilateral', effort: draft.rir !== null ? formatEffort(draft.rir, scale) : null };
}

export function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

/** "75 lb × 9 · 9 · 8" from the previous session's working sets. */
export function previousSummary(item: LoadedExercise, previous: SetRecord[] | null, unit: WeightUnit): string | null {
  if (!previous || previous.length === 0) return null;
  const loads = new Set(previous.map((s) => formatSetLoad(item.exercise, s.loadKg, s.loadKg, unit)));
  const load = loads.size === 1 ? [...loads][0] : previous.map((s) => formatSetLoad(item.exercise, s.loadKg, s.loadKg, unit)).join('/');
  return `${load} × ${previous.map((s) => s.reps).join(' · ')}`;
}

function skipLabel(reason: string | null): string {
  if (!reason) return 'skipped';
  return { no_time: 'no time', equipment_busy: 'equipment busy', not_feeling_it: 'not feeling it', discomfort: 'discomfort' }[reason] ?? reason;
}

const styles = StyleSheet.create({
  collapsed: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expanded: { marginVertical: 4 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', marginLeft: -8 },
});
