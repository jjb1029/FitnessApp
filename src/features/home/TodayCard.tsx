import { Pressable, StyleSheet, View } from 'react-native';

import type { ActiveProgram } from '@/data/repositories';
import type { SessionRow } from '@/data/schema';
import { readyLine, type TodayResolution } from '@/engine';
import { formatDuration } from '@/lib/dates';
import { muscleLabel } from '@/lib/labels';
import { Button, Card, StatusPill, Text, useTheme } from '@/ui';

import { useNow } from '../app/useNow';

export type TodayCardProps = {
  active: ActiveProgram | null;
  today: TodayResolution | null;
  inProgress: SessionRow | null;
  /** Forma's sentence about today, from the engine's targets. */
  sentence: string | null;
  deferred: boolean;
  onStart: () => void;
  onDefer: () => void;
  onUndefer: () => void;
  onSkip: () => void;
  onWhy: () => void;
};

/** The Home command centre (docs/13 §3). One card, five states. */
export function TodayCard({ active, today, inProgress, sentence, deferred, onStart, onDefer, onUndefer, onSkip, onWhy }: TodayCardProps) {
  const theme = useTheme();
  const now = useNow(30_000);

  if (!active || !today) {
    return (
      <Card>
        <Text variant="label" color="textSecondary">
          TODAY
        </Text>
        <Text variant="title1" style={{ marginTop: 4 }}>
          No program yet
        </Text>
        <Text variant="callout" color="textSecondary" style={{ marginTop: 4 }}>
          Finish onboarding to get a recommended program.
        </Text>
      </Card>
    );
  }

  if (inProgress) {
    const elapsed = Math.max(0, (now - new Date(inProgress.startedAt).getTime()) / 1000);
    return (
      <Card tone="accent">
        <Text variant="label" color="accent">
          IN PROGRESS
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          {inProgress.name}
        </Text>
        <Text variant="callout" color="textSecondary" style={{ marginTop: 4 }}>
          {formatDuration(elapsed)} elapsed
        </Text>
        <Button label="Resume workout" size="lg" fullWidth icon="play" onPress={onStart} style={{ marginTop: theme.spacing.lg }} />
      </Card>
    );
  }

  if (today.kind === 'rest') {
    return (
      <Card>
        <Text variant="label" color="textSecondary">
          TODAY
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Rest day
        </Text>
        <Text variant="callout" color="textSecondary" style={{ marginTop: 4 }}>
          {today.nextDay ? `Next: ${today.nextDay.name}` : 'Nothing planned'}
        </Text>
        {today.nextDay ? <Button label="Train anyway" variant="secondary" size="lg" fullWidth onPress={onStart} style={{ marginTop: theme.spacing.lg }} /> : null}
      </Card>
    );
  }

  const dayRow = active.days[today.dayIndex];
  const exercises = dayRow?.exercises ?? [];
  const focus = (dayRow?.focusMuscleIds ?? []).slice(0, 3).map(muscleLabel);

  if (deferred) {
    return (
      <Card padded={false} style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm }}>
        <View style={styles.deferredRow}>
          <View style={{ flex: 1 }}>
            <Text variant="headline">{today.day.name} · later today</Text>
            <Text variant="caption" color="textSecondary">
              {exercises.length} exercises · about {dayRow?.estimatedMinutes ?? today.day.estimatedMinutes} min
            </Text>
          </View>
          <Button label="Start" onPress={onUndefer} />
        </View>
      </Card>
    );
  }

  const welcomeBack = today.kind === 'welcome_back';

  // Decision, basis, door (docs/15 §2): today is ready, here is what it is, here is why.
  return (
    <Card tone="accent">
      <View style={styles.eyebrow}>
        <Text variant="label" color="accent">
          {welcomeBack ? `WELCOME BACK · ${today.layoffDays} DAYS OFF` : 'TODAY'}
        </Text>
        <Pressable onPress={onWhy} accessibilityRole="button" accessibilityLabel="Why this workout" hitSlop={8}>
          <Text variant="caption" color="accent" style={{ fontWeight: '600' }}>
            Why?
          </Text>
        </Pressable>
      </View>
      <Text variant="display" style={{ marginTop: 4 }}>
        {readyLine(today.day.name)}
      </Text>
      {sentence ? (
        <Text variant="body" color="textSecondary" style={{ marginTop: theme.spacing.sm }}>
          {sentence}
        </Text>
      ) : focus.length > 0 ? (
        <View style={[styles.focus, { marginTop: theme.spacing.sm }]}>
          {focus.map((f) => (
            <StatusPill key={f} label={f} tone="accent" icon="ellipse" />
          ))}
        </View>
      ) : null}
      <Text variant="caption" color="textTertiary" style={{ marginTop: theme.spacing.sm }}>
        {exercises.length} exercises · about {dayRow?.estimatedMinutes ?? today.day.estimatedMinutes} min
      </Text>
      <Button label="Start workout" size="lg" fullWidth icon="play" onPress={onStart} style={{ marginTop: theme.spacing.lg }} />
      <View style={[styles.secondary, { marginTop: theme.spacing.xs }]}>
        <Button label="Do later" variant="ghost" onPress={onDefer} />
        <Button label="Skip this day" variant="ghost" onPress={onSkip} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  eyebrow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  focus: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  secondary: { flexDirection: 'row', justifyContent: 'space-between' },
  deferredRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
