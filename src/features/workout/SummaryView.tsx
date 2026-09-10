import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LoadedExercise, NextTimeRow } from '@/data/repositories';
import type { Explanation, SessionSummary, WeightUnit } from '@/domain';
import { DONE_FOR_TODAY, NEXT_SESSION_SET, finishVerdict, sessionHighlights, whyTitle, type Highlight, type SetRecord } from '@/engine';
import { formatMinutes } from '@/lib/dates';
import { displayLoad, kgToUnit, trimNumber } from '@/lib/units';
import { Button, DecisionBlock, Measure, Text, TextField, useTheme, WhySheet } from '@/ui';

export type SummaryViewProps = {
  name: string;
  summary: SessionSummary;
  nextTime: NextTimeRow[];
  exercises: LoadedExercise[];
  previous: Record<string, SetRecord[]>;
  early: boolean;
  unit: WeightUnit;
  onDone: (note: string | null) => void;
};

/**
 * The debrief (docs/15 §3, docs/16 §6). The verdict leads, the evidence for it
 * follows in the user's own numbers at the second-largest size on the screen,
 * and the session closes by saying the next decision is already made.
 */
export function SummaryView({ name, summary, nextTime, exercises, previous, early, unit, onDone }: SummaryViewProps) {
  const theme = useTheme();
  const [why, setWhy] = useState<{ title: string; explanation: Explanation } | null>(null);
  const [note, setNote] = useState('');
  const volume = Math.round(kgToUnit(summary.totalVolumeKg, unit));

  const increases = nextTime.filter((r) => r.targets.loadKg !== null && r.previousLoadKg !== null && r.targets.loadKg > r.previousLoadKg + 0.01).length;
  const allTargetsHit = exercises
    .filter((e) => !e.skipped && e.sets.some((s) => s.setType === 'working'))
    .every((e) => e.sets.filter((s) => s.setType === 'working').every((s) => s.reps >= e.targetSnapshot.repRange.min));
  const verdict = finishVerdict({ workingSets: summary.totalWorkingSets, allTargetsHit, increases, earlyFinish: early, prCount: summary.prs.length });

  const highlights = useMemo(
    () =>
      sessionHighlights(
        exercises
          .filter((e) => !e.skipped)
          .map((e) => {
            const working = e.sets.filter((s) => s.setType === 'working');
            const pr = working.find((s) => s.isPr);
            return {
              exerciseName: e.exercise.name,
              sets: working.map((s) => ({ loadKg: s.loadKg ?? s.addedLoadKg, reps: s.reps, rir: s.rir })),
              previous: previous[e.exercise.id] ?? [],
              isPr: pr !== undefined,
              prE1rmKg: pr?.e1rmKg ?? null,
            };
          }),
      ),
    [exercises, previous],
  );

  const amount = (kg: number) => trimNumber(Math.round(kgToUnit(kg, unit)));

  /** The evidence for the verdict, split so the number carries the weight. */
  const highlightMeasure = (h: Highlight) => {
    if (h.kind === 'pr') return h.e1rmKg !== null ? { value: amount(h.e1rmKg), unit, caption: 'estimated max' } : { value: 'New best', unit: null, caption: null };
    if (h.kind === 'load') return { value: `+${amount(h.deltaKg)}`, unit, caption: `to ${amount(h.loadKg)} ${unit}` };
    return { value: `+${h.deltaReps}`, unit: h.deltaReps === 1 ? 'rep' : 'reps', caption: h.loadKg !== null ? `at ${amount(h.loadKg)} ${unit}` : null };
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }]} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.sizes.screenPaddingH, paddingBottom: theme.spacing.giant, maxWidth: theme.sizes.contentMaxWidth, alignSelf: 'center', width: '100%' }} keyboardShouldPersistTaps="handled">
        <DecisionBlock
          rank="screen"
          style={{ marginTop: theme.spacing.lg }}
          eyebrow={{ text: `${name} · done` }}
          lead={verdict.headline}
          basis={
            highlights.length > 0 ? (
              <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                {highlights.map((h, i) => {
                  const m = highlightMeasure(h);
                  return (
                    <View key={`${h.exerciseName}-${i}`} style={styles.highlightRow}>
                      <Text variant="body" color="textSecondary" style={{ flexShrink: 1 }} numberOfLines={1}>
                        {h.exerciseName}
                      </Text>
                      <View style={styles.highlightValue}>
                        <Measure value={m.value} unit={m.unit} size="numTitle" tone={h.kind === 'pr' ? 'accent' : 'success'} />
                        {m.caption ? (
                          <Text variant="caption" color="textTertiary">
                            {m.caption}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : undefined
          }
        />

        <Text variant="caption" color="textTertiary" style={{ marginTop: theme.spacing.lg }}>
          {formatMinutes(summary.durationSeconds)} · <Text variant="numCaption">{summary.totalWorkingSets}</Text> {summary.totalWorkingSets === 1 ? 'set' : 'sets'} ·{' '}
          <Text variant="numCaption">{volume.toLocaleString()}</Text> {unit} lifted
        </Text>

        {nextTime.length > 0 ? (
          <View style={{ marginTop: theme.spacing.xxxl }}>
            {/* Teal: this is Forma saying the next decision is already made. */}
            <Text variant="headline" color="accent">
              {NEXT_SESSION_SET}
            </Text>
            {verdict.detail ? (
              <Text variant="callout" color="textSecondary" style={{ marginTop: 2 }}>
                {verdict.detail}
              </Text>
            ) : null}
            <View style={{ marginTop: theme.spacing.sm }}>
              {nextTime.map((row) => {
                const isBw = row.exercise.loadType === 'bodyweight' || row.exercise.loadType === 'bodyweight_plus';
                const next = row.targets.loadKg;
                const prev = row.previousLoadKg;
                const load = (kg: number) => trimNumber(displayLoad(kg, unit, row.exercise.incrementKg));
                const up = next !== null && prev !== null && next > prev + 0.01;
                const down = next !== null && prev !== null && next < prev - 0.01;
                const rule = row.targets.ruleId;
                const delta = up ? `↑ ${load(next! - prev!)}` : down ? `↓ ${load(prev! - next!)}` : rule.includes('add_rep') || rule === 'progression.reps_only' ? `aim ${row.targets.reps}` : 'same';
                const leadNode =
                  next === null ? (
                    <Text variant="numBody">—</Text>
                  ) : isBw && next <= 0 ? (
                    <Text variant="numBody">BW</Text>
                  ) : (
                    <Measure value={isBw ? `BW +${load(next)}` : load(next)} unit={unit} size="numBody" />
                  );
                return (
                  <DecisionBlock
                    key={row.sessionExerciseId}
                    rank="row"
                    leading={row.exercise.name}
                    lead={leadNode}
                    basis={
                      <Text variant="numCaption" color={up ? 'success' : down ? 'warning' : 'textSecondary'}>
                        {delta}
                      </Text>
                    }
                    door={{
                      label: 'Why?',
                      onPress: () =>
                        setWhy({
                          title: whyTitle({ ruleId: rule, loadDisplay: next === null ? null : isBw ? (next > 0 ? `+${load(next)} ${unit}` : '') : `${load(next)} ${unit}`, when: 'next time', isBodyweight: isBw }),
                          explanation: row.targets.explanation,
                        }),
                      accessibilityLabel: `Why ${row.exercise.name} next time`,
                    }}
                  />
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: theme.spacing.xxl }}>
          <TextField label="Note" placeholder="Anything worth remembering" value={note} onChangeText={setNote} />
        </View>
        <Button label={DONE_FOR_TODAY} size="lg" fullWidth onPress={() => onDone(note.trim() || null)} style={{ marginTop: theme.spacing.xl }} />
      </ScrollView>
      <WhySheet visible={why !== null} onClose={() => setWhy(null)} title={why?.title ?? ''} explanation={why?.explanation ?? null} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  highlightRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  highlightValue: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
});
