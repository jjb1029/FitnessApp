import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '../theme';
import type { ColorName, TypographyName } from '../tokens';

export type TextProps = RNTextProps & {
  variant?: TypographyName;
  color?: ColorName;
  align?: TextStyle['textAlign'];
};

export function Text({ variant = 'body', color = 'text', align, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={1.3}
      {...rest}
      style={[theme.typography[variant], { color: theme.colors[color], textAlign: align }, style]}
    />
  );
}
