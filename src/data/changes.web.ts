/** Web preview only: no database, no change events. */
export function subscribeToTables(_tables: string[], _onChange: () => void): () => void {
  return () => undefined;
}
