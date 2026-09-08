import { localDate, nowIso } from '@/lib/dates';
import { uuidv7 } from '@/lib/uuid';

import type { BodyweightEntryRow } from '../schema';
import { demo, notifyDemo } from './webDemo';

export async function logBodyweight(userId: string, weightKg: number, date: Date = new Date()): Promise<BodyweightEntryRow> {
  const now = nowIso();
  const day = localDate(date);
  demo.bodyweight = demo.bodyweight.filter((b) => b.localDate !== day);
  const row: BodyweightEntryRow = { id: uuidv7(), userId, weightKg, measuredAt: date.toISOString(), localDate: day, source: 'manual', externalId: null, createdAt: now, updatedAt: now, deletedAt: null, version: 1 };
  demo.bodyweight.push(row);
  notifyDemo();
  return row;
}

export async function recentBodyweight(): Promise<BodyweightEntryRow[]> {
  return [...demo.bodyweight].sort((a, b) => b.localDate.localeCompare(a.localDate));
}
