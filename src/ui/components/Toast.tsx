import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme';
import { Text } from './Text';

export type ToastOptions = {
  message: string;
  action?: { label: string; onPress: () => void };
  durationMs?: number;
};

type ToastApi = { show: (options: ToastOptions) => void; hide: () => void };

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      setToast(options);
      timer.current = setTimeout(hide, options.durationMs ?? (options.action ? 5000 : 2500));
    },
    [hide],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const api = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? <ToastView toast={toast} onHide={hide} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onHide }: { toast: ToastOptions; onHide: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={theme.reduceMotion ? undefined : FadeInDown.duration(theme.motion.normal)}
      exiting={theme.reduceMotion ? undefined : FadeOutDown.duration(theme.motion.fast)}
      pointerEvents="box-none"
      style={[styles.host, { bottom: insets.bottom + 80 }]}>
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          styles.toast,
          {
            backgroundColor: theme.isDark ? theme.colors.bgElevated : theme.colors.text,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.lg,
          },
        ]}>
        <Text variant="callout" style={{ color: theme.isDark ? theme.colors.text : theme.colors.bg, flex: 1 }}>
          {toast.message}
        </Text>
        {toast.action ? (
          <Pressable
            onPress={() => {
              toast.action?.onPress();
              onHide();
            }}
            accessibilityRole="button"
            hitSlop={8}>
            <Text variant="headline" style={{ color: theme.colors.accent }}>
              {toast.action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside ToastProvider');
  return api;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 48, maxWidth: 560, width: '100%' },
});
