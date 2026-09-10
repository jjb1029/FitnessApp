import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getActiveProgram, getLastCompletedAt, type ActiveProgram } from '@/data/repositories';
import { useDbQuery } from '@/data/useDbQuery';
import { resolveTodaysWorkout } from '@/engine';
import { Card, EmptyState, Icon, Screen, Skeleton, StatusPill, Text, WhySheet, useTheme } from '@/ui';

import { useCurrentUser } from '../app/UserProvider';

const SPLIT_LABEL: Record<string, string> = {
  full_body: 'Full body',
  upper_lower: 'Upper / Lower',
  ppl: 'Push / Pull / Legs',
  upper_lower_arms: 'Upper / Lower + Arms',
  body_part: 'Body part split',
  custom: 'Custom',
};

export function TrainScreen() {
  const theme = useTheme();
  const { user } = useCurrentUser();
  const { data, loading } = useDbQuery(
    async () => {
      const active = await getActiveProgram(user.id);
      const lastCompletedAt = await getLastCompletedAt(user.id);
      const today = active ? resolveTodaysWorkout({ program: active.program, days: active.days, lastCompletedAt }) : null;
      return { active, nextIndex: today && today.kind !== 'rest' ? today.dayIndex : today?.kind === 'rest' ? today.nextDayIndex : -1 };
    },
    ['program', 'program_day', 'template_exercise', 'session'],
    [user.id],
  );
  const [why, setWhy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const active = data?.active ?? null;

  return (
    <Screen>
      <Text variant="title1" style={{ marginTop: theme.spacing.md }}>
        Train
      </Text>
      {loading && !data ? (
        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
          <Skeleton height={28} width="50%" />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </View>
      ) : null}
      {!loading && !active ? <EmptyState title="No program yet" message="Finish onboarding to get a recommended program." icon="barbell-outline" /> : null}
      {active ? (
        <>
          <View style={{ marginTop: theme.spacing.xl }}>
            <Text variant="title2">{active.program.name}</Text>
            <Text variant="callout" color="textSecondary" style={{ marginTop: 2 }}>
              {SPLIT_LABEL[active.program.split] ?? active.program.split} · {active.program.daysPerWeek} days a week
            </Text>
            <Pressable onPress={() => setWhy(true)} accessibilityRole="button" hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text variant="callout" color="accent" style={{ fontWeight: '600' }}>
                Why this program?
              </Text>
            </Pressable>
          </View>
          <View style={{ gap: theme.spacing.sm }}>
            {active.days.map((day, i) => (
              <DayRow key={day.id} day={day} isNext={i === data?.nextIndex} expanded={expanded === day.id} onToggle={() => setExpanded(expanded === day.id ? null : day.id)} />
            ))}
          </View>
          <Text variant="caption" color="textTertiary" style={{ marginTop: theme.spacing.xl }}>
            Editing exercises, sets, and rep ranges arrives in a later build.
          </Text>
        </>
      ) : null}
      <WhySheet visible={why} onClose={() => setWhy(false)} title={active?.program.name ?? ''} explanation={active?.program.explanation ?? null} />
    </Screen>
  );
}

function DayRow({ day, isNext, expanded, onToggle }: { day: ActiveProgram['days'][number]; isNext: boolean; expanded: boolean; onToggle: () => void }) {
  const theme = useTheme();
  return (
    <Card onPress={onToggle} style={{ paddingVertical: theme.spacing.md }} accessibilityState={{ expanded }}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.titleRow}>
            <Text variant="headline">{day.name}</Text>
            {isNext ? <StatusPill label="Next" tone="accent" icon="play" /> : null}
          </View>
          <Text variant="caption" color="textSecondary">
            {day.exercises.length} exercises · about {day.estimatedMinutes} min
          </Text>
        </View>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="textTertiary" />
      </View>
      {expanded ? (
        <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
          {day.exercises.map((e) => (
            <View key={e.id} style={styles.exerciseRow}>
              <View style={{ flex: 1 }}>
                <Text variant="callout">{e.exercise.name}</Text>
                <Text variant="caption" color="textTertiary">
                  {e.notes ?? `${e.targetRir} RIR · rest ${Math.round(e.restSeconds / 60 * 10) / 10} min`}
                </Text>
              </View>
              <Text variant="numBody" color="textSecondary">
                {e.workingSets} × {e.repRange.min}–{e.repRange.max}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 36 },
});
