import { StyleSheet, View } from 'react-native';

import type { ActiveProgram } from '@/data/repositories';
import type { SessionRow } from '@/data/schema';
import { readyLine, type TodayResolution } from '@/engine';
import { formatDuration } from '@/lib/dates';
import { muscleLabel } from '@/lib/labels';
import { Button, Card, DecisionBlock, Measure, StatusPill, Text, useTheme } from '@/ui';

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

/**
 * The Home command centre (docs/13 §3), as a Decision Block (docs/16 §6).
 * Today is not a card the user opens; it is a decision Forma already made, so
 * it sits on the screen's own ground with the eyebrow and the door on top, the
 * readiness line as the lead, and Forma's sentence as its basis.
 */
export function TodayCard({ active, today, inProgress, sentence, deferred, onStart, onDefer, onUndefer, onSkip, onWhy }: TodayCardProps) {
  const theme = useTheme();
  const now = useNow(30_000);

  if (!active || !today) {
    return <DecisionBlock rank="screen" eyebrow={{ text: 'Today' }} lead="No program yet" basis="Finish onboarding to get a recommended program." />;
  }

  if (inProgress) {
    const elapsed = Math.max(0, (now - new Date(inProgress.startedAt).getTime()) / 1000);
    return (
      <DecisionBlock
        rank="screen"
        eyebrow={{ text: 'In progress', tone: 'accent' }}
        lead={inProgress.name}
        basis={
          <View style={styles.inline}>
            <Measure value={formatDuration(elapsed)} size="numBody" tone="textSecondary" accessibilityLabel={`${formatDuration(elapsed)} elapsed`} />
            <Text variant="callout" color="textSecondary">
              elapsed
            </Text>
          </View>
        }
        action={<Button label="Resume workout" size="lg" fullWidth icon="play" onPress={onStart} />}
      />
    );
  }

  if (today.kind === 'rest') {
    return (
      <DecisionBlock
        rank="screen"
        eyebrow={{ text: 'Today' }}
        lead="Rest day"
        basis={today.nextDay ? `Next: ${today.nextDay.name}` : 'Nothing planned'}
        action={today.nextDay ? <Button label="Train anyway" variant="secondary" size="lg" fullWidth onPress={onStart} /> : undefined}
      />
    );
  }

  const dayRow = active.days[today.dayIndex];
  const exercises = dayRow?.exercises ?? [];
  const focus = (dayRow?.focusMuscleIds ?? []).slice(0, 3).map(muscleLabel);
  const minutes = dayRow?.estimatedMinutes ?? today.day.estimatedMinutes;

  if (deferred) {
    // A discrete item docked for later, so it keeps a container.
    return (
      <Card padded={false} style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm }}>
        <View style={styles.deferredRow}>
          <View style={{ flex: 1 }}>
            <Text variant="headline">{today.day.name} · later today</Text>
            <Text variant="caption" color="textSecondary">
              <Text variant="numCaption">{exercises.length}</Text> exercises · about <Text variant="numCaption">{minutes}</Text> min
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
    <DecisionBlock
      rank="screen"
      // Teal says Forma changed something: a layoff was absorbed into today's plan.
      eyebrow={welcomeBack ? { text: `Welcome back · ${today.layoffDays} days off`, tone: 'accent' } : { text: 'Today' }}
      lead={readyLine(today.day.name)}
      basis={
        <View style={{ gap: theme.spacing.sm }}>
          {sentence ? (
            <Text variant="body" color="textSecondary">
              {sentence}
            </Text>
          ) : focus.length > 0 ? (
            <View style={styles.focus}>
              {focus.map((f) => (
                <StatusPill key={f} label={f} tone="neutral" icon="ellipse" />
              ))}
            </View>
          ) : null}
          <Text variant="caption" color="textTertiary">
            <Text variant="numCaption">{exercises.length}</Text> exercises · about <Text variant="numCaption">{minutes}</Text> min
          </Text>
        </View>
      }
      door={{ label: 'Why?', onPress: onWhy, accessibilityLabel: 'Why this workout' }}
      action={<Button label="Start workout" size="lg" fullWidth icon="play" onPress={onStart} />}
      footer={
        <View style={styles.secondary}>
          <Button label="Do later" variant="ghost" onPress={onDefer} />
          <Button label="Skip this day" variant="ghost" onPress={onSkip} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  focus: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  inline: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  secondary: { flexDirection: 'row', justifyContent: 'space-between' },
  deferredRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
