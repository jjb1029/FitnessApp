/**
 * Web is used only to preview the design system and onboarding screens
 * (docs/01 §5). There is no database on web; any query fails loudly when
 * called, but merely importing this module is safe.
 */
import type { drizzle } from 'drizzle-orm/expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'forma.db';

const unavailable = () => {
  throw new Error('The database is not available on web. Use a native build.');
};

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    if (typeof prop === 'symbol' || prop === 'then' || prop === '__esModule') return undefined;
    return unavailable;
  },
});
export type Db = typeof db;
export { schema };
