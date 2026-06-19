import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Temporary screen for a module that isn't built out yet (M0 shell).
 * Replaced with the real UI as each milestone lands.
 */
export function ModulePlaceholder({
  title,
  subtitle,
  status = 'Coming soon',
}: {
  title: string;
  subtitle: string;
  status?: string;
}) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          {subtitle}
        </ThemedText>
        <ThemedText
          type="smallBold"
          style={[styles.badge, { color: Brand.deep, backgroundColor: Brand.tint }]}>
          {status}
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
});
