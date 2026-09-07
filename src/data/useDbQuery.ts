import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { subscribeToTables } from './changes';

export type DbQueryState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
};

/**
 * Runs an async repository query, re-runs it when the screen gains focus and
 * whenever one of the listed tables changes. Keeps the last data while
 * refetching so screens never flash a skeleton on updates.
 */
export function useDbQuery<T>(fetcher: () => Promise<T>, tables: string[], deps: unknown[] = []): DbQueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });
  const generation = useRef(0);
  const depsKey = JSON.stringify(deps);
  const tablesKey = tables.join('|');

  const run = useCallback(() => {
    void depsKey; // the callback identity follows the caller's deps, serialised
    const gen = ++generation.current;
    fetcherRef
      .current()
      .then((result) => {
        if (gen !== generation.current) return;
        setData(result);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (gen !== generation.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      });
  }, [depsKey]);

  useFocusEffect(
    useCallback(() => {
      run();
    }, [run]),
  );

  useEffect(() => subscribeToTables(tablesKey.split('|'), run), [run, tablesKey]);

  return { data, loading, error, refetch: run };
}
