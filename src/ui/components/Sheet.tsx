import { useEffect, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme';
import { Text } from './Text';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Fraction of the window height the sheet may grow to. */
  maxHeightFraction?: number;
  testID?: string;
};

/**
 * Bottom sheet: drag handle, swipe-to-dismiss, backdrop tap to close.
 * Animates on the UI thread; cross-fades under reduced motion.
 */
export function Sheet({ visible, onClose, title, children, maxHeightFraction = 0.9, testID }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const translateY = useSharedValue(windowHeight);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.set(withTiming(1, { duration: theme.motion.normal }));
      translateY.set(theme.reduceMotion ? 0 : withSpring(0, { damping: 22, stiffness: 240, mass: 0.8 }));
    } else {
      opacity.set(withTiming(0, { duration: theme.motion.fast }));
      translateY.set(theme.reduceMotion ? windowHeight : withTiming(windowHeight, { duration: theme.motion.normal }));
    }
  }, [visible, windowHeight, theme.reduceMotion, theme.motion.fast, theme.motion.normal, opacity, translateY]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.set(e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 800) {
        translateY.set(withTiming(windowHeight, { duration: theme.motion.normal }, () => runOnJS(onClose)()));
      } else {
        translateY.set(withSpring(0, { damping: 22, stiffness: 240 }));
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container} testID={testID}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlay }, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.bgElevated,
                borderTopLeftRadius: theme.radius.lg,
                borderTopRightRadius: theme.radius.lg,
                paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
                maxHeight: windowHeight * maxHeightFraction,
              },
              sheetStyle,
            ]}>
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
            </View>
            {title ? (
              <Text variant="title2" style={{ paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.md }}>
                {title}
              </Text>
            ) : null}
            <View style={{ paddingHorizontal: theme.spacing.xl }}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.2)', elevation: 12 },
  handleRow: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 36, height: 4, borderRadius: 2 },
});
