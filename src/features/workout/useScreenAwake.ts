import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';

const TAG = 'forma-workout';

/**
 * Keeps the screen awake for the duration of a workout.
 *
 * `useKeepAwake` from expo-keep-awake throws ("the wake lock with tag ... has
 * not activated yet") when the screen unmounts before activation resolves, or
 * when a second session mounts before the first released its lock. Both happen
 * in normal use, so activation and release are handled here and failures are
 * swallowed: a screen that dims is a small problem, a crash is not.
 */
export function useScreenAwake(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;
    let released = false;
    const activation = activateKeepAwakeAsync(TAG).catch(() => undefined);
    return () => {
      released = true;
      void activation.then(() => {
        if (!released) return;
        try {
          const result = deactivateKeepAwake(TAG) as unknown;
          if (result instanceof Promise) result.catch(() => undefined);
        } catch {
          // The lock was never held; nothing to release.
        }
      });
    };
  }, [enabled]);
}
