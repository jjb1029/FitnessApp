import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

/**
 * Rest-timer notifications only (Phase 1). Permission is requested at the
 * first rest, never at onboarding. Notifications are not shown while the app
 * is in the foreground because the in-app timer handles that case.
 */

const CHANNEL_ID = 'rest-timer';
let configured = false;
let permissionState: 'unknown' | 'granted' | 'denied' = 'unknown';

export function configureNotifications(): void {
  if (configured || Platform.OS === 'web') return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const foreground = AppState.currentState === 'active';
      return { shouldShowBanner: !foreground, shouldShowList: !foreground, shouldPlaySound: !foreground, shouldSetBadge: false };
    },
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Rest timer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
    }).catch(() => undefined);
  }
}

/** Asks once. Returns whether notifications may be scheduled. */
export async function ensureRestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (permissionState !== 'unknown') return permissionState === 'granted';
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
      permissionState = 'granted';
      return true;
    }
    if (!current.canAskAgain) {
      permissionState = 'denied';
      return false;
    }
    const requested = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    permissionState = requested.granted ? 'granted' : 'denied';
    return requested.granted;
  } catch {
    permissionState = 'denied';
    return false;
  }
}

/** Schedules the "rest done" alert for an absolute time. Returns the id for cancellation. */
export async function scheduleRestEnd(endsAtMs: number, body: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const allowed = await ensureRestNotificationPermission();
  if (!allowed) return null;
  const seconds = Math.max(1, Math.round((endsAtMs - Date.now()) / 1000));
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Rest done', body, sound: true, ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
    });
  } catch {
    return null;
  }
}

export async function cancelRestEnd(id: string | null): Promise<void> {
  if (!id || Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}
