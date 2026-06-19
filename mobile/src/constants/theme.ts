/**
 * Design tokens for Harbor — "Look A · Coastal" from the design handoff.
 * Source values are oklch in design/HANDOFF.md; converted to sRGB hex here
 * because React Native's style engine does not parse oklch().
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#273239', // ink
    background: '#f6fbfd', // app bg (off-white)
    backgroundElement: '#ffffff', // cards
    backgroundSelected: '#d8f5f5', // accent tint
    textSecondary: '#7a8185', // muted
  },
  dark: {
    text: '#ffffff',
    background: '#0d1417',
    backgroundElement: '#161f23',
    backgroundSelected: '#1f2c30',
    textSecondary: '#9aa3a8',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Coastal brand palette (theme accent = the primary user's color). */
export const Brand = {
  accent: '#429c9c',
  deep: '#0b5b62',
  tint: '#d8f5f5',
  soft: '#edfafa',
  hairline: '#e4e9eb',
  barTrack: '#e7ecee',
} as const;

/** Per-member colors. The primary user uses the theme accent; Jacq is fixed coral. */
export const Members = {
  you: { color: '#429c9c', deep: '#0b5b62', tint: '#d8f5f5' },
  jacq: { color: '#cf6963', deep: '#8e3f36', tint: '#ffe1da' },
} as const;

/** Nutritionist finding severities. */
export const Severity = {
  good: '#3b834e',
  amber: '#c48225',
  watch: '#c74c3d',
} as const;

export const Radius = {
  card: 18,
  control: 12,
  pill: 999,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
