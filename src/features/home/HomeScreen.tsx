import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { features } from '@/config/flags';
import { abandonSession, finishSession, loadSession, logBodyweight, setNextDayIndex, startSession } from '@/data/repositories';
import { advanceDayIndex } from '@/engine';
import { greetingForHour, localDate, weeksSince } from '@/lib/dates';
import { formatWeight, kgToUnit, unitToKg } from '@/lib/units';
import { GOAL_LABEL } from '@/store/onboardingStore';
import { useUiStore } from '@/store/uiStore';
import { Button, Card, IconButton, ListRow, NumericKeypad, Screen, Sheet, Skeleton, Text, WhySheet, useTheme, useToast } from '@/ui';

import { useCurrentUser } from '../app/UserProvider';
import { useNow } from '../app/useNow';
import { TodayCard } from './TodayCard';
import { useHomeData } from './useHomeData';

const STALE_SESSION_MS = 12 * 60 * 60 * 1000;

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

  const [starting, setStarting] = useState(false);
  const now = useNow(60_000);
  const inProgress = data?.inProgress ?? null;
  const staleSession = inProgress && now - Date.parse(inProgress.startedAt) > STALE_SESSION_MS ? inProgress : null;

  const openSession = (sessionId: string) => router.push({ pathname: '/workout/[sessionId]', params: { sessionId } });

  const startWorkout = async () => {
    if (inProgress && !staleSession) {
      openSession(inProgress.id);
      return;
    }
    if (!active || !today || starting) return;
    setStarting(true);
    try {
      const dayIndex = today.kind === 'rest' ? today.nextDayIndex : today.dayIndex;
      const experience = (data?.profile?.trainingExperience as 'beginner' | 'intermediate' | 'advanced' | undefined) ?? 'intermediate';
      const id = await startSession({ userId: user.id, active, dayIndex, unit, experience, outOfSequence: today.kind === 'rest' });
      openSession(id);
    } catch (e) {
      toast.show({ message: e instanceof Error ? e.message : "Couldn't start the workout" });
    } finally {
      setStarting(false);
    }
  };

  const resolveStale = async (action: 'finish' | 'discard') => {
    if (!staleSession) return;
    if (action === 'discard') {
      await abandonSession(staleSession.id);
    } else {
      const loaded = await loadSession(staleSession.id);
      const experience = (data?.profile?.trainingExperience as 'beginner' | 'intermediate' | 'advanced' | undefined) ?? 'intermediate';
      if (loaded) await finishSession({ userId: user.id, loaded, unit, experience });
    }
    refetch();
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
  // The unit is passed separately so it can be set a step down (docs/16 V2).
  const weightValue = trend?.avg7Kg != null ? kgToUnit(trend.avg7Kg, unit).toFixed(1) : undefined;
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
          <View style={{ gap: theme.spacing.sm }}>
            <Skeleton height={14} width="30%" />
            <Skeleton height={34} width="60%" />
            <Skeleton height={18} width="50%" />
            <Skeleton height={56} radius={12} />
          </View>
        ) : (
          <TodayCard
            active={active}
            today={today}
            sentence={data?.todaySentence ?? null}
            inProgress={staleSession ? null : inProgress}
            deferred={deferred}
            onStart={startWorkout}
            onDefer={() => setDeferredOn(localDate())}
            onUndefer={() => setDeferredOn(null)}
            onSkip={() => setSkipSheet(true)}
            onWhy={() => setWhy(true)}
          />
        )}
      </View>

      <Card padded={false} style={{ marginTop: theme.spacing.xxxl, paddingHorizontal: theme.spacing.lg }}>
        <ListRow
          title="Bodyweight"
          subtitle={weightSubtitle}
          value={weightValue}
          valueUnit={weightValue ? unit : undefined}
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

      <Sheet visible={staleSession !== null} onClose={() => undefined} title={staleSession ? `Unfinished ${staleSession.name}` : ''}>
        <Text variant="body" color="textSecondary">
          You started this workout {staleSession ? Math.round((now - Date.parse(staleSession.startedAt)) / 3_600_000) : 0} hours ago. Finish it to keep the sets you logged, or discard it.
        </Text>
        <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
          <Button label="Finish it" size="lg" fullWidth onPress={() => resolveStale('finish')} />
          <Button label="Discard" variant="destructive" onPress={() => resolveStale('discard')} style={{ alignSelf: 'center' }} />
        </View>
      </Sheet>
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
