import { useEffect } from 'react';
import { type DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '../theme';

export type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
};

/** Placeholder block that pulses; static under reduced motion. */
export function Skeleton({ width = '100%', height = 16, radius }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (theme.reduceMotion) {
      opacity.set(0.7);
      return;
    }
    opacity.set(withRepeat(withTiming(0.45, { duration: 800 }), -1, true));
  }, [theme.reduceMotion, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius ?? theme.radius.sm, backgroundColor: theme.colors.skeleton }, style]}
    />
  );
}
