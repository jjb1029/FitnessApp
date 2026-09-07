import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';

import { useUiStore } from '@/store/uiStore';

import {
  darkColors,
  lightColors,
  motion,
  radius,
  sizes,
  spacing,
  typography,
  type Colors,
} from './tokens';

export type Theme = {
  colors: Colors;
  spacing: typeof spacing;
  radius: typeof radius;
  sizes: typeof sizes;
  typography: typeof typography;
  motion: typeof motion;
  isDark: boolean;
  reduceMotion: boolean;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const preference = useUiStore((s) => s.themePreference);
  const reduceMotion = useUiStore((s) => s.reduceMotion);
  const setReduceMotion = useUiStore((s) => s.setReduceMotion);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, [setReduceMotion]);

  const isDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark';

  const theme = useMemo<Theme>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      spacing,
      radius,
      sizes,
      typography,
      motion,
      isDark,
      reduceMotion,
    }),
    [isDark, reduceMotion],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}
