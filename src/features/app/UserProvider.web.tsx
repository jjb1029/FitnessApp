import { createContext, useContext, type ReactNode } from 'react';

import type { UserRow } from '@/data/schema';
import { defaultUserSettings } from '@/domain';

type UserContextValue = { user: UserRow; refresh: () => void };

const demoUser: UserRow = {
  id: 'web-preview-user',
  authUserId: null,
  settings: defaultUserSettings('lb'),
  onboardingCompletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
  version: 1,
};

const UserContext = createContext<UserContextValue>({ user: demoUser, refresh: () => undefined });

/** Web preview only: a fixed, never-onboarded demo user so the onboarding screens can be previewed. */
export function UserProvider({ children }: { children: ReactNode; fallback: ReactNode }) {
  return <>{children}</>;
}

export function useCurrentUser(): UserContextValue {
  return useContext(UserContext);
}
