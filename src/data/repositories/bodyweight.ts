import { and, desc, eq, gte, isNull } from 'drizzle-orm';

import { addDays, localDate, nowIso } from '@/lib/dates';
import { uuidv7 } from '@/lib/uuid';

import { db } from '../db';
import { bodyweightEntries, type BodyweightEntryRow } from '../schema';

/** One entry per local date: a second entry the same day replaces the first. */
export async function logBodyweight(userId: string, weightKg: number, date: Date = new Date()): Promise<BodyweightEntryRow> {
  const day = localDate(date);
  const now = nowIso();
  const existing = await db
    .select()
    .from(bodyweightEntries)
    .where(and(eq(bodyweightEntries.userId, userId), eq(bodyweightEntries.localDate, day), isNull(bodyweightEntries.deletedAt)))
    .get();
  if (existing) {
    const updated = { ...existing, weightKg, measuredAt: date.toISOString(), updatedAt: now, version: existing.version + 1 };
    await db.update(bodyweightEntries).set(updated).where(eq(bodyweightEntries.id, existing.id));
    return updated;
  }
  const row: BodyweightEntryRow = {
    id: uuidv7(),
    userId,
    weightKg,
    measuredAt: date.toISOString(),
    localDate: day,
    source: 'manual',
    externalId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
  };
  await db.insert(bodyweightEntries).values(row);
  return row;
}

export async function recentBodyweight(userId: string, days = 90): Promise<BodyweightEntryRow[]> {
  const since = localDate(addDays(new Date(), -days));
  return db
    .select()
    .from(bodyweightEntries)
    .where(and(eq(bodyweightEntries.userId, userId), gte(bodyweightEntries.localDate, since), isNull(bodyweightEntries.deletedAt)))
    .orderBy(desc(bodyweightEntries.localDate));
}
