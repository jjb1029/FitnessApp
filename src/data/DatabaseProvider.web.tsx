import type { ReactNode } from 'react';

/** Web preview only: no migrations, no seed, no database (see db.web.ts and repositories/webDemo.ts). */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
