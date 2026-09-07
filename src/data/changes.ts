import { addDatabaseChangeListener } from 'expo-sqlite';

import { DATABASE_NAME } from './db';

/** Calls `onChange` when any of the tables changes. Returns an unsubscribe. */
export function subscribeToTables(tables: string[], onChange: () => void): () => void {
  const set = new Set(tables);
  const sub = addDatabaseChangeListener((event) => {
    if (event.databaseName !== DATABASE_NAME && !event.databaseName.endsWith(DATABASE_NAME)) return;
    if (set.size === 0 || set.has(event.tableName)) onChange();
  });
  return () => sub.remove();
}
