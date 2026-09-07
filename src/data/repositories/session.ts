import { and, count, desc, eq, gte, isNull } from 'drizzle-orm';

import { db } from '../db';
import { sessions, type SessionRow } from '../schema';

export async function getInProgressSession(userId: string): Promise<SessionRow | null> {
  const row = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.status, 'in_progress'), isNull(sessions.deletedAt)))
    .orderBy(desc(sessions.startedAt))
    .get();
  return row ?? null;
}

export async function getLastCompletedAt(userId: string): Promise<string | null> {
  const row = await db
    .select({ endedAt: sessions.endedAt })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.status, 'completed'), isNull(sessions.deletedAt)))
    .orderBy(desc(sessions.endedAt))
    .get();
  return row?.endedAt ?? null;
}

/** Completed sessions on or after a local date (YYYY-MM-DD). */
export async function countCompletedSince(userId: string, sinceLocalDate: string): Promise<number> {
  const row = await db
    .select({ n: count() })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.status, 'completed'), gte(sessions.localDate, sinceLocalDate), isNull(sessions.deletedAt)))
    .get();
  return row?.n ?? 0;
}
