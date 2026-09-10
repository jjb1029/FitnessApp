import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ResolvedDay } from '@/engine';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Button, Card, ErrorState, Icon, Sheet, Skeleton, StatusPill, Text, WhySheet, useTheme } from '@/ui';

import { OnboardingFrame } from './OnboardingFrame';
import { useRecommendation } from './useRecommendation';

const SPLIT_LABEL: Record<string, string> = {
  full_body: 'Full body',
  upper_lower: 'Upper / Lower',
  ppl: 'Push / Pull / Legs',
  upper_lower_arms: 'Upper / Lower + Arms',
  body_part: 'Body part split',
  custom: 'Custom',
};

export function RecommendationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { recommendation, loading, error } = useRecommendation();
  const set = useOnboardingStore((s) => s.set);
  const [why, setWhy] = useState(false);
  const [options, setOptions] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const start = () => {
    if (!recommendation) return;
    set({ recommendation });
    router.push('/onboarding/personalise');
  };

  return (
    <OnboardingFrame
      step={4}
      title="Here's what I'd recommend"
      primary={{ label: 'Start this program', onPress: start, disabled: !recommendation }}
      secondary={recommendation ? { label: 'See other options', onPress: () => setOptions(true) } : undefined}>
      {error ? <ErrorState message={error.message} /> : null}
      {loading ? (
        <View style={{ gap: theme.spacing.md }}>
          <Skeleton height={34} width="70%" />
          <Skeleton height={20} width="50%" />
          <Skeleton height={60} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </View>
      ) : null}
      {recommendation ? (
        <View style={{ gap: theme.spacing.lg }}>
          <View>
            <Text variant="display">{recommendation.template.name}</Text>
            <Text variant="callout" color="textSecondary" style={{ marginTop: theme.spacing.xs }}>
              {SPLIT_LABEL[recommendation.template.split] ?? recommendation.template.split} · {recommendation.template.daysPerWeek} days a week · about {Math.round(recommendation.days.reduce((a, d) => a + d.estimatedMinutes, 0) / recommendation.days.length)} min
            </Text>
          </View>

          <View>
            <Text variant="body">{recommendation.explanation.short}</Text>
            <Pressable onPress={() => setWhy(true)} accessibilityRole="button" hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text variant="callout" color="accent" style={{ fontWeight: '600' }}>
                Why this program?
              </Text>
            </Pressable>
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            {recommendation.days.map((day, i) => (
              <DayCard key={day.name} day={day} expanded={expanded === i} onToggle={() => setExpanded(expanded === i ? null : i)} />
            ))}
          </View>
        </View>
      ) : null}

      <WhySheet visible={why} onClose={() => setWhy(false)} title={recommendation?.template.name ?? ''} explanation={recommendation?.explanation ?? null} />

      <Sheet visible={options} onClose={() => setOptions(false)} title="Other options">
        <View style={{ gap: theme.spacing.sm }}>
          {recommendation?.alternatives.map((alt) => (
            <Card
              key={alt.template.id}
              onPress={() => {
                set({ chosenTemplateId: alt.template.id });
                setOptions(false);
              }}>
              <Text variant="headline">{alt.template.name}</Text>
              <Text variant="callout" color="textSecondary">
                {alt.template.daysPerWeek} days · {alt.template.sessionMinutes} min
              </Text>
              <Text variant="caption" color="textSecondary" style={{ marginTop: theme.spacing.xs }}>
                {alt.explanation.short}
              </Text>
            </Card>
          ))}
          <Button label="Keep the recommendation" variant="ghost" onPress={() => setOptions(false)} />
        </View>
      </Sheet>
    </OnboardingFrame>
  );
}

function DayCard({ day, expanded, onToggle }: { day: ResolvedDay; expanded: boolean; onToggle: () => void }) {
  const theme = useTheme();
  const names = day.exercises.map((e) => e.exercise.name);
  const preview = names.slice(0, 2).join(', ') + (names.length > 2 ? `, +${names.length - 2}` : '');
  return (
    <Card onPress={onToggle} style={{ paddingVertical: theme.spacing.md }} accessibilityState={{ expanded }}>
      <View style={styles.dayHeader}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline">{day.name}</Text>
          <Text variant="caption" color="textSecondary" numberOfLines={expanded ? undefined : 1}>
            {expanded ? `${day.exercises.length} exercises · ${day.estimatedMinutes} min` : `${preview} · ${day.estimatedMinutes} min`}
          </Text>
        </View>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="textTertiary" />
      </View>
      {expanded ? (
        <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
          {day.exercises.map((e) => (
            <View key={e.exercise.id} style={styles.exerciseRow}>
              <View style={{ flex: 1 }}>
                <Text variant="callout">{e.exercise.name}</Text>
                {e.swappedFrom ? (
                  <Text variant="caption" color="textTertiary">
                    replaces {e.swappedFrom.name}
                  </Text>
                ) : null}
              </View>
              <Text variant="numBody" color="textSecondary">
                {e.sets} × {e.repRange.min}–{e.repRange.max}
              </Text>
            </View>
          ))}
          {day.trim.length > 0 ? <StatusPill label="Trimmed to fit your session length" tone="neutral" icon="cut-outline" /> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 },
});
