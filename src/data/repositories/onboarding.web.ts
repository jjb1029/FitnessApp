import { nowIso } from '@/lib/dates';

import type { OnboardingCommit } from './onboarding';
import { createProgram } from './program.web';
import { logBodyweight } from './bodyweight.web';
import { demo, notifyDemo } from './webDemo';

export type { OnboardingCommit };

export async function commitOnboarding(input: OnboardingCommit): Promise<string> {
  const now = nowIso();
  demo.profile = {
    userId: input.userId,
    birthYear: input.birthYear,
    sex: input.sex,
    heightCm: input.heightCm,
    trainingExperience: input.experience,
    daysPerWeek: input.daysPerWeek,
    sessionMinutes: input.sessionMinutes,
    trainingLocation: input.location,
    limitations: [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
  };
  const programId = await createProgram(null, { userId: input.userId, template: input.recommendation.template, goal: input.goal, days: input.recommendation.days, explanation: input.recommendation.explanation });
  if (input.bodyweightKg) await logBodyweight(input.userId, input.bodyweightKg);
  demo.user = { ...demo.user, onboardingCompletedAt: now };
  notifyDemo();
  return programId;
}
