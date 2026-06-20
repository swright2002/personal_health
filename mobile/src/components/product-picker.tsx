// Product picker: shows the engine's suggested real product for an ingredient
// plus alternatives (with diet/allergen + compliance), and lets you override by
// name search or by entering a barcode (with a UPC-validation verdict).
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Severity, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  chooseProduct,
  lookupBarcode,
  searchProducts,
  type ProductCandidate,
} from '@/lib/product-engine';

const DIET_LABEL: Record<number, string> = { 3: 'Vegan', 2: 'Vegetarian', 1: 'Pescetarian', 0: 'Contains animal' };
function dietBadge(c: ProductCandidate): { label: string; color: string } {
  if (c.diet_level == null) return { label: 'Diet unknown', color: Brand.deep };
  const base = DIET_LABEL[c.diet_level] ?? '—';
  const soft = c.diet_status === 'maybe' || c.diet_status === 'unknown';
  // Only a confident Vegan reads as "safe" green for this household; vegetarian
  // (still not vegan) and softer statuses stay neutral — the per-household
  // compliance badge is the real safety signal.
  return { label: soft ? `${base}?` : base, color: c.diet_level === 3 && !soft ? Severity.good : Brand.deep };
}
function complianceBadge(c: ProductCandidate): { label: string; color: string } {
  const hc = c.compliance?.householdClass;
  if (hc === 0) return { label: '✓ OK for both', color: Severity.good };
  if (hc === 1) return { label: '⚠ Unverified', color: Brand.deep };
  return { label: '✗ Not for everyone', color: Severity.watch };
}

export function ProductPicker({
  ingredient,
  householdId,
  onClose,
  onChosen,
}: {
  ingredient: { id: string; label: string; category: string | null };
  householdId: string;
  onClose: () => void;
  onChosen: () => void;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState(ingredient.label);
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<ProductCandidate[]>([]);
  const [autoIdx, setAutoIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function runSearch(q: string) {
    setLoading(true);
    setNote(null);
    const res = await searchProducts(q, ingredient.category);
    setCandidates(res.candidates ?? []);
    setAutoIdx(res.auto_suggest_index);
    setLoading(false);
    if (!res.candidates?.length) setNote(res.error?.message ?? 'No products found');
  }
  async function runBarcode() {
    if (!barcode.trim()) return;
    setLoading(true);
    setNote(null);
    const res = await lookupBarcode(barcode.trim());
    setCandidates(res.candidates ?? []);
    setAutoIdx(res.auto_suggest_index);
    setLoading(false);
    if (!res.candidates?.length) setNote(res.error?.message ?? 'No product for that barcode');
  }

  useEffect(() => {
    runSearch(ingredient.label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function use(c: ProductCandidate) {
    setSaving(true);
    const { error } = await chooseProduct({ householdId, ingredientId: ingredient.id, candidate: c });
    setSaving(false);
    if (error) setNote(error);
    else onChosen();
  }

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]}>
      <View style={{ flex: 1 }}>
        <View style={styles.bar}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            PRODUCT · {ingredient.label.toUpperCase()}
          </ThemedText>
          <Pressable onPress={onClose} hitSlop={8}>
            <ThemedText type="smallBold" style={{ color: Brand.accent }}>Done</ThemedText>
          </Pressable>
        </View>

        <View style={styles.head}>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, { borderColor: Brand.hairline, color: theme.text, backgroundColor: theme.backgroundElement }]}
              placeholder="Search by name"
              placeholderTextColor={theme.textSecondary}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => runSearch(query)}
              returnKeyType="search"
              autoCapitalize="none"
            />
            <Pressable onPress={() => runSearch(query)} style={[styles.go, { backgroundColor: Brand.accent }]}>
              <ThemedText type="smallBold" style={{ color: '#fff' }}>Search</ThemedText>
            </Pressable>
          </View>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, { borderColor: Brand.hairline, color: theme.text, backgroundColor: theme.backgroundElement }]}
              placeholder="Or enter a barcode (UPC/EAN)"
              placeholderTextColor={theme.textSecondary}
              value={barcode}
              onChangeText={setBarcode}
              onSubmitEditing={runBarcode}
              keyboardType="number-pad"
              returnKeyType="search"
            />
            <Pressable onPress={runBarcode} style={[styles.go, { backgroundColor: Brand.deep }]}>
              <ThemedText type="smallBold" style={{ color: '#fff' }}>Scan</ThemedText>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={Brand.accent} /></View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {note ? (
              <ThemedText type="small" style={{ color: Severity.watch, textAlign: 'center' }}>{note}</ThemedText>
            ) : null}
            {candidates.map((c, i) => {
              const diet = dietBadge(c);
              const comp = complianceBadge(c);
              const bv = c.barcode_validation;
              return (
                <View key={`${c.source_ref}-${i}`} style={[styles.card, { backgroundColor: theme.backgroundElement }, i === autoIdx && { borderColor: Brand.accent, borderWidth: 1.5 }]}>
                  <View style={styles.cardTop}>
                    <ThemedText type="smallBold" style={styles.src}>{c.analysis_source.toUpperCase()}</ThemedText>
                    {i === autoIdx ? (
                      <ThemedText type="smallBold" style={[styles.suggest, { color: Brand.accent, borderColor: Brand.accent }]}>Suggested</ThemedText>
                    ) : null}
                  </View>
                  <ThemedText style={styles.name}>{c.name}</ThemedText>
                  {c.brand ? <ThemedText type="small" themeColor="textSecondary">{c.brand}</ThemedText> : null}
                  <ThemedText type="small" themeColor="textSecondary">
                    {c.nutrition.kcal ?? '—'} kcal / {c.serving_size}{c.serving_unit}
                    {c.nutrition.protein != null ? `  ·  ${c.nutrition.protein}g protein` : ''}
                  </ThemedText>
                  <View style={styles.badges}>
                    <ThemedText type="smallBold" style={[styles.badge, { color: diet.color, borderColor: diet.color }]}>{diet.label}</ThemedText>
                    <ThemedText type="smallBold" style={[styles.badge, { color: comp.color, borderColor: comp.color }]}>{comp.label}</ThemedText>
                    {c.allergens.length ? (
                      <ThemedText type="smallBold" style={[styles.badge, { color: Severity.watch, borderColor: Severity.watch }]}>
                        {c.allergens.join(', ')}
                      </ThemedText>
                    ) : null}
                    {c.allergen_traces.length ? (
                      <ThemedText type="smallBold" style={[styles.badge, { color: Severity.watch, borderColor: Severity.watch }]}>
                        traces: {c.allergen_traces.join(', ')}
                      </ThemedText>
                    ) : null}
                  </View>
                  {bv && !bv.ok ? (
                    <ThemedText type="small" style={{ color: Severity.watch }}>
                      ⚠ Barcode check: {bv.flags.join(', ') || bv.class} (confidence {bv.confidence})
                    </ThemedText>
                  ) : null}
                  <Pressable disabled={saving} onPress={() => use(c)} style={[styles.use, { backgroundColor: Brand.accent, opacity: saving ? 0.5 : 1 }]}>
                    <ThemedText type="smallBold" style={{ color: '#fff' }}>Use this product</ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.one },
  head: { paddingHorizontal: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.two },
  searchRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderRadius: Radius.control, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 15 },
  go: { borderRadius: Radius.control, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  center: { padding: Spacing.six, alignItems: 'center' },
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.three },
  card: { borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.one },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  src: { textTransform: 'uppercase', letterSpacing: 0.6, color: Brand.deep, fontSize: 11 },
  suggest: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: 1, fontSize: 11 },
  name: { fontSize: 15, fontWeight: '700' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, marginTop: Spacing.one },
  badge: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: 1, fontSize: 11 },
  use: { borderRadius: Radius.pill, paddingVertical: Spacing.two, alignItems: 'center', marginTop: Spacing.two },
});
