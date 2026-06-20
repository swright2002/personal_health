import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Severity, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRecipes, type LibraryRecipe, type RecipeSlot } from '@/hooks/use-recipes';

const SLOTS: RecipeSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const num = (x: number | null) => (x == null ? null : Math.round(Number(x)));

export default function RecipesScreen() {
  const theme = useTheme();
  const { data, loading, error } = useRecipes();
  const [query, setQuery] = useState('');
  const [diet, setDiet] = useState<'all' | 'vegan'>('all');
  const [slot, setSlot] = useState<'all' | RecipeSlot>('all');

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.filter((r) => {
      if (diet === 'vegan' && !r.vegan) return false;
      if (slot !== 'all' && r.slot !== slot) return false;
      if (q && !`${r.name} ${r.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, query, diet, slot]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Recipes</ThemedText>

        <TextInput
          style={[styles.search, { borderColor: Brand.hairline, color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Search recipes & tags"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          value={query}
          onChangeText={setQuery}
        />

        <View style={styles.chipRow}>
          <Chip label="All" active={diet === 'all'} onPress={() => setDiet('all')} />
          <Chip label="Vegan" active={diet === 'vegan'} accent={Severity.good} onPress={() => setDiet('vegan')} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="Any" active={slot === 'all'} onPress={() => setSlot('all')} />
          {SLOTS.map((s) => (
            <Chip key={s} label={s} active={slot === s} onPress={() => setSlot(s)} />
          ))}
        </ScrollView>

        <ThemedText type="small" themeColor="textSecondary" style={styles.count}>
          {loading
            ? 'Loading…'
            : `${filtered.length}${data && filtered.length !== data.length ? ` of ${data.length}` : ''} recipe${filtered.length === 1 ? '' : 's'}`}
        </ThemedText>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Brand.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText type="small" style={{ color: Severity.watch }}>
            {error}
          </ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.map((r) => (
            <RecipeCard key={r.id} r={r} background={theme.backgroundElement} />
          ))}
          {filtered.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              No recipes match.
            </ThemedText>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Chip({ label, active, accent = Brand.accent, onPress }: { label: string; active: boolean; accent?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: Brand.hairline }, active && { backgroundColor: accent, borderColor: accent }]}>
      <ThemedText type="smallBold" style={{ color: active ? '#fff' : Brand.deep }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function RecipeCard({ r, background }: { r: LibraryRecipe; background: string }) {
  const kcal = num(r.kcal);
  const protein = num(r.protein);
  const fiber = num(r.fiber);
  const stats: string[] = [];
  if (kcal != null) stats.push(`${kcal} kcal`);
  if (protein != null) stats.push(`${protein}g protein`);
  if (fiber != null) stats.push(`${fiber}g fiber`);
  if (stats.length === 0 && r.prep_time) stats.push(r.prep_time);
  stats.push(`serves ${r.servings}`);

  return (
    <View style={[styles.card, { backgroundColor: background }]}>
      <View style={styles.cardTop}>
        <ThemedText type="smallBold" style={styles.slot}>
          {r.slot.toUpperCase()}
        </ThemedText>
        {r.vegan ? (
          <ThemedText type="smallBold" style={[styles.veganBadge, { color: Severity.good, borderColor: Severity.good }]}>
            Vegan
          </ThemedText>
        ) : null}
      </View>

      <ThemedText style={styles.name}>{r.name}</ThemedText>

      {r.tags.length ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {r.tags.slice(0, 3).join(' · ')}
        </ThemedText>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary" style={styles.stats}>
        {stats.join('  ·  ')}
      </ThemedText>

      {r.source_url ? (
        <Pressable onPress={() => Linking.openURL(r.source_url!)} hitSlop={6}>
          <ThemedText type="small" style={{ color: Brand.accent }}>
            {r.source_attribution ?? 'Source'} ↗
          </ThemedText>
        </Pressable>
      ) : r.source_attribution ? (
        <ThemedText type="small" themeColor="textSecondary">
          {r.source_attribution}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, gap: Spacing.two },
  search: {
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
    marginTop: Spacing.one,
  },
  chipRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center', paddingVertical: Spacing.half },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: 6 },
  count: { marginTop: Spacing.one, marginBottom: Spacing.two },
  center: { padding: Spacing.six, alignItems: 'center' },
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.three },
  card: { borderRadius: Radius.card, padding: Spacing.four, gap: Spacing.two },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slot: { textTransform: 'uppercase', letterSpacing: 0.6, color: Brand.deep, fontSize: 12 },
  veganBadge: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: 1, fontSize: 11 },
  name: { fontSize: 16, fontWeight: '700' },
  stats: { marginTop: Spacing.half },
});
