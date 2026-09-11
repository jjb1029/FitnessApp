import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '../theme';
import type { ColorName } from '../tokens';

export type ProgressBarProps = {
  /** 0..1 */
  progress: number;
  /** Neutral by default: teal is reserved for bars Forma owns, e.g. rest (docs/16 §5). */
  color?: ColorName;
  height?: number;
  accessibilityLabel?: string;
  /** Glide to each new value over this many ms instead of stepping. The rest bar is the one thing that moves during rest. */
  animateMs?: number;
  /** Changing this jumps straight to `progress`, e.g. a new rest starting at zero rather than sweeping back from full. */
  resetKey?: string | number;
};

export function ProgressBar({ progress, color = 'text', height = 4, accessibilityLabel, animateMs, resetKey }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const [track, setTrack] = useState(0);
  const fill = useSharedValue(clamped);
  const lastReset = useRef(resetKey);
  useEffect(() => {
    const reset = lastReset.current !== resetKey;
    lastReset.current = resetKey;
    fill.set(!animateMs || reset || theme.reduceMotion ? clamped : withTiming(clamped, { duration: animateMs, easing: Easing.linear }));
  }, [clamped, animateMs, resetKey, theme.reduceMotion, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: fill.get() * track }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      onLayout={(e) => setTrack(e.nativeEvent.layout.width)}
      style={{ height, borderRadius: height / 2, backgroundColor: theme.colors.bgSunken, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: theme.colors[color] }, fillStyle]} />
    </View>
  );
}
