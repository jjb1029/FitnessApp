import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LoadedExercise } from '@/data/repositories';
import type { IntensityScale, WeightUnit } from '@/domain';
import { formatDuration } from '@/lib/dates';
import { incrementStepInUnit, trimNumber } from '@/lib/units';
import type { Draft, RestState } from '@/store/sessionStore';
import { Button, ProgressBar, Stepper, Text, useTheme } from '@/ui';

import { effortLabel, effortValue, isBodyweightExercise } from './format';

export type InputDockProps = {
  exercise: LoadedExercise | null;
  draft: Draft | null;
  unit: WeightUnit;
  scale: IntensityScale;
  rest: RestState | null;
  now: number;
  restDone: boolean;
  allDone: boolean;
  onChange: (patch: Partial<Pick<Draft, 'load' | 'reps' | 'rir'>>) => void;
  onOpenKeypad: (field: 'load' | 'reps') => void;
  onOpenRir: () => void;
  onComplete: () => void;
  onCancelEdit: () => void;
  onWhy: () => void;
  onFinish: () => void;
  onAdjustRest: (delta: number) => void;
  onSkipRest: () => void;
  onLayout?: (height: number) => void;
};

/** The sticky bottom dock: context line, Weight / Reps / RIR, Complete set, and the rest timer (docs/13 §W1). */
export function InputDock(p: InputDockProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { exercise, draft, unit, scale, rest } = p;
  const bodyweight = exercise ? isBodyweightExercise(exercise.exercise) : false;
  const step = exercise ? incrementStepInUnit(exercise.exercise.incrementKg, unit) : 5;
  const editing = draft?.setId !== null && draft?.setId !== undefined;
  const planned = exercise?.targetSnapshot.workingSets ?? 0;
  const workingDone = exercise?.sets.filter((s) => s.setType === 'working').length ?? 0;
  const setNumber = draft?.setType === 'warmup' ? null : editing ? (exercise?.sets.filter((s) => s.setType === 'working').findIndex((s) => s.id === draft?.setId) ?? 0) + 1 : Math.min(planned, workingDone + 1);
  const remaining = rest ? Math.max(0, Math.ceil((rest.endsAt - p.now) / 1000)) : 0;

  const contextLine = (() => {
    if (!draft || !exercise) return '';
    const prefix = draft.setType === 'warmup' ? 'Warm-up' : `Set ${setNumber} of ${Math.max(planned, workingDone + (editing ? 0 : 1))}`;
    if (editing) return `${prefix} · editing`;
    if (draft.suggestedLoad === null) return `${prefix} · Starting load`;
    const matches = draft.load !== null && Math.abs(draft.load - draft.suggestedLoad) < 0.01;
    const delta = exercise.sets.length === 0 && !bodyweight ? suggestedDelta(exercise, draft.suggestedLoad, unit) : '';
    return `${prefix} · Suggested ${bodyweight ? `BW${draft.suggestedLoad > 0 ? ` +${trimNumber(draft.suggestedLoad)} ${unit}` : ''}` : `${trimNumber(draft.suggestedLoad)} ${unit}`}${matches && delta ? ` ${delta}` : ''}`;
  })();

  return (
    <View
      onLayout={(e) => p.onLayout?.(e.nativeEvent.layout.height)}
      style={[styles.dock, { backgroundColor: theme.colors.bg, borderTopColor: theme.colors.border, paddingBottom: Math.max(insets.bottom, theme.spacing.md), paddingHorizontal: theme.spacing.lg }]}>
      {rest && (remaining > 0 || p.restDone) ? (
        <View style={styles.restRow} accessibilityLiveRegion="polite" accessible accessibilityLabel={p.restDone ? 'Rest done' : `Rest ${formatDuration(remaining)} remaining`}>
          <Text variant="headline" color={p.restDone ? 'success' : 'text'} style={styles.restLabel}>
            {p.restDone ? 'Rest done' : `Rest ${formatDuration(remaining)}`}
          </Text>
          <View style={styles.restBar}>
            <ProgressBar progress={rest.totalSeconds > 0 ? 1 - remaining / rest.totalSeconds : 1} color={p.restDone ? 'success' : 'accent'} height={4} />
          </View>
          <Pressable onPress={() => p.onAdjustRest(-15)} accessibilityRole="button" accessibilityLabel="Fifteen seconds less rest" style={styles.restBtn}>
            <Text variant="callout" color="accent" style={styles.restBtnText}>
              −15
            </Text>
          </Pressable>
          <Pressable onPress={() => p.onAdjustRest(15)} accessibilityRole="button" accessibilityLabel="Fifteen seconds more rest" style={styles.restBtn}>
            <Text variant="callout" color="accent" style={styles.restBtnText}>
              +15
            </Text>
          </Pressable>
          <Pressable onPress={p.onSkipRest} accessibilityRole="button" accessibilityLabel="Skip rest" style={styles.restBtn}>
            <Text variant="callout" color="textSecondary" style={styles.restBtnText}>
              Skip
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.contextRow}>
          <Text variant="caption" color="textSecondary" numberOfLines={1} style={{ flex: 1 }}>
            {contextLine}
          </Text>
          {exercise && !editing ? (
            <Pressable onPress={p.onWhy} accessibilityRole="button" accessibilityLabel="Why this target" hitSlop={8} style={styles.why}>
              <Text variant="caption" color="accent" style={{ fontWeight: '600' }}>
                Why?
              </Text>
            </Pressable>
          ) : null}
          {editing ? (
            <Pressable onPress={p.onCancelEdit} accessibilityRole="button" hitSlop={8} style={styles.why}>
              <Text variant="caption" color="accent" style={{ fontWeight: '600' }}>
                Cancel
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {exercise && draft ? (
        <>
          <View style={[styles.fields, { gap: theme.spacing.sm }]}>
            <Stepper
              value={draft.load ?? 0}
              onChange={(v) => p.onChange({ load: v })}
              step={step}
              min={exercise.exercise.loadType === 'assisted' ? 0 : 0}
              unit={bodyweight ? `+${unit}` : unit}
              formatValue={(v) => (draft.load === null ? '—' : trimNumber(v))}
              onPressValue={() => p.onOpenKeypad('load')}
              accessibilityLabel={bodyweight ? 'Added weight' : 'Weight'}
              style={{ flex: 42 }}
            />
            <Stepper value={draft.reps} onChange={(v) => p.onChange({ reps: v })} step={1} min={0} max={100} unit={exercise.exercise.laterality === 'unilateral' ? 'reps / side' : 'reps'} onPressValue={() => p.onOpenKeypad('reps')} accessibilityLabel="Reps" style={{ flex: 34 }} />
            <Pressable
              onPress={p.onOpenRir}
              accessibilityRole="button"
              accessibilityLabel={`${effortLabel(scale)} ${draft.rir === null ? 'not set' : effortValue(draft.rir, scale)}`}
              style={({ pressed }) => [styles.rir, { flex: 24, height: theme.sizes.controlLg, borderRadius: theme.radius.md, backgroundColor: pressed ? theme.colors.border : theme.colors.bgSunken, borderColor: theme.colors.border }]}>
              <Text variant="mono" color="textSecondary">
                {draft.rir === null ? '–' : effortValue(draft.rir, scale)}
              </Text>
              <Text variant="caption" color="textTertiary">
                {effortLabel(scale)} ▾
              </Text>
            </Pressable>
          </View>
          {p.allDone && !editing ? (
            <View style={[styles.finishRow, { gap: theme.spacing.sm }]}>
              <Button label="Finish workout" size="lg" icon="checkmark-done" onPress={p.onFinish} style={{ flex: 1 }} />
              <Button label="Add set" size="lg" variant="secondary" onPress={p.onComplete} />
            </View>
          ) : (
            <Button label={editing ? 'Save set' : 'Complete set'} size="lg" fullWidth icon="checkmark" onPress={p.onComplete} disabled={draft.load === null && exercise.exercise.loadType === 'external'} style={{ marginTop: theme.spacing.sm }} />
          )}
        </>
      ) : (
        <Button label="Finish workout" size="lg" fullWidth icon="checkmark-done" onPress={p.onFinish} style={{ marginTop: theme.spacing.sm }} />
      )}
    </View>
  );
}

function suggestedDelta(exercise: LoadedExercise, suggested: number, unit: WeightUnit): string {
  void unit;
  const rule = exercise.targetSnapshot.explanation.ruleId;
  if (rule.includes('increase') || rule.includes('calibrate') || rule.includes('linear.increase')) return '↑';
  if (rule.includes('reduce') || rule.includes('layoff')) return '↓';
  return '';
}

const styles = StyleSheet.create({
  dock: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  contextRow: { flexDirection: 'row', alignItems: 'center', minHeight: 28, gap: 8 },
  why: { minHeight: 28, justifyContent: 'center', paddingHorizontal: 4 },
  restRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36, gap: 8 },
  restLabel: { fontVariant: ['tabular-nums'], minWidth: 96 },
  restBar: { flex: 1 },
  restBtn: { minHeight: 44, minWidth: 40, alignItems: 'center', justifyContent: 'center' },
  restBtnText: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  fields: { flexDirection: 'row', alignItems: 'stretch', marginTop: 4 },
  rir: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  finishRow: { flexDirection: 'row', marginTop: 8 },
});
