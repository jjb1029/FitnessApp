import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LoadedExercise } from '@/data/repositories';
import type { IntensityScale, WeightUnit } from '@/domain';
import { ENTER_WEIGHT_LINE } from '@/engine';
import { formatDuration } from '@/lib/dates';
import { incrementStepInUnit, trimNumber } from '@/lib/units';
import type { Draft, Moment, RestState } from '@/store/sessionStore';
import { Button, ProgressBar, Stepper, Text, useTheme, type ColorName } from '@/ui';

import { effortLabel, effortValue, isBodyweightExercise } from './format';

export type InputDockProps = {
  exercise: LoadedExercise | null;
  draft: Draft | null;
  unit: WeightUnit;
  scale: IntensityScale;
  rest: RestState | null;
  now: number;
  /** True during the short "Rest's up." beat after the countdown ends. */
  restEnded: boolean;
  /** Changes each time rest ends; triggers the one-time highlight on Complete set. */
  returnKey: number;
  moment: Moment | null;
  /** Forma's sentence about the current target. */
  targetSentence: string;
  allDone: boolean;
  onChange: (patch: Partial<Pick<Draft, 'load' | 'reps' | 'rir'>>) => void;
  onBump: () => void;
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

/**
 * The sticky bottom dock (docs/13 §W1, docs/14 §3). Two modes: lifting, where
 * the fields and Complete set lead; and recovery, where the countdown leads,
 * the fields dim, and the next set waits. Same controls, same positions, so
 * logging never gets slower.
 */
export function InputDock(p: InputDockProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { exercise, draft, unit, scale, rest, moment, now } = p;
  const bodyweight = exercise ? isBodyweightExercise(exercise.exercise) : false;
  const step = exercise ? incrementStepInUnit(exercise.exercise.incrementKg, unit) : 5;
  const editing = draft?.setId !== null && draft?.setId !== undefined;
  const remainingMs = rest ? rest.endsAt - now : 0;
  const remaining = Math.max(0, Math.ceil(remainingMs / 1000));
  const resting = rest !== null && (remaining > 0 || p.restEnded);
  const momentActive = moment !== null && now < moment.until;
  const lastSeconds = resting && !p.restEnded && remaining <= 3;

  const needsWeight = draft !== null && draft.load === null && exercise?.exercise.loadType === 'external';
  const contextLine = editing ? 'Editing this set.' : needsWeight ? ENTER_WEIGHT_LINE : p.targetSentence;
  const lineColor: ColorName = momentActive ? (moment.tone === 'success' ? 'success' : moment.tone === 'accent' ? 'accent' : 'text') : 'textSecondary';

  const nextPreview = draft && exercise ? nextSetPreview(draft, exercise, unit, bodyweight) : null;

  return (
    <View
      onLayout={(e) => p.onLayout?.(e.nativeEvent.layout.height)}
      style={[
        styles.dock,
        {
          backgroundColor: resting ? theme.colors.bgElevated : theme.colors.bg,
          paddingBottom: Math.max(insets.bottom, theme.spacing.md),
          paddingHorizontal: theme.spacing.lg,
        },
      ]}>
      {resting ? (
        <View style={styles.recovery} accessibilityLiveRegion="polite">
          <View style={styles.recoveryTop}>
            <Text variant="callout" color={momentActive ? lineColor : p.restEnded ? 'accent' : 'textSecondary'} style={{ flex: 1, fontWeight: momentActive || p.restEnded ? '600' : '400' }} numberOfLines={1}>
              {momentActive ? moment.line : p.restEnded ? "Rest's up." : 'Rest'}
            </Text>
            <Pressable onPress={p.onSkipRest} accessibilityRole="button" accessibilityLabel="Skip rest" hitSlop={8} style={styles.skip}>
              <Text variant="callout" color="textSecondary" style={{ fontWeight: '600' }}>
                Skip
              </Text>
            </Pressable>
          </View>
          <View style={styles.countdownRow}>
            <Text variant="monoDisplay" color={p.restEnded ? 'accent' : lastSeconds ? 'accent' : 'text'} accessibilityLabel={`${remaining} seconds remaining`}>
              {p.restEnded ? '0:00' : formatDuration(remaining)}
            </Text>
            <View style={styles.adjust}>
              <Pressable onPress={() => p.onAdjustRest(-15)} accessibilityRole="button" accessibilityLabel="Fifteen seconds less rest" style={[styles.adjustBtn, { backgroundColor: theme.colors.bgSunken, borderRadius: theme.radius.md }]}>
                <Text variant="callout" style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                  −15
                </Text>
              </Pressable>
              <Pressable onPress={() => p.onAdjustRest(15)} accessibilityRole="button" accessibilityLabel="Fifteen seconds more rest" style={[styles.adjustBtn, { backgroundColor: theme.colors.bgSunken, borderRadius: theme.radius.md }]}>
                <Text variant="callout" style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                  +15
                </Text>
              </Pressable>
            </View>
          </View>
          <ProgressBar progress={rest.totalSeconds > 0 ? 1 - remaining / rest.totalSeconds : 1} color={p.restEnded ? 'success' : 'accent'} height={3} />
          {nextPreview ? (
            <Text variant="caption" color="textTertiary" numberOfLines={1}>
              Next: {nextPreview}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.contextRow}>
          <Text variant="callout" color={lineColor} numberOfLines={1} style={{ flex: 1, fontWeight: momentActive ? '600' : '400' }}>
            {momentActive ? moment.line : contextLine}
          </Text>
          {exercise && !editing && !momentActive ? (
            <Pressable onPress={p.onWhy} accessibilityRole="button" accessibilityLabel="Why this target" hitSlop={8} style={styles.why}>
              <Text variant="callout" color="accent" style={{ fontWeight: '600' }}>
                Why?
              </Text>
            </Pressable>
          ) : null}
          {editing ? (
            <Pressable onPress={p.onCancelEdit} accessibilityRole="button" hitSlop={8} style={styles.why}>
              <Text variant="callout" color="accent" style={{ fontWeight: '600' }}>
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
              onBump={p.onBump}
              step={step}
              min={0}
              unit={bodyweight ? `+${unit}` : unit}
              formatValue={(v) => (draft.load === null ? '—' : trimNumber(v))}
              onPressValue={() => p.onOpenKeypad('load')}
              accessibilityLabel={bodyweight ? 'Added weight' : 'Weight'}
              muted={resting}
              style={{ flex: 42 }}
            />
            <Stepper value={draft.reps} onChange={(v) => p.onChange({ reps: v })} onBump={p.onBump} step={1} min={0} max={100} unit={exercise.exercise.laterality === 'unilateral' ? 'reps / side' : 'reps'} onPressValue={() => p.onOpenKeypad('reps')} accessibilityLabel="Reps" muted={resting} style={{ flex: 34 }} />
            <Pressable
              onPress={p.onOpenRir}
              accessibilityRole="button"
              accessibilityLabel={`${effortLabel(scale)} ${draft.rir === null ? 'not set' : effortValue(draft.rir, scale)}`}
              style={({ pressed }) => [styles.rir, { flex: 24, height: theme.sizes.controlLg, borderRadius: theme.radius.md, backgroundColor: pressed ? theme.colors.border : theme.colors.bgSunken, borderColor: theme.colors.border, opacity: resting ? 0.6 : 1 }]}>
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
            <ReturnHighlight returnKey={p.returnKey} reduceMotion={theme.reduceMotion} tint={theme.colors.accentSubtle} radius={theme.radius.md}>
              <Button
                label={editing ? 'Save set' : 'Complete set'}
                size="lg"
                fullWidth
                icon="checkmark"
                variant={resting && !p.restEnded ? 'secondary' : 'primary'}
                onPress={p.onComplete}
                disabled={needsWeight}
                style={{ marginTop: theme.spacing.sm }}
              />
            </ReturnHighlight>
          )}
        </>
      ) : (
        <Button label="Finish workout" size="lg" fullWidth icon="checkmark-done" onPress={p.onFinish} style={{ marginTop: theme.spacing.sm }} />
      )}
    </View>
  );
}

function nextSetPreview(draft: Draft, exercise: LoadedExercise, unit: WeightUnit, bodyweight: boolean): string {
  const load = draft.load === null ? (bodyweight ? 'BW' : '—') : bodyweight ? (draft.load > 0 ? `BW +${trimNumber(draft.load)} ${unit}` : 'BW') : `${trimNumber(draft.load)} ${unit}`;
  const setNo = exercise.sets.filter((s) => s.setType === 'working').length + 1;
  const name = exercise.exercise.name;
  return `${name} · set ${Math.min(setNo, exercise.targetSnapshot.workingSets)} · ${load} × ${draft.reps}`;
}

/** One soft flash behind Complete set when rest ends, so the eye returns to the action. */
function ReturnHighlight({ returnKey, reduceMotion, tint, radius, children }: { returnKey: number; reduceMotion: boolean; tint: string; radius: number; children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (returnKey === 0 || reduceMotion) return;
    opacity.set(withTiming(1, { duration: 150 }));
    opacity.set(withDelay(500, withTiming(0, { duration: 500 })));
  }, [returnKey, reduceMotion, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: 8, backgroundColor: tint, borderRadius: radius, transform: [{ scale: 1.03 }] }, style]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { paddingTop: 8, boxShadow: '0 -6px 18px rgba(0, 0, 0, 0.18)' },
  contextRow: { flexDirection: 'row', alignItems: 'center', minHeight: 32, gap: 8 },
  why: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 4 },
  recovery: { gap: 6, paddingBottom: 4 },
  recoveryTop: { flexDirection: 'row', alignItems: 'center', minHeight: 28, gap: 8 },
  skip: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  countdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  adjust: { flexDirection: 'row', gap: 8 },
  adjustBtn: { minHeight: 44, minWidth: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  fields: { flexDirection: 'row', alignItems: 'stretch', marginTop: 4 },
  rir: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  finishRow: { flexDirection: 'row', marginTop: 8 },
});
