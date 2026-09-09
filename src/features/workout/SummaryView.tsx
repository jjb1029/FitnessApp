import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LoadedExercise, NextTimeRow } from '@/data/repositories';
import type { Explanation, SessionSummary, WeightUnit } from '@/domain';
import { DONE_FOR_TODAY, finishVerdict, whyTitle } from '@/engine';
import { formatMinutes } from '@/lib/dates';
import { displayLoad, kgToUnit, trimNumber } from '@/lib/units';
import { Button, Card, ExplainableValue, Text, TextField, useTheme, WhySheet } from '@/ui';

export type SummaryViewProps = {
  name: string;
  summary: SessionSummary;
  nextTime: NextTimeRow[];
  exercises: LoadedExercise[];
  early: boolean;
  unit: WeightUnit;
  onDone: (note: string | null) => void;
};

/** The debrief (docs/13 §W5, docs/14 §1): one verdict, the record if there was one, and next time as decisions. */
export function SummaryView({ name, summary, nextTime, exercises, early, unit, onDone }: SummaryViewProps) {
  const theme = useTheme();
  const [why, setWhy] = useState<{ title: string; explanation: Explanation } | null>(null);
  const [note, setNote] = useState('');
  const volume = Math.round(kgToUnit(summary.totalVolumeKg, unit));

  const increases = nextTime.filter((r) => r.targets.loadKg !== null && r.previousLoadKg !== null && r.targets.loadKg > r.previousLoadKg + 0.01).length;
  const allTargetsHit = exercises
    .filter((e) => !e.skipped && e.sets.some((s) => s.setType === 'working'))
    .every((e) => e.sets.filter((s) => s.setType === 'working').every((s) => s.reps >= e.targetSnapshot.repRange.min));
  const verdict = finishVerdict({ workingSets: summary.totalWorkingSets, allTargetsHit, increases, earlyFinish: early, prCount: summary.prs.length });

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }]} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.sizes.screenPaddingH, paddingBottom: theme.spacing.giant, maxWidth: theme.sizes.contentMaxWidth, alignSelf: 'center', width: '100%' }} keyboardShouldPersistTaps="handled">
        <Text variant="label" color="success" style={{ marginTop: theme.spacing.lg }}>
          DONE
        </Text>
        <Text variant="display">{name}</Text>
        <Text variant="body" style={{ marginTop: theme.spacing.md }}>
          {verdict}
        </Text>
        <Text variant="callout" color="textSecondary" style={{ marginTop: theme.spacing.xs }}>
          {formatMinutes(summary.durationSeconds)} · {summary.totalWorkingSets} {summary.totalWorkingSets === 1 ? 'set' : 'sets'} · {volume.toLocaleString()} {unit} lifted
        </Text>

        {summary.prs.length > 0 ? (
          <Card tone="accent" style={{ marginTop: theme.spacing.xl }}>
            <Text variant="label" color="accent">
              NEW BEST
            </Text>
            {summary.prs.slice(0, 3).map((pr, i) => (
              <View key={`${pr.exerciseId}-${i}`} style={{ marginTop: 6 }}>
                <Text variant="headline">{pr.exerciseName}</Text>
                <Text variant="callout" color="textSecondary">
                  {pr.e1rmKg !== null ? `Estimated max ${trimNumber(Math.round(kgToUnit(pr.e1rmKg, unit)))} ${unit}` : pr.label}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        {nextTime.length > 0 ? (
          <>
            <Text variant="label" color="textSecondary" style={{ marginTop: theme.spacing.xxl, marginBottom: theme.spacing.sm }}>
              NEXT TIME
            </Text>
            <Card padded={false} style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.xs }}>
              {nextTime.map((row) => {
                const isBw = row.exercise.loadType === 'bodyweight' || row.exercise.loadType === 'bodyweight_plus';
                const next = row.targets.loadKg;
                const prev = row.previousLoadKg;
                const fmt = (kg: number) => `${trimNumber(displayLoad(kg, unit, row.exercise.incrementKg))} ${unit}`;
                const nextText = next === null ? '—' : isBw ? (next > 0 ? `BW +${fmt(next)}` : 'BW') : fmt(next);
                const up = next !== null && prev !== null && next > prev + 0.01;
                const down = next !== null && prev !== null && next < prev - 0.01;
                const rule = row.targets.ruleId;
                const delta = up ? `up ${fmt(next! - prev!)}` : down ? `down ${fmt(prev! - next!)}` : rule.includes('add_rep') || rule === 'progression.reps_only' ? `aim for ${row.targets.reps}` : 'same';
                return (
                  <ExplainableValue
                    key={row.sessionExerciseId}
                    label={row.exercise.name}
                    value={nextText}
                    delta={delta}
                    deltaTone={up ? 'up' : down ? 'down' : 'neutral'}
                    compact
                    onPressWhy={() => setWhy({ title: whyTitle({ ruleId: rule, loadDisplay: next === null ? null : isBw ? (next > 0 ? `+${fmt(next)}` : '') : fmt(next), when: 'next time', isBodyweight: isBw }), explanation: row.targets.explanation })}
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

const styles = StyleSheet.create({ root: { flex: 1 } });
