import { eq } from 'drizzle-orm';

import type { EquipmentId, Experience, GoalType, Sex, TrainingLocation } from '@/domain';
import type { ProgramRecommendation } from '@/engine';
import { nowIso } from '@/lib/dates';
import { uuidv7 } from '@/lib/uuid';

import { db } from '../db';
import { equipmentAccess, exercisePreferences, goals, profiles, users } from '../schema';
import { logBodyweight } from './bodyweight';
import { createProgram } from './program';

export type OnboardingCommit = {
  userId: string;
  goal: GoalType;
  experience: Experience;
  daysPerWeek: number;
  sessionMinutes: number;
  location: TrainingLocation;
  equipment: EquipmentId[];
  avoidExerciseIds: string[];
  recommendation: ProgramRecommendation;
  bodyweightKg: number | null;
  birthYear: number | null;
  sex: Sex;
  heightCm: number | null;
};

/** Writes everything onboarding collected in one transaction and marks the user onboarded. */
export async function commitOnboarding(input: OnboardingCommit): Promise<string> {
  const now = nowIso();
  const sync = { createdAt: now, updatedAt: now, deletedAt: null, version: 1 };
  let programId = '';
  await db.transaction(async (tx) => {
    await tx
      .insert(profiles)
      .values({
        userId: input.userId,
        birthYear: input.birthYear,
        sex: input.sex,
        heightCm: input.heightCm,
        trainingExperience: input.experience,
        daysPerWeek: input.daysPerWeek,
        sessionMinutes: input.sessionMinutes,
        trainingLocation: input.location,
        limitations: [],
        ...sync,
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { trainingExperience: input.experience, daysPerWeek: input.daysPerWeek, sessionMinutes: input.sessionMinutes, trainingLocation: input.location, updatedAt: now },
      });

    await tx.update(goals).set({ isCurrent: false, endedAt: now, updatedAt: now }).where(eq(goals.userId, input.userId));
    await tx.insert(goals).values({ id: uuidv7(), userId: input.userId, type: input.goal, isCurrent: true, startedAt: now, endedAt: null, ...sync });

    const locations: ('gym' | 'home')[] = input.location === 'both' ? ['gym', 'home'] : [input.location];
    for (const location of locations) {
      for (const equipmentId of input.equipment) {
        await tx
          .insert(equipmentAccess)
          .values({ userId: input.userId, equipmentId, location, available: true, ...sync })
          .onConflictDoUpdate({ target: [equipmentAccess.userId, equipmentAccess.equipmentId, equipmentAccess.location], set: { available: true, updatedAt: now } });
      }
    }

    for (const exerciseId of input.avoidExerciseIds) {
      await tx.insert(exercisePreferences).values({ id: uuidv7(), userId: input.userId, exerciseId, sentiment: 'avoid', reason: 'dislike', note: null, ...sync });
    }

    programId = await createProgram(tx, {
      userId: input.userId,
      template: input.recommendation.template,
      goal: input.goal,
      days: input.recommendation.days,
      explanation: input.recommendation.explanation,
    });

    await tx.update(users).set({ onboardingCompletedAt: now, updatedAt: now }).where(eq(users.id, input.userId));
  });

  if (input.bodyweightKg) await logBodyweight(input.userId, input.bodyweightKg);
  return programId;
}
