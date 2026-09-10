import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LoadedExercise } from '@/data/repositories';
import type { IntensityScale, WeightUnit } from '@/domain';
import { formatDuration } from '@/lib/dates';
import { incrementStepInUnit, trimNumber } from '@/lib/units';
import type { Draft, RestState } from '@/store/sessionStore';
import { Button, DecisionBlock, Measure, ProgressBar, Stepper, Text, useTheme, type ColorName } from '@/ui';

import { effortLabel, effortValue, isBodyweightExercise } from './format';

/**
 * `moment` is Forma speaking because something happened, `decision` is the
 * target it chose, `quiet` is plain reference while the user works.
 */
export type DockLine = { text: string; tone: 'neutral' | 'success' | 'accent'; emphasis: 'moment' | 'decision' | 'quiet' };

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
  /** The single line slot: Forma's moment when it has something to say, the basis otherwise. */
  line: DockLine;
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
 * The current action, as a Decision Block (docs/15 §3, docs/16 §6). The
 * exercise is the eyebrow, Forma's line is the basis, the numbers are the
 * lead, and there is one button. It owns the exercise's identity so the answer
 * to "what am I doing right now" is a single unit, and the numbers are the
 * largest thing on the screen because they are what the user acts on.
 *
 * While resting the same block becomes recovery: the countdown is the lead,
 * the next set is the basis, Skip is the door, and the fields dim but stay
 * usable underneath.
 */
export function InputDock(p: InputDockProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { exercise, draft, unit, scale, rest, line, now } = p;
  const bodyweight = exercise ? isBodyweightExercise(exercise.exercise) : false;
  const step = exercise ? incrementStepInUnit(exercise.exercise.incrementKg, unit) : 5;
  const editing = draft?.setId !== null && draft?.setId !== undefined;
  const remaining = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;
  const resting = rest !== null && (remaining > 0 || p.restEnded);
  const lastSeconds = resting && !p.restEnded && remaining <= 3;
  const needsWeight = draft !== null && draft.load === null && exercise?.exercise.loadType === 'external';

  const lineColor: ColorName = line.tone === 'success' ? 'success' : line.tone === 'accent' ? 'accent' : line.emphasis === 'quiet' ? 'textSecondary' : 'text';
  const nextPreview = draft && exercise ? nextSetPreview(draft, exercise, unit, bodyweight) : null;
  const momentSpeaking = line.emphasis === 'moment';

  const fields =
    exercise && draft ? (
      <View style={[styles.fields, { gap: theme.spacing.sm }]}>
        <Stepper
          value={draft.load ?? 0}
          onChange={(v) => p.onChange({ load: v })}
          onBump={p.onBump}
          step={step}
          min={0}
          size="action"
          unit={bodyweight ? `+${unit}` : unit}
          formatValue={(v) => (draft.load === null ? '—' : trimNumber(v))}
          onPressValue={() => p.onOpenKeypad('load')}
          accessibilityLabel={bodyweight ? 'Added weight' : 'Weight'}
          muted={resting}
          style={{ flex: 46 }}
        />
        <Stepper
          value={draft.reps}
          onChange={(v) => p.onChange({ reps: v })}
          onBump={p.onBump}
          step={1}
          min={0}
          max={100}
          size="action"
          unit={exercise.exercise.laterality === 'unilateral' ? 'reps / side' : 'reps'}
          onPressValue={() => p.onOpenKeypad('reps')}
          accessibilityLabel="Reps"
          muted={resting}
          style={{ flex: 32 }}
        />
        <Pressable
          onPress={p.onOpenRir}
          accessibilityRole="button"
          accessibilityLabel={`${effortLabel(scale)} ${draft.rir === null ? 'not set' : effortValue(draft.rir, scale)}`}
          style={({ pressed }) => [styles.rir, { flex: 22, height: 72, borderRadius: theme.radius.md, backgroundColor: pressed ? theme.colors.border : theme.colors.bgSunken, borderColor: theme.colors.border, opacity: resting ? 0.6 : 1 }]}>
          <Measure value={draft.rir === null ? '–' : effortValue(draft.rir, scale)} size="numBody" tone="textSecondary" accessible={false} />
          <Text variant="caption" color="textTertiary">
            {effortLabel(scale)} ▾
          </Text>
        </Pressable>
      </View>
    ) : null;

  const action =
    exercise && draft ? (
      p.allDone && !editing ? (
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
          />
        </ReturnHighlight>
      )
    ) : (
      <Button label="Finish workout" size="lg" fullWidth icon="checkmark-done" onPress={p.onFinish} />
    );

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
        <View accessibilityLiveRegion="polite">
          <DecisionBlock
            rank="section"
            eyebrow={{ text: 'Resting', tone: 'accent' }}
            door={{ label: 'Skip', onPress: p.onSkipRest, accessibilityLabel: 'Skip rest' }}
            lead={
              <View style={styles.countdownRow}>
                <Measure
                  value={p.restEnded ? '0:00' : formatDuration(remaining)}
                  size="numDisplay"
                  tone={p.restEnded || lastSeconds ? 'accent' : 'text'}
                  accessibilityLabel={`${remaining} seconds remaining`}
                />
                <View style={styles.adjust}>
                  <Pressable onPress={() => p.onAdjustRest(-15)} accessibilityRole="button" accessibilityLabel="Fifteen seconds less rest" style={[styles.adjustBtn, { backgroundColor: theme.colors.bgSunken, borderRadius: theme.radius.md }]}>
                    <Text variant="numCaption">−15</Text>
                  </Pressable>
                  <Pressable onPress={() => p.onAdjustRest(15)} accessibilityRole="button" accessibilityLabel="Fifteen seconds more rest" style={[styles.adjustBtn, { backgroundColor: theme.colors.bgSunken, borderRadius: theme.radius.md }]}>
                    <Text variant="numCaption">+15</Text>
                  </Pressable>
                </View>
              </View>
            }
            basis={
              <View style={{ gap: 6 }}>
                <ProgressBar progress={rest.totalSeconds > 0 ? 1 - remaining / rest.totalSeconds : 1} color={p.restEnded ? 'success' : 'accent'} height={3} />
                {/* One slot: Forma while it has something to say, the next set otherwise. */}
                {momentSpeaking ? (
                  <Text variant="callout" color={lineColor} numberOfLines={2} style={{ fontWeight: '600' }}>
                    {line.text}
                  </Text>
                ) : nextPreview ? (
                  <Text variant="caption" color="textTertiary" numberOfLines={1}>
                    Next: {nextPreview}
                  </Text>
                ) : null}
              </View>
            }
          />
        </View>
      ) : (
        <DecisionBlock
          rank="section"
          eyebrow={exercise ? { text: exercise.exercise.name, variant: 'title' } : undefined}
          door={
            exercise && !editing
              ? { label: 'Why?', onPress: p.onWhy, accessibilityLabel: 'Why this target' }
              : editing
                ? { label: 'Cancel', onPress: p.onCancelEdit }
                : undefined
          }
          // Forma's line sits with the identity, above the numbers, so the
          // fields and the button stay adjacent under the thumb.
          basisPlacement="above"
          basis={
            <Text
              variant={momentSpeaking ? 'title2' : line.emphasis === 'quiet' ? 'caption' : 'callout'}
              color={lineColor}
              numberOfLines={momentSpeaking ? 3 : 1}
              accessibilityLiveRegion={momentSpeaking ? 'polite' : 'none'}>
              {line.text}
            </Text>
          }
          lead={fields ?? <View />}
        />
      )}
      {resting && fields ? <View style={{ marginTop: theme.spacing.sm }}>{fields}</View> : null}
      <View style={{ marginTop: theme.spacing.sm }}>{action}</View>
    </View>
  );
}

function nextSetPreview(draft: Draft, exercise: LoadedExercise, unit: WeightUnit, bodyweight: boolean): string {
  const load = draft.load === null ? (bodyweight ? 'BW' : '—') : bodyweight ? (draft.load > 0 ? `BW +${trimNumber(draft.load)} ${unit}` : 'BW') : `${trimNumber(draft.load)} ${unit}`;
  const setNo = exercise.sets.filter((s) => s.setType === 'working').length + 1;
  return `${exercise.exercise.name} · set ${Math.min(setNo, exercise.targetSnapshot.workingSets)} · ${load} × ${draft.reps}`;
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
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint, borderRadius: radius, transform: [{ scale: 1.03 }] }, style]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { paddingTop: 10, boxShadow: '0 -6px 18px rgba(0, 0, 0, 0.18)' },
  countdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  adjust: { flexDirection: 'row', gap: 8 },
  adjustBtn: { minHeight: 44, minWidth: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  fields: { flexDirection: 'row', alignItems: 'stretch' },
  rir: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  finishRow: { flexDirection: 'row' },
});
