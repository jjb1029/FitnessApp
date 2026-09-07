import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErrorState, Text, useTheme } from '@/ui';

import { db } from './db';
import migrations from './migrations/migrations';
import { seedCatalog } from './seed';

/**
 * Runs migrations and the catalog seed before the first screen mounts.
 * Shows a branded loading state; surfaces failures instead of hiding them.
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!success) return;
    let cancelled = false;
    seedCatalog(db)
      .then(() => {
        if (!cancelled) setSeeded(true);
      })
      .catch((e: unknown) => {
        if (!cancelled) setSeedError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, [success, attempt]);

  if (error) {
    return <ErrorState title="Couldn't open your data" message={error.message} />;
  }
  if (seedError) {
    return (
      <ErrorState
        title="Couldn't load the exercise library"
        message={seedError.message}
        onRetry={() => {
          setSeedError(null);
          setAttempt((a) => a + 1);
        }}
      />
    );
  }
  if (!success || !seeded) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.bg }]}>
        <Text variant="title1">Forma</Text>
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
