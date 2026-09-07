import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { subscribeToTables } from '@/data/changes';
import { ensureLocalUser } from '@/data/repositories';
import type { UserRow } from '@/data/schema';
import { useUiStore } from '@/store/uiStore';
import { ErrorState } from '@/ui';

type UserContextValue = { user: UserRow; refresh: () => void };

const UserContext = createContext<UserContextValue | null>(null);

/**
 * Loads (or creates) the single local user, mirrors display settings into the
 * UI store, and re-reads when the user row changes.
 */
export function UserProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [user, setUser] = useState<UserRow | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const hydrate = useUiStore((s) => s.hydrateFromSettings);

  const refresh = useCallback(() => {
    ensureLocalUser()
      .then((row) => {
        setUser(row);
        hydrate(row.settings);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e : new Error(String(e))));
  }, [hydrate]);

  useEffect(() => {
    refresh();
    return subscribeToTables(['user'], refresh);
  }, [refresh]);

  const value = useMemo(() => (user ? { user, refresh } : null), [user, refresh]);

  if (error) return <ErrorState title="Couldn't load your profile" message={error.message} onRetry={refresh} />;
  if (!value) return <>{fallback}</>;
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useCurrentUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useCurrentUser must be used inside UserProvider');
  return ctx;
}
