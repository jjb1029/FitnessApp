import { countCompletedSince, getActiveProgram, getInProgressSession, getLastCompletedAt, recentBodyweight, type ActiveProgram } from '@/data/repositories';
import type { SessionRow } from '@/data/schema';
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
};

const TABLES = ['program', 'program_day', 'template_exercise', 'session', 'bodyweight_entry', 'user'];

export function useHomeData(userId: string) {
  return useDbQuery<HomeData>(
    async () => {
      const [active, inProgress, lastCompletedAt, weights, completedThisWeek] = await Promise.all([
        getActiveProgram(userId),
        getInProgressSession(userId),
        getLastCompletedAt(userId),
        recentBodyweight(userId, 90),
        countCompletedSince(userId, weekStartLocalDate()),
      ]);
      const today = active ? resolveTodaysWorkout({ program: active.program, days: active.days, lastCompletedAt }) : null;
      return { active, inProgress, today, trend: bodyweightTrend(weights), completedThisWeek, lastCompletedAt };
    },
    TABLES,
    [userId],
  );
}
