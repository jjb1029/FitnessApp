import { Platform, type TextStyle } from 'react-native';

// Design tokens (docs/02 §4). One accent, colour for meaning only.

export const lightColors = {
  bg: '#FFFFFF',
  bgElevated: '#F5F6F7',
  bgSunken: '#EDEEF0',
  border: '#E2E4E8',
  text: '#111318',
  textSecondary: '#5C6370',
  textTertiary: '#8B919C',
  textOnAccent: '#FFFFFF',
  accent: '#2F6BFF',
  accentPressed: '#2559D6',
  accentSubtle: '#E9F0FF',
  success: '#1F9D55',
  successSubtle: '#E6F5EC',
  warning: '#C98A00',
  warningSubtle: '#FBF3DF',
  danger: '#D3393C',
  dangerSubtle: '#FBE7E7',
  overlay: 'rgba(17, 19, 24, 0.45)',
  skeleton: '#E6E8EB',
} as const;

export const darkColors: Colors = {
  bg: '#0B0C0E',
  bgElevated: '#16181C',
  bgSunken: '#0F1114',
  border: '#24272D',
  text: '#F2F3F5',
  textSecondary: '#A0A6B1',
  textTertiary: '#6B717C',
  textOnAccent: '#FFFFFF',
  accent: '#5B8CFF',
  accentPressed: '#4A78E6',
  accentSubtle: '#17233F',
  success: '#3DBB74',
  successSubtle: '#12271B',
  warning: '#E5A800',
  warningSubtle: '#2B2410',
  danger: '#F0555A',
  dangerSubtle: '#2E1516',
  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#1F2226',
};

export type Colors = { [K in keyof typeof lightColors]: string };
export type ColorName = keyof Colors;

/** 4 pt grid. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 48,
} as const;
export type SpacingName = keyof typeof spacing;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const sizes = {
  touchMin: 44,
  controlMd: 48,
  controlLg: 56,
  screenPaddingH: 20,
  cardPadding: 16,
  contentMaxWidth: 600,
  iconSm: 18,
  iconMd: 22,
  iconLg: 28,
} as const;

const monoFamily = Platform.select({ ios: 'ui-monospace', android: 'monospace', default: 'monospace' });

/** Type scale. System font; tabular numerals for anything numeric. */
export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '600' },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '600' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: 0.4 },
  mono: { fontSize: 17, lineHeight: 22, fontWeight: '500', fontVariant: ['tabular-nums'] },
  monoLarge: { fontSize: 28, lineHeight: 34, fontWeight: '600', fontVariant: ['tabular-nums'] },
} as const satisfies Record<string, TextStyle>;
export type TypographyName = keyof typeof typography;

export const monospace = monoFamily;

export const motion = {
  fast: 150,
  normal: 200,
  slow: 250,
} as const;
