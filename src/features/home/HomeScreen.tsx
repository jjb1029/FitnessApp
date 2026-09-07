import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { features } from '@/config/flags';
import { logBodyweight, setNextDayIndex } from '@/data/repositories';
import { advanceDayIndex } from '@/engine';
import { greetingForHour, localDate, weeksSince } from '@/lib/dates';
import { formatWeight, kgToUnit, unitToKg } from '@/lib/units';
import { GOAL_LABEL } from '@/store/onboardingStore';
import { useUiStore } from '@/store/uiStore';
import { Button, Card, IconButton, ListRow, NumericKeypad, Screen, Sheet, Skeleton, Text, WhySheet, useTheme, useToast } from '@/ui';

import { useCurrentUser } from '../app/UserProvider';
import { TodayCard } from './TodayCard';
import { useHomeData } from './useHomeData';

export function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { user } = useCurrentUser();
  const unit = useUiStore((s) => s.unitWeight);
  const { data, loading, refetch } = useHomeData(user.id);
  const [weightSheet, setWeightSheet] = useState(false);
  const [skipSheet, setSkipSheet] = useState(false);
  const [why, setWhy] = useState(false);
  const [deferredOn, setDeferredOn] = useState<string | null>(null);

  const active = data?.active ?? null;
  const today = data?.today ?? null;
  const goal = active?.program.goalType;
  const week = weeksSince(active?.program.startedAt ?? null);
  const deferred = deferredOn === localDate();

  const startWorkout = () => {
    // Session logging arrives in M3; the button is wired so the flow is testable now.
    toast.show({ message: 'Workout logging arrives in the next build.' });
  };

  const skipDay = async () => {
    if (!active || !today || today.kind === 'rest') return;
    await setNextDayIndex(active.program.id, advanceDayIndex(active.days, today.dayIndex));
    setSkipSheet(false);
    refetch();
    toast.show({ message: `Skipped ${today.day.name}` });
  };

  const saveWeight = async (value: number) => {
    if (!(value > 0)) return;
    await logBodyweight(user.id, unitToKg(value, unit));
    refetch();
    toast.show({ message: `Logged ${formatWeight(unitToKg(value, unit), unit)}` });
  };

  const trend = data?.trend;
  const weightValue = trend?.avg7Kg != null ? formatWeight(trend.avg7Kg, unit) : undefined;
  const weightSubtitle =
    trend && trend.entryCount > 0
      ? trend.ratePerWeekKg != null
        ? `${trend.ratePerWeekKg > 0 ? '↑' : '↓'} ${Math.abs(kgToUnit(trend.ratePerWeekKg, unit)).toFixed(1)} ${unit} a week · 7-day average`
        : `Latest ${trend.latestKg != null ? formatWeight(trend.latestKg, unit) : ''} · log a few more days for a trend`
      : 'Log your weight to see a trend';

  return (
    <Screen>
      <View style={[styles.header, { marginTop: theme.spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Text variant="title2">{greetingForHour(new Date().getHours())}</Text>
          <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
            {goal ? `${GOAL_LABEL[goal]} · Week ${week}` : 'Forma'}
          </Text>
        </View>
        <IconButton icon="person-circle-outline" accessibilityLabel="Settings" size={28} onPress={() => router.push('/settings')} />
      </View>

      <View style={{ marginTop: theme.spacing.xl }}>
        {loading && !data ? (
          <Card>
            <Skeleton height={14} width="30%" />
            <Skeleton height={34} width="60%" />
            <Skeleton height={18} width="50%" />
            <Skeleton height={56} radius={12} />
          </Card>
        ) : (
          <TodayCard
            active={active}
            today={today}
            inProgress={data?.inProgress ?? null}
            deferred={deferred}
            onStart={startWorkout}
            onDefer={() => setDeferredOn(localDate())}
            onUndefer={() => setDeferredOn(null)}
            onSkip={() => setSkipSheet(true)}
            onWhy={() => setWhy(true)}
          />
        )}
      </View>

      <Card padded={false} style={{ marginTop: theme.spacing.lg, paddingHorizontal: theme.spacing.lg }}>
        <ListRow
          title="Bodyweight"
          subtitle={weightSubtitle}
          value={weightValue}
          icon="scale-outline"
          chevron={false}
          trailing={<IconButton icon="add" accessibilityLabel="Log bodyweight" onPress={() => setWeightSheet(true)} filled />}
        />
        <ListRow
          title="This week"
          subtitle={active ? `${data?.completedThisWeek ?? 0} of ${active.program.daysPerWeek} sessions done` : 'No program yet'}
          icon="calendar-outline"
          trailing={active ? <WeekDots done={data?.completedThisWeek ?? 0} total={active.program.daysPerWeek} /> : undefined}
          chevron={false}
        />
      </Card>

      {features.gallery ? <Button label="Component gallery" variant="ghost" style={{ marginTop: theme.spacing.xl, alignSelf: 'center' }} onPress={() => router.push('/dev/gallery')} /> : null}

      <NumericKeypad
        visible={weightSheet}
        title="Bodyweight"
        initialValue={trend?.latestKg != null ? Number(kgToUnit(trend.latestKg, unit).toFixed(1)) : 0}
        unit={unit}
        onSubmit={saveWeight}
        onClose={() => setWeightSheet(false)}
      />

      <Sheet visible={skipSheet} onClose={() => setSkipSheet(false)} title={today && today.kind !== 'rest' ? `Skip ${today.day.name}?` : 'Skip'}>
        <Text variant="body" color="textSecondary">
          {active && today && today.kind !== 'rest' ? `Next up will be ${active.days[advanceDayIndex(active.days, today.dayIndex)]?.name ?? 'the next day'}. Nothing is lost; the program just moves on.` : ''}
        </Text>
        <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
          <Button label="Skip this day" size="lg" fullWidth onPress={skipDay} />
          <Button label="Keep it" variant="ghost" onPress={() => setSkipSheet(false)} />
        </View>
      </Sheet>

      <WhySheet visible={why} onClose={() => setWhy(false)} title={today && today.kind !== 'rest' ? today.day.name : 'Rest day'} explanation={today?.explanation ?? null} />
    </Screen>
  );
}

function WeekDots({ done, total }: { done: number; total: number }) {
  const theme = useTheme();
  return (
    <View style={styles.dots} accessible accessibilityLabel={`${done} of ${total} sessions done`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i < done ? theme.colors.success : theme.colors.border }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
