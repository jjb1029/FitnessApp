import { create } from 'zustand';

import type { IntensityScale, ThemePreference, WeightUnit } from '@/domain';

/**
 * Ephemeral UI state and a mirror of the display-affecting user settings. The
 * database row is the truth; `hydrateFromSettings` is called once the user row
 * loads and whenever settings change.
 */
type UiState = {
  themePreference: ThemePreference;
  unitWeight: WeightUnit;
  intensityScale: IntensityScale;
  advancedMode: boolean;
  hapticsEnabled: boolean;
  reduceMotion: boolean;
  setThemePreference: (value: ThemePreference) => void;
  setReduceMotion: (value: boolean) => void;
  hydrateFromSettings: (settings: {
    theme: ThemePreference;
    unitWeight: WeightUnit;
    intensityScale: IntensityScale;
    advancedMode: boolean;
    haptics: boolean;
  }) => void;
};

export const useUiStore = create<UiState>((set) => ({
  themePreference: 'system',
  unitWeight: 'lb',
  intensityScale: 'rir',
  advancedMode: false,
  hapticsEnabled: true,
  reduceMotion: false,
  setThemePreference: (themePreference) => set({ themePreference }),
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
  hydrateFromSettings: (s) =>
    set({
      themePreference: s.theme,
      unitWeight: s.unitWeight,
      intensityScale: s.intensityScale,
      advancedMode: s.advancedMode,
      hapticsEnabled: s.haptics,
    }),
}));
