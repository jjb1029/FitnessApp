import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useTheme } from '../theme';
import type { ColorName } from '../tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorName;
  /** Raw colour override when a token does not apply (e.g. text on accent). */
  rawColor?: string;
};

export function Icon({ name, size, color = 'text', rawColor }: IconProps) {
  const theme = useTheme();
  return <Ionicons name={name} size={size ?? theme.sizes.iconMd} color={rawColor ?? theme.colors[color]} />;
}
