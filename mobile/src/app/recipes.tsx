import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Severity, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { addRecipeToPlan } from '@/lib/plan';
import { formatDay, usePlanDate } from '@/lib/plan-date';
import { useRecipes, type LibraryRecipe, type RecipeSlot } from '@/hooks/use-recipes';
import { ProductPicker } from '@/components/product-picker';

const SLOTS: RecipeSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const num = (x: number | null) => (x == null ? null : Math.round(Number(x)));

export default function RecipesScreen() {
  const theme = useTheme();
  const { data, loading, error } = useRecipes();
  const [query, setQuery] = useState('');
  const [diet, setDiet] = useState<'all' | 'vegan'>('all');
  const [slot, setSlot] = useState<'all' | RecipeSlot>('all');
  const [open, setOpen] = useState<LibraryRecipe | null>(null);
  const { member } = useAuth();
  const [members, setMembers] = useState<{ id: string; name: string; short: string }[]>([]);
  useEffect(() => {
    supabase.from('member').select('id,name,short').then(({ data }) => setMembers(data ?? []));
  }, []);

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
            <RecipeCard key={r.id} r={r} background={theme.backgroundElement} onPress={() => setOpen(r)} />
          ))}
          {filtered.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              No recipes match.
            </ThemedText>
          ) : null}
        </ScrollView>
      )}

      <RecipeDetailModal
        recipe={open}
        library={data ?? []}
        members={members}
        youId={member?.id ?? null}
        householdId={member?.household_id ?? null}
        onOpen={setOpen}
        onClose={() => setOpen(null)}
      />
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

function statLine(r: LibraryRecipe): string {
  const parts: string[] = [];
  const kcal = num(r.kcal), protein = num(r.protein), fiber = num(r.fiber);
  if (kcal != null) parts.push(`${kcal} kcal`);
  if (protein != null) parts.push(`${protein}g protein`);
  if (fiber != null) parts.push(`${fiber}g fiber`);
  if (parts.length === 0 && r.prep_time) parts.push(r.prep_time);
  parts.push(`serves ${r.servings}`);
  return parts.join('  ·  ');
}

function RecipeCard({ r, background, onPress }: { r: LibraryRecipe; background: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: background }]}>
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
        {statLine(r)}
      </ThemedText>
    </Pressable>
  );
}

// ── Detail view (modal) ─────────────────────────────────────────────────────

type PickIngredient = { id: string; label: string; category: string | null };
type DetailLine = { text: string; heading: boolean; component: LibraryRecipe | null; ingredient: PickIngredient | null };

function isHeading(t: string): boolean {
  const s = t.trim();
  if (!s) return false;
  if (s.endsWith(':')) return true;
  return /^[A-Z0-9 &'’-]{2,32}$/.test(s) && s === s.toUpperCase() && /[A-Z]/.test(s);
}

function matchComponent(text: string, library: LibraryRecipe[], currentId: string): LibraryRecipe | null {
  const t = text.toLowerCase();
  let best: LibraryRecipe | null = null;
  for (const r of library) {
    if (r.id === currentId) continue;
    const n = r.name.toLowerCase();
    if (n.length >= 7 && t.includes(n) && (!best || r.name.length > best.name.length)) best = r;
  }
  return best;
}

function RecipeDetailModal({
  recipe,
  library,
  members,
  youId,
  householdId,
  onOpen,
  onClose,
}: {
  recipe: LibraryRecipe | null;
  library: LibraryRecipe[];
  members: { id: string; name: string; short: string }[];
  youId: string | null;
  householdId: string | null;
  onOpen: (r: LibraryRecipe) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { date } = usePlanDate();
  const [lines, setLines] = useState<DetailLine[] | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [pick, setPick] = useState<PickIngredient | null>(null);

  useEffect(() => {
    if (!recipe) return;
    setLines(null);
    setAdded(null);
    let active = true;
    supabase
      .from('recipe_line')
      .select('raw_text,name,quantity,unit,position,ingredient(id,label,category)')
      .eq('recipe_id', recipe.id)
      .order('position')
      .then(({ data }) => {
        if (!active) return;
        const built = (data ?? []).map((l): DetailLine => {
          const ing: any = Array.isArray(l.ingredient) ? l.ingredient[0] : l.ingredient;
          const text =
            l.raw_text ??
            (ing?.label ? [l.quantity, l.unit, ing.label].filter(Boolean).join(' ') : l.name ?? '');
          const heading = isHeading(text);
          return {
            text,
            heading,
            component: heading ? null : matchComponent(text, library, recipe.id),
            ingredient: !heading && ing?.id ? { id: ing.id, label: ing.label, category: ing.category ?? null } : null,
          };
        });
        setLines(built);
      });
    return () => {
      active = false;
    };
  }, [recipe, library]);

  if (!recipe) return null;
  const r = recipe;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]}>
      <View style={styles.modalBar}>
          <Pressable onPress={onClose} hitSlop={8}>
            <ThemedText type="smallBold" style={{ color: Brand.accent }}>
              Done
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.detailScroll}>
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

          <ThemedText type="subtitle" style={styles.detailName}>
            {r.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {statLine(r)}
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

          {householdId && members.length ? (
            added ? (
              <ThemedText type="smallBold" style={[styles.addedMsg, { color: Severity.good }]}>
                Added to {added} day · {formatDay(date)} ✓
              </ThemedText>
            ) : (
              <View style={styles.addBlock}>
                <ThemedText type="small" themeColor="textSecondary">
                  Add to your plan · {formatDay(date)}
                </ThemedText>
                <View style={styles.addRow}>
                  {members.map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={async () => {
                        const { error } = await addRecipeToPlan({
                          householdId,
                          date,
                          memberId: m.id,
                          recipeId: r.id,
                          slot: r.slot,
                        });
                        if (!error) setAdded(m.id === youId ? 'your' : `${m.name}’s`);
                      }}
                      style={[styles.addBtn, { backgroundColor: Brand.accent }]}>
                      <ThemedText type="smallBold" style={{ color: '#fff' }}>
                        + Add to {m.id === youId ? 'your' : `${m.name}’s`} day
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )
          ) : null}

          <ThemedText type="smallBold" style={styles.ingHeading}>
            Ingredients
          </ThemedText>

          {lines == null ? (
            <ActivityIndicator color={Brand.accent} style={{ marginTop: Spacing.three }} />
          ) : (
            <View style={styles.ingList}>
              {lines.map((l, i) =>
                l.heading ? (
                  <ThemedText key={i} type="smallBold" style={styles.lineHeading}>
                    {l.text.replace(/:$/, '')}
                  </ThemedText>
                ) : l.component ? (
                  <Pressable key={i} onPress={() => onOpen(l.component!)}>
                    <ThemedText type="small" style={{ color: Brand.accent }}>
                      {l.text}  →
                    </ThemedText>
                  </Pressable>
                ) : l.ingredient ? (
                  <View key={i} style={styles.ingLineRow}>
                    <ThemedText type="small" themeColor="text" style={{ flex: 1 }}>
                      {l.text}
                    </ThemedText>
                    <Pressable onPress={() => setPick(l.ingredient!)} hitSlop={6}>
                      <ThemedText type="smallBold" style={{ color: Brand.accent }}>
                        Set product
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : (
                  <ThemedText key={i} type="small" themeColor="text">
                    {l.text}
                  </ThemedText>
                ),
              )}
            </View>
          )}
        </ScrollView>

        {pick && householdId ? (
          <ProductPicker
            ingredient={pick}
            householdId={householdId}
            onClose={() => setPick(null)}
            onChosen={() => setPick(null)}
          />
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
  modalBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  detailScroll: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.two },
  detailName: { marginTop: Spacing.one },
  addBlock: { marginTop: Spacing.three, gap: Spacing.two },
  addRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  addBtn: { borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  addedMsg: { marginTop: Spacing.three },
  ingHeading: { fontSize: 17, fontWeight: '800', marginTop: Spacing.four },
  ingList: { gap: Spacing.two, marginTop: Spacing.one },
  lineHeading: { textTransform: 'uppercase', letterSpacing: 0.5, color: Brand.deep, fontSize: 12, marginTop: Spacing.two },
  ingLineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
});
