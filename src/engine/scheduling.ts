import type { Explanation, ProgramDay, SchedulingMode } from '@/domain';
import { daysBetween } from '@/lib/dates';

import { buildExplanation } from './explanations';

export const WELCOME_BACK_DAYS = 5;
export const LAYOFF_LIGHT_DAYS = 14;
export const LAYOFF_HEAVY_DAYS = 28;

export type SchedulingProgram = {
  schedulingMode: SchedulingMode;
  weekdayMap: Record<string, number> | null;
  nextDayIndex: number;
};

export type ResolveTodayInput = {
  program: SchedulingProgram;
  /** Ordered by `order`. */
  days: ProgramDay[];
  lastCompletedAt: string | null;
  today?: Date;
};

export type TodayResolution =
  | { kind: 'train'; day: ProgramDay; dayIndex: number; explanation: Explanation }
  | { kind: 'welcome_back'; day: ProgramDay; dayIndex: number; layoffDays: number; loadPercent: number; suggestRestart: boolean; explanation: Explanation }
  | { kind: 'rest'; nextDay: ProgramDay | null; nextDayIndex: number; explanation: Explanation };

/** Load reduction after time away (docs/05 §2.1 rule 7). Returns a percent to remove. */
export function layoffReductionPercent(days: number): number {
  if (days >= LAYOFF_HEAVY_DAYS) return 20;
  if (days > LAYOFF_LIGHT_DAYS) return 10;
  return 0;
}

function nextTrainingIndex(days: ProgramDay[], from: number): number {
  if (days.length === 0) return 0;
  for (let i = 0; i < days.length; i++) {
    const idx = (from + i) % days.length;
    if (!days[idx]!.isRest) return idx;
  }
  return from % days.length;
}

/** What is today's workout? (docs/05 §9b) */
export function resolveTodaysWorkout(input: ResolveTodayInput): TodayResolution {
  const { program, days } = input;
  const today = input.today ?? new Date();
  const layoffDays = input.lastCompletedAt ? daysBetween(input.lastCompletedAt, today) : 0;

  let dayIndex: number;
  if (program.schedulingMode === 'weekday' && program.weekdayMap) {
    const weekday = today.getDay();
    const mapped = days.findIndex((d) => program.weekdayMap?.[d.id] === weekday);
    if (mapped < 0) {
      const nextIdx = nextTrainingIndex(days, program.nextDayIndex);
      return {
        kind: 'rest',
        nextDay: days[nextIdx] ?? null,
        nextDayIndex: nextIdx,
        explanation: buildExplanation({ ruleId: 'schedule.weekday.rest', factors: [{ label: 'Next', value: days[nextIdx]?.name ?? '—' }] }),
      };
    }
    dayIndex = mapped;
  } else {
    dayIndex = nextTrainingIndex(days, program.nextDayIndex);
  }

  const day = days[dayIndex];
  if (!day) {
    return { kind: 'rest', nextDay: null, nextDayIndex: 0, explanation: buildExplanation({ ruleId: 'schedule.weekday.rest' }) };
  }

  if (input.lastCompletedAt && layoffDays >= WELCOME_BACK_DAYS) {
    const loadPercent = Math.max(layoffReductionPercent(layoffDays), 10);
    return {
      kind: 'welcome_back',
      day,
      dayIndex,
      layoffDays,
      loadPercent,
      suggestRestart: layoffDays >= LAYOFF_HEAVY_DAYS,
      explanation: buildExplanation({
        ruleId: 'schedule.welcome_back',
        vars: { days: layoffDays, percent: loadPercent },
        confidence: 'medium',
        factors: [
          { label: 'Last session', value: input.lastCompletedAt.slice(0, 10) },
          { label: 'Loads', value: `−${loadPercent}%` },
        ],
        counterfactual: 'Train normally for one session and loads return to your usual targets.',
      }),
    };
  }

  return {
    kind: 'train',
    day,
    dayIndex,
    explanation: buildExplanation({
      ruleId: 'schedule.sequential.next',
      factors: [{ label: 'Day', value: `${dayIndex + 1} of ${days.length}` }],
    }),
  };
}

/** Pointer after completing or skipping `dayIndex`. */
export function advanceDayIndex(days: ProgramDay[], dayIndex: number): number {
  if (days.length === 0) return 0;
  return nextTrainingIndex(days, (dayIndex + 1) % days.length);
}
