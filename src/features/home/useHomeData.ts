import { countCompletedSince, getActiveProgram, getInProgressSession, getLastCompletedAt, getProfile, recentBodyweight, type ActiveProgram } from '@/data/repositories';
import type { ProfileRow, SessionRow } from '@/data/schema';
import { useDbQuery } from '@/data/useDbQuery';
import { bodyweightTrend, resolveTodaysWorkout, type BodyweightTrend, type TodayResolution } from '@/engine';
import { weekStartLocalDate } from '@/lib/dates';

export type HomeData = {
  active: ActiveProgram | null;
  inProgress: SessionRow | null;
  today: TodayResolution | null;
  trend: BodyweightTrend;
  completedThisWeek: number;
  lastCompletedAt: string | null;
  profile: ProfileRow | null;
};

const TABLES = ['program', 'program_day', 'template_exercise', 'session', 'bodyweight_entry', 'user', 'profile'];

export function useHomeData(userId: string) {
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
      return { active, inProgress, today, trend: bodyweightTrend(weights), completedThisWeek, lastCompletedAt, profile };
    },
    TABLES,
    [userId],
  );
}
