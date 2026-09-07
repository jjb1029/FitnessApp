import { eq } from 'drizzle-orm';

import { defaultUserSettings, type UserSettings } from '@/domain';
import { nowIso } from '@/lib/dates';
import { defaultWeightUnitForLocale } from '@/lib/units';
import { uuidv7 } from '@/lib/uuid';

import { db } from '../db';
import { users, type UserRow } from '../schema';

function deviceLocale(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

/** The local user. Created on first launch; there is exactly one in Phase 1. */
export async function ensureLocalUser(): Promise<UserRow> {
  const existing = await db.select().from(users).limit(1);
  if (existing[0]) return existing[0];
  const now = nowIso();
  const row: UserRow = {
    id: uuidv7(),
    authUserId: null,
    settings: defaultUserSettings(defaultWeightUnitForLocale(deviceLocale())),
    onboardingCompletedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
  };
  await db.insert(users).values(row);
  return row;
}

export async function updateUserSettings(userId: string, patch: Partial<UserSettings>): Promise<void> {
  const current = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!current) throw new Error('User not found');
  await db
    .update(users)
    .set({ settings: { ...current.settings, ...patch }, updatedAt: nowIso(), version: current.version + 1 })
    .where(eq(users.id, userId));
}

/** Dev helper: wipe onboarding state so the flow can be re-run. */
export async function resetOnboarding(userId: string): Promise<void> {
  await db.update(users).set({ onboardingCompletedAt: null, updatedAt: nowIso() }).where(eq(users.id, userId));
}
