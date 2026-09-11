import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LoadedExercise } from '@/data/repositories';
import type { IntensityScale, WeightUnit } from '@/domain';
import { formatDuration } from '@/lib/dates';
import { incrementStepInUnit, trimNumber } from '@/lib/units';
import type { Draft, RestState } from '@/store/sessionStore';
import {
  Attention,
  Button,
  DecisionBlock,
  HandOff,
  Measure,
  ProgressBar,
  Recount,
  Reveal,
  Stepper,
  Text,
  phases,
  reservedDockHeight,
  useGround,
  useGroundColor,
  useGroundOpacity,
  useTheme,
  type ColorName,
} from '@/ui';

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
  /** Changes each time rest runs out on its own; hands focus back to Complete set. */
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
  /** The tallest the dock can become. The list reserves it once, so a phase change never shifts the workout. */
  onReservedHeight?: (height: number) => void;
};

/** The lifting stage's height for the very first frame, before it has measured. */
const INITIAL_STAGE_HEIGHT = 68;

/**
 * The current action, as a Decision Block (docs/15 §3, docs/16 §6), in two
 * phases that share one surface (docs/16 §7, §8).
 *
 * The dock is a stage above a base. The base — weight, reps, effort, and the
 * one button — never moves. The stage hands off between lifting (the exercise,
 * Forma's line) and resting (the countdown, the next set), its height glides
 * with the phase, and the dock's ground lifts while resting. The list reserves
 * the taller stage up front, so nothing behind the dock shifts either.
 */
export function InputDock(p: InputDockProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { exercise, draft, unit, scale, rest, line, now, onReservedHeight } = p;
  const bodyweight = exercise ? isBodyweightExercise(exercise.exercise) : false;
  const step = exercise ? incrementStepInUnit(exercise.exercise.incrementKg, unit) : 5;
  const editing = draft?.setId !== null && draft?.setId !== undefined;
  const needsWeight = draft !== null && draft.load === null && exercise?.exercise.loadType === 'external';
  const resting = rest !== null;

  // The rest stage stays mounted so it can leave showing where it ended: 0:00, a full bar.
  const [lastRest, setLastRest] = useState<RestState | null>(null);
  if (rest !== null && rest !== lastRest) setLastRest(rest);
  const shownRest = rest ?? lastRest;
  const plannedRest = exercise ? (exercise.restSecondsOverride ?? exercise.targetSnapshot.restSeconds) : 90;
  const remaining = shownRest ? Math.max(0, Math.ceil((shownRest.endsAt - now) / 1000)) : plannedRest;
  // The numerals step by the second and never animate; the bar follows the exact time and glides.
  const restProgress = shownRest && shownRest.totalSeconds > 0 ? Math.min(1, 1 - Math.max(0, shownRest.endsAt - now) / (shownRest.totalSeconds * 1000)) : 0;
  // Unchanged by ±15 (both ends move together), new for every rest, so a new rest starts its bar at zero instead of sweeping back.
  const restIdentity = shownRest ? shownRest.endsAt - shownRest.totalSeconds * 1000 : 0;
  const lastSeconds = resting && remaining <= 3;

  const ground = useGround(resting);
  const groundStyle = useGroundColor(ground, theme.colors[phases.lifting.dockGround], theme.colors[phases.resting.dockGround]);
  const controlsStyle = useGroundOpacity(ground, phases.resting.controlsOpacity);

  const [baseHeight, setBaseHeight] = useState(0);
  const [stageHeights, setStageHeights] = useState<number[]>([]);
  const bottomPad = Math.max(insets.bottom, theme.spacing.md);
  const reserved = baseHeight > 0 && stageHeights.length > 0 ? reservedDockHeight(baseHeight + bottomPad, stageHeights) : 0;
  useEffect(() => {
    if (reserved > 0) onReservedHeight?.(reserved);
  }, [reserved, onReservedHeight]);

  const lineColor: ColorName = line.tone === 'success' ? 'success' : line.tone === 'accent' ? 'accent' : line.emphasis === 'quiet' ? 'textSecondary' : 'text';
  const nextPreview = draft && exercise ? nextSetPreview(draft, exercise, unit, bodyweight) : null;
  const momentSpeaking = line.emphasis === 'moment';
  // What the numbers belong to. A new set or exercise recounts them; the user's own nudges never do.
  const recountKey = draft ? `${draft.sessionExerciseId}:${draft.order}:${draft.setId ?? 'new'}` : '';

  const liftStage = (
    <View style={{ paddingTop: 10, paddingBottom: phases.lifting.blockGap }}>
      <Recount trigger={exercise?.id ?? ''} value={exercise?.id ?? ''}>
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
          // Forma's line sits with the identity; the numbers are the lead, in the base below.
          basisPlacement="above"
          basis={
            <View style={styles.lineSlot}>
              <Text
                variant={momentSpeaking ? 'title2' : line.emphasis === 'quiet' ? 'caption' : 'callout'}
                color={lineColor}
                numberOfLines={momentSpeaking ? 3 : 1}
                accessibilityLiveRegion={momentSpeaking && !resting ? 'polite' : 'none'}>
                {line.text}
              </Text>
            </View>
          }
        />
      </Recount>
    </View>
  );

  const restStage = (
    <View style={{ paddingTop: 10, paddingBottom: phases.resting.blockGap }} accessibilityLiveRegion={resting ? 'polite' : 'none'}>
      <DecisionBlock
        rank="section"
        eyebrow={{ text: 'Resting', tone: 'accent' }}
        door={{ label: 'Skip', onPress: p.onSkipRest, accessibilityLabel: 'Skip rest' }}
        lead={
          <View style={styles.countdownRow}>
            <Measure value={formatDuration(remaining)} size="numDisplay" tone={lastSeconds ? 'accent' : 'text'} accessibilityLabel={`${remaining} seconds remaining`} />
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
          // The countdown lands first; the bar and what comes next follow it.
          <Reveal when={resting}>
            <View style={styles.restSlot}>
              <ProgressBar progress={restProgress} color="accent" height={3} animateMs={resting ? 250 : undefined} resetKey={restIdentity} />
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
          </Reveal>
        }
      />
    </View>
  );

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
          recountKey={recountKey}
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
          recountKey={recountKey}
          style={{ flex: 32 }}
        />
        <Pressable
          onPress={p.onOpenRir}
          accessibilityRole="button"
          accessibilityLabel={`${effortLabel(scale)} ${draft.rir === null ? 'not set' : effortValue(draft.rir, scale)}`}
          style={({ pressed }) => [styles.rir, { flex: 22, height: 72, borderRadius: theme.radius.md, backgroundColor: pressed ? theme.colors.border : theme.colors.bgSunken, borderColor: theme.colors.border }]}>
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
        <Attention trigger={p.returnKey} color={theme.colors.accentSubtle} radius={theme.radius.md}>
          {/* While resting the countdown is the thing to look at; the button waits, still live. */}
          <Button label={editing ? 'Save set' : 'Complete set'} size="lg" fullWidth icon="checkmark" variant={resting ? 'secondary' : 'primary'} onPress={p.onComplete} disabled={needsWeight} />
        </Attention>
      )
    ) : (
      <Button label="Finish workout" size="lg" fullWidth icon="checkmark-done" onPress={p.onFinish} />
    );

  return (
    <Animated.View testID="dock" style={[styles.dock, { paddingBottom: bottomPad, paddingHorizontal: theme.spacing.lg }, groundStyle]}>
      <HandOff
        testID="dock-stage"
        active={resting ? 'rest' : 'lift'}
        initialHeight={INITIAL_STAGE_HEIGHT}
        onHeights={setStageHeights}
        layers={[
          { key: 'lift', node: liftStage },
          { key: 'rest', node: restStage },
        ]}
      />
      <View onLayout={(e) => setBaseHeight(e.nativeEvent.layout.height)}>
        {/* Muted while resting, never moved: still adjustable, and the numbers stay exactly where they will be used. */}
        <Animated.View style={controlsStyle}>{fields}</Animated.View>
        <View style={{ marginTop: fields ? theme.spacing.sm : 0 }}>{action}</View>
      </View>
    </Animated.View>
  );
}

function nextSetPreview(draft: Draft, exercise: LoadedExercise, unit: WeightUnit, bodyweight: boolean): string {
  const load = draft.load === null ? (bodyweight ? 'BW' : '—') : bodyweight ? (draft.load > 0 ? `BW +${trimNumber(draft.load)} ${unit}` : 'BW') : `${trimNumber(draft.load)} ${unit}`;
  const setNo = exercise.sets.filter((s) => s.setType === 'working').length + 1;
  return `${exercise.exercise.name} · set ${Math.min(setNo, exercise.targetSnapshot.workingSets)} · ${load} × ${draft.reps}`;
}

const styles = StyleSheet.create({
  dock: { boxShadow: '0 -6px 18px rgba(0, 0, 0, 0.18)' },
  /** One line of title2, so a one-line moment replaces the quiet line without the stage changing height. */
  lineSlot: { minHeight: 28 },
  /** The bar plus two lines of callout, so an acknowledgement expiring into "Next:" does not resize the stage mid-rest. */
  restSlot: { gap: 6, minHeight: 49 },
  countdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  adjust: { flexDirection: 'row', gap: 8 },
  adjustBtn: { minHeight: 44, minWidth: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  fields: { flexDirection: 'row', alignItems: 'stretch' },
  rir: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  finishRow: { flexDirection: 'row' },
});
