import { countCompletedSince, getActiveProgram, getExerciseHistory, getInProgressSession, getLastCompletedAt, getProfile, recentBodyweight, type ActiveProgram } from '@/data/repositories';
import type { ProfileRow, SessionRow } from '@/data/schema';
import { useDbQuery } from '@/data/useDbQuery';
import { bodyweightTrend, primaryLoad, resolveTodaysWorkout, suggestNextTargets, todayLine, type BodyweightTrend, type ProgressionTemplate, type TodayResolution } from '@/engine';
import { weekStartLocalDate } from '@/lib/dates';
import { muscleLabel } from '@/lib/labels';
import { displayLoad, trimNumber } from '@/lib/units';
import { useUiStore } from '@/store/uiStore';

export type HomeData = {
  active: ActiveProgram | null;
  inProgress: SessionRow | null;
  today: TodayResolution | null;
  /** Forma's one sentence about today, from the engine's targets. */
  todaySentence: string | null;
  trend: BodyweightTrend;
  completedThisWeek: number;
  lastCompletedAt: string | null;
  profile: ProfileRow | null;
};

const TABLES = ['program', 'program_day', 'template_exercise', 'session', 'bodyweight_entry', 'user', 'profile'];

export function useHomeData(userId: string) {
  const unit = useUiStore((s) => s.unitWeight);
  return useDbQuery<HomeData>(
    async () => {
      const [active, inProgress, lastCompletedAt, weights, completedThisWeek, profile] = await Promise.all([
        getActiveProgram(userId),
        getInProgressSession(userId),
        getLastCompletedAt(userId),
        recentBodyweight(userId, 90),
        countCompletedSince(userId, weekStartLocalDate()),
        getProfile(userId),
      ]);
      const today = active ? resolveTodaysWorkout({ program: active.program, days: active.days, lastCompletedAt }) : null;

      let todaySentence: string | null = null;
      if (active && today && today.kind !== 'rest') {
        const day = active.days[today.dayIndex];
        const experience = (profile?.trainingExperience as 'beginner' | 'intermediate' | 'advanced' | undefined) ?? 'intermediate';
        const increases: { name: string; loadDisplay: string }[] = [];
        if (day) {
          for (const te of day.exercises) {
            const history = await getExerciseHistory(userId, te.exercise.id, 6);
            if (history.length === 0) continue;
            const targets = suggestNextTargets({ exercise: te.exercise, template: { repRange: te.repRange, targetRir: te.targetRir, progressionScheme: te.progressionScheme as ProgressionTemplate['progressionScheme'], workingSets: te.workingSets }, history, experience, unit });
            const prev = primaryLoad(history[0]!.sets);
            if (targets.loadKg !== null && prev !== null && targets.loadKg > prev + 0.01) increases.push({ name: te.exercise.name, loadDisplay: `${trimNumber(displayLoad(targets.loadKg, unit, te.exercise.incrementKg))} ${unit}` });
          }
        }
        todaySentence = todayLine({
          focus: (day?.focusMuscleIds ?? []).slice(0, 3).map(muscleLabel),
          increases,
          firstSession: lastCompletedAt === null,
          welcomeBackPercent: today.kind === 'welcome_back' ? today.loadPercent : null,
        });
      }

      return { active, inProgress, today, todaySentence, trend: bodyweightTrend(weights), completedThisWeek, lastCompletedAt, profile };
    },
    TABLES,
    [userId, unit],
  );
}
