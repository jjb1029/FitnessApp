import { demo } from './repositories/webDemo';

/** Web preview only: change events come from the in-memory demo store. */
export function subscribeToTables(_tables: string[], onChange: () => void): () => void {
  demo.listeners.add(onChange);
  return () => {
    demo.listeners.delete(onChange);
  };
}
