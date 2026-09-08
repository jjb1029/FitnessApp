import type { UserSettings } from '@/domain';

import type { ProfileRow, UserRow } from '../schema';
import { demo, notifyDemo } from './webDemo';

export async function ensureLocalUser(): Promise<UserRow> {
  return demo.user;
}

export async function updateUserSettings(_userId: string, patch: Partial<UserSettings>): Promise<void> {
  demo.user = { ...demo.user, settings: { ...demo.user.settings, ...patch } };
  notifyDemo();
}

export async function getProfile(): Promise<ProfileRow | null> {
  return demo.profile;
}

export async function resetOnboarding(): Promise<void> {
  demo.user = { ...demo.user, onboardingCompletedAt: null };
  demo.program = null;
  demo.sessions.clear();
  notifyDemo();
}
