import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

/**
 * Rest-timer notifications only (Phase 1). Permission is requested at the
 * first rest, never at onboarding. Notifications are not shown while the app
 * is in the foreground because the in-app timer handles that case.
 *
 * `expo-notifications` is loaded lazily: importing it inside Expo Go on
 * Android throws (push support was removed from Expo Go in SDK 53), which
 * would take the whole root layout down. In Expo Go the in-app timer still
 * works; the background alert needs a development build.
 */

type NotificationsModule = typeof import('expo-notifications');

const CHANNEL_ID = 'rest-timer';
const isExpoGo = Constants.executionEnvironment === 'storeClient';
let module: NotificationsModule | null | undefined;
let configured = false;
let permissionState: 'unknown' | 'granted' | 'denied' = 'unknown';

function notifications(): NotificationsModule | null {
  if (module !== undefined) return module;
  if (Platform.OS === 'web' || isExpoGo) {
    module = null;
    return module;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    module = require('expo-notifications') as NotificationsModule;
  } catch {
    module = null;
  }
  return module;
}

/** True when background rest alerts can work in this build. */
export function restNotificationsSupported(): boolean {
  return notifications() !== null;
}

export function configureNotifications(): void {
  const N = notifications();
  if (configured || !N) return;
  configured = true;
  N.setNotificationHandler({
    handleNotification: async () => {
      const foreground = AppState.currentState === 'active';
      return { shouldShowBanner: !foreground, shouldShowList: !foreground, shouldPlaySound: !foreground, shouldSetBadge: false };
    },
  });
  if (Platform.OS === 'android') {
    N.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Rest timer',
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
    }).catch(() => undefined);
  }
}

/** Asks once. Returns whether notifications may be scheduled. */
export async function ensureRestNotificationPermission(): Promise<boolean> {
  const N = notifications();
  if (!N) return false;
  if (permissionState !== 'unknown') return permissionState === 'granted';
  try {
    const current = await N.getPermissionsAsync();
    if (current.granted) {
      permissionState = 'granted';
      return true;
    }
    if (!current.canAskAgain) {
      permissionState = 'denied';
      return false;
    }
    const requested = await N.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    permissionState = requested.granted ? 'granted' : 'denied';
    return requested.granted;
  } catch {
    permissionState = 'denied';
    return false;
  }
}

/** Schedules the "rest done" alert for an absolute time. Returns the id for cancellation. */
export async function scheduleRestEnd(endsAtMs: number, body: string): Promise<string | null> {
  const N = notifications();
  if (!N) return null;
  const allowed = await ensureRestNotificationPermission();
  if (!allowed) return null;
  const seconds = Math.max(1, Math.round((endsAtMs - Date.now()) / 1000));
  try {
    return await N.scheduleNotificationAsync({
      content: { title: 'Rest done', body, sound: true, ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}) },
      trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
    });
  } catch {
    return null;
  }
}

export async function cancelRestEnd(id: string | null): Promise<void> {
  const N = notifications();
  if (!id || !N) return;
  await N.cancelScheduledNotificationAsync(id).catch(() => undefined);
}
