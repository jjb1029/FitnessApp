import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useUiStore } from '@/store/uiStore';

/** Haptics respecting the user's setting (docs/02 §4.5). Never on navigation. */
function enabled(): boolean {
  return Platform.OS !== 'web' && useUiStore.getState().hapticsEnabled;
}

export const haptics = {
  /** A tough set, a warm-up, the last three seconds of rest. */
  tick(): void {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
  /** A completed working set; rest running out. */
  medium(): void {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  },
  /** A personal record. */
  success(): void {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  warning(): void {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  },
  selection(): void {
    if (enabled()) Haptics.selectionAsync().catch(() => undefined);
  },
};
