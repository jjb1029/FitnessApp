import { View } from 'react-native';

import { useTheme } from '../theme';
import type { ColorName } from '../tokens';

export type ProgressBarProps = {
  /** 0..1 */
  progress: number;
  /** Neutral by default: teal is reserved for bars Forma owns, e.g. rest (docs/16 §5). */
  color?: ColorName;
  height?: number;
  accessibilityLabel?: string;
};

export function ProgressBar({ progress, color = 'text', height = 4, accessibilityLabel }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ height, borderRadius: height / 2, backgroundColor: theme.colors.bgSunken, overflow: 'hidden' }}>
      <View style={{ width: `${clamped * 100}%`, height: '100%', backgroundColor: theme.colors[color] }} />
    </View>
  );
}
