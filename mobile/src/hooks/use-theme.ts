/**
 * Harbor ships the "Look A · Coastal" light theme only — the design handoff has
 * no dark variant — so we ignore the system color scheme and always render light.
 * (Revisit if/when a dark theme is actually designed.)
 */

import { Colors } from '@/constants/theme';

export function useTheme() {
  return Colors.light;
}
