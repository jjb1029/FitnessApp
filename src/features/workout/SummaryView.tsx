import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { NextTimeRow } from '@/data/repositories';
import type { Explanation, SessionSummary, WeightUnit } from '@/domain';
import { formatMinutes } from '@/lib/dates';
import { displayLoad, kgToUnit, trimNumber } from '@/lib/units';
import { Button, Card, ExplainableValue, Text, TextField, useTheme, WhySheet } from '@/ui';

export type SummaryViewProps = {
  name: string;
  summary: SessionSummary;
  nextTime: NextTimeRow[];
  unit: WeightUnit;
  onDone: (note: string | null) => void;
};

/** Post-workout summary (docs/13 §W5): duration, PRs once, next-time changes with Why. */
export function SummaryView({ name, summary, nextTime, unit, onDone }: SummaryViewProps) {
  const theme = useTheme();
  const [why, setWhy] = useState<{ title: string; explanation: Explanation } | null>(null);
  const [note, setNote] = useState('');
  const volume = Math.round(kgToUnit(summary.totalVolumeKg, unit));

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }]} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.sizes.screenPaddingH, paddingBottom: theme.spacing.giant, maxWidth: theme.sizes.contentMaxWidth, alignSelf: 'center', width: '100%' }} keyboardShouldPersistTaps="handled">
        <Text variant="label" color="success" style={{ marginTop: theme.spacing.lg }}>
          DONE
        </Text>
        <Text variant="display">{name}</Text>
        <Text variant="callout" color="textSecondary" style={{ marginTop: 4 }}>
          {formatMinutes(summary.durationSeconds)} · {summary.totalWorkingSets} {summary.totalWorkingSets === 1 ? 'set' : 'sets'} · {volume.toLocaleString()} {unit} lifted
        </Text>

        {summary.prs.length > 0 ? (
          <Card tone="accent" style={{ marginTop: theme.spacing.xl }}>
            <Text variant="label" color="accent">
              🏆 NEW BEST
            </Text>
            {summary.prs.slice(0, 3).map((pr, i) => (
              <View key={`${pr.exerciseId}-${i}`} style={{ marginTop: 4 }}>
                <Text variant="headline">{pr.exerciseName}</Text>
                <Text variant="callout" color="textSecondary">
                  {pr.e1rmKg !== null ? `Estimated 1RM ${trimNumber(Math.round(kgToUnit(pr.e1rmKg, unit)))} ${unit}` : pr.label}
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
                const nextText = next === null ? '—' : isBw ? (next > 0 ? `BW +${trimNumber(displayLoad(next, unit, row.exercise.incrementKg))}` : 'BW') : `${trimNumber(displayLoad(next, unit, row.exercise.incrementKg))} ${unit}`;
                const changed = next !== null && prev !== null && Math.abs(next - prev) > 0.01;
                const delta = changed ? (next! > prev! ? `↑ ${trimNumber(displayLoad(next! - prev!, unit, row.exercise.incrementKg))}` : `↓ ${trimNumber(displayLoad(prev! - next!, unit, row.exercise.incrementKg))}`) : row.targets.ruleId.includes('add_rep') || row.targets.ruleId === 'progression.reps_only' ? `${row.targets.reps} reps` : 'keep';
                return (
                  <ExplainableValue
                    key={row.sessionExerciseId}
                    label={row.exercise.name}
                    value={nextText}
                    delta={delta}
                    deltaTone={changed ? (next! > prev! ? 'up' : 'down') : 'neutral'}
                    compact
                    onPressWhy={() => setWhy({ title: `${row.exercise.name}: ${nextText}`, explanation: row.targets.explanation })}
                  />
                );
              })}
            </Card>
          </>
        ) : null}

        <View style={{ marginTop: theme.spacing.xxl }}>
          <TextField label="Session note" placeholder="Optional" value={note} onChangeText={setNote} />
        </View>
        <Button label="Done" size="lg" fullWidth onPress={() => onDone(note.trim() || null)} style={{ marginTop: theme.spacing.xl }} />
      </ScrollView>
      <WhySheet visible={why !== null} onClose={() => setWhy(null)} title={why?.title ?? ''} explanation={why?.explanation ?? null} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
