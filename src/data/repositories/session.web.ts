import type { SessionRow } from '../schema';
import { demo } from './webDemo';

export async function getInProgressSession(): Promise<SessionRow | null> {
  for (const s of demo.sessions.values()) if (s.session.status === 'in_progress') return s.session;
  return null;
}

export async function getLastCompletedAt(): Promise<string | null> {
  let latest: string | null = null;
  for (const s of demo.sessions.values()) if (s.session.status === 'completed' && s.session.endedAt && (!latest || s.session.endedAt > latest)) latest = s.session.endedAt;
  return latest;
}

export async function countCompletedSince(_userId: string, since: string): Promise<number> {
  let n = 0;
  for (const s of demo.sessions.values()) if (s.session.status === 'completed' && s.session.localDate >= since) n++;
  return n;
}
