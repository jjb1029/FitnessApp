import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LoadedExercise, NextTimeRow } from '@/data/repositories';
import type { Explanation, SessionSummary, WeightUnit } from '@/domain';
import { DONE_FOR_TODAY, NEXT_SESSION_SET, finishVerdict, sessionHighlights, whyTitle, type Highlight, type SetRecord } from '@/engine';
import { formatMinutes } from '@/lib/dates';
import { displayLoad, kgToUnit, trimNumber } from '@/lib/units';
import { Button, Card, ExplainableValue, Text, TextField, useTheme, WhySheet } from '@/ui';

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
 * The debrief (docs/15 §3, §8 item 4). The verdict leads, the evidence for it
 * follows in the user's own numbers, and the session closes by saying the next
 * decision is already made.
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

  const fmt = (kg: number) => `${trimNumber(Math.round(kgToUnit(kg, unit)))} ${unit}`;
  const highlightText = (h: Highlight): string => {
    if (h.kind === 'pr') return h.e1rmKg !== null ? `new best, ${fmt(h.e1rmKg)} estimated max` : 'new best';
    if (h.kind === 'load') return `+${fmt(h.deltaKg)} to ${fmt(h.loadKg)}`;
    return h.loadKg !== null ? `+${h.deltaReps} ${h.deltaReps === 1 ? 'rep' : 'reps'} at ${fmt(h.loadKg)}` : `+${h.deltaReps} ${h.deltaReps === 1 ? 'rep' : 'reps'}`;
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }]} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.sizes.screenPaddingH, paddingBottom: theme.spacing.giant, maxWidth: theme.sizes.contentMaxWidth, alignSelf: 'center', width: '100%' }} keyboardShouldPersistTaps="handled">
        <Text variant="label" color="textSecondary" style={{ marginTop: theme.spacing.lg }}>
          {name.toUpperCase()} · DONE
        </Text>
        <Text variant="display" style={{ marginTop: 2 }}>
          {verdict.headline}
        </Text>

        {highlights.length > 0 ? (
          <View style={{ marginTop: theme.spacing.lg, gap: 6 }}>
            {highlights.map((h, i) => (
              <View key={`${h.exerciseName}-${i}`} style={styles.highlightRow}>
                <Text variant="body" style={{ flexShrink: 1 }} numberOfLines={1}>
                  {h.exerciseName}
                </Text>
                <Text variant="body" color={h.kind === 'pr' ? 'accent' : 'success'} style={{ fontWeight: '600' }}>
                  {highlightText(h)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text variant="caption" color="textTertiary" style={{ marginTop: theme.spacing.lg }}>
          {formatMinutes(summary.durationSeconds)} · {summary.totalWorkingSets} {summary.totalWorkingSets === 1 ? 'set' : 'sets'} · {volume.toLocaleString()} {unit} lifted
        </Text>

        {nextTime.length > 0 ? (
          <>
            <Text variant="headline" style={{ marginTop: theme.spacing.xxl }}>
              {NEXT_SESSION_SET}
            </Text>
            {verdict.detail ? (
              <Text variant="callout" color="textSecondary" style={{ marginTop: 2, marginBottom: theme.spacing.sm }}>
                {verdict.detail}
              </Text>
            ) : (
              <View style={{ height: theme.spacing.sm }} />
            )}
            <Card padded={false} style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.xs }}>
              {nextTime.map((row) => {
                const isBw = row.exercise.loadType === 'bodyweight' || row.exercise.loadType === 'bodyweight_plus';
                const next = row.targets.loadKg;
                const prev = row.previousLoadKg;
                const load = (kg: number) => `${trimNumber(displayLoad(kg, unit, row.exercise.incrementKg))} ${unit}`;
                const nextText = next === null ? '—' : isBw ? (next > 0 ? `BW +${load(next)}` : 'BW') : load(next);
                const up = next !== null && prev !== null && next > prev + 0.01;
                const down = next !== null && prev !== null && next < prev - 0.01;
                const rule = row.targets.ruleId;
                const delta = up ? `up ${load(next! - prev!)}` : down ? `down ${load(prev! - next!)}` : rule.includes('add_rep') || rule === 'progression.reps_only' ? `aim for ${row.targets.reps}` : 'same';
                return (
                  <ExplainableValue
                    key={row.sessionExerciseId}
                    label={row.exercise.name}
                    value={nextText}
                    delta={delta}
                    deltaTone={up ? 'up' : down ? 'down' : 'neutral'}
                    compact
                    onPressWhy={() => setWhy({ title: whyTitle({ ruleId: rule, loadDisplay: next === null ? null : isBw ? (next > 0 ? `+${load(next)}` : '') : load(next), when: 'next time', isBodyweight: isBw }), explanation: row.targets.explanation })}
                  />
                );
              })}
            </Card>
          </>
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
});
