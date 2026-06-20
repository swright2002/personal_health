import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Brand, Members, Radius, Severity, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlanDay, type PlanMeal, type PlanTarget } from '@/hooks/use-plan-day';
import { useRecipes, type LibraryRecipe, type RecipeSlot } from '@/hooks/use-recipes';
import { useAuth } from '@/lib/auth';
import { removeFromPlan, swapMeal } from '@/lib/plan';
import { PLAN_WEEK, dayNumber, formatDay, isRunDay, usePlanDate, weekdayShort } from '@/lib/plan-date';

const TARGET_LABEL: Record<PlanTarget['kind'], string> = {
  run_day: 'Run day',
  rest_day: 'Rest day',
  maintenance: 'Vegan maintenance',
};

const SLOTS: RecipeSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function PlanScreen() {
  const theme = useTheme();
  const { member } = useAuth();
  const { date, setDate } = usePlanDate();
  const { data, loading, error, refetch } = usePlanDay(date);
  const [wantRecipes, setWantRecipes] = useState(false);
  const { data: recipes } = useRecipes({ enabled: wantRecipes });
  const [personId, setPersonId] = useState<string | null>(null);
  const [swapping, setSwapping] = useState<PlanMeal | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Refresh when the tab regains focus (e.g. after adding a recipe in Recipes).
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // Default to viewing yourself once the household loads.
  useEffect(() => {
    if (data && !personId) setPersonId(member?.id ?? data.members[0]?.id ?? null);
  }, [data, member, personId]);

  const plan = personId ? data?.byMember[personId] : undefined;
  const personColor = useMemo(() => {
    const m = data?.members.find((x) => x.id === personId);
    return m?.accentColor ?? Brand.accent;
  }, [data, personId]);
  const viewerDiet = useMemo(
    () => data?.members.find((x) => x.id === personId)?.diet ?? null,
    [data, personId],
  );

  async function handleSwapPick(recipeId: string) {
    if (!swapping || !personId) return;
    if (recipeId === swapping.recipeId) {
      setSwapping(null); // re-picked the current recipe — nothing to change
      return;
    }
    setSwapError(null);
    const { error } = await swapMeal({ momentId: swapping.momentId, memberId: personId, recipeId });
    if (error) {
      setSwapError(error); // keep the sheet open so the failure is visible
      return;
    }
    setSwapping(null);
    refetch();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.kicker}>
          {formatDay(date).toUpperCase()}
        </ThemedText>
        <ThemedText type="subtitle">Plan</ThemedText>

        <WeekStrip selected={date} onSelect={setDate} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.accent} />
          </View>
        ) : error ? (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={{ color: Severity.watch }}>
              Couldn’t load your plan
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {error}
            </ThemedText>
          </View>
        ) : data && plan ? (
          <>
            <PersonSwitcher
              members={[...data.members].sort((a, b) =>
                a.id === member?.id ? -1 : b.id === member?.id ? 1 : 0,
              )}
              youId={member?.id ?? null}
              selectedId={personId}
              onSelect={setPersonId}
            />

            <TargetsCard plan={plan} color={personColor} background={theme.backgroundElement} />

            <View style={styles.dayHeader}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                The day
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {plan.meals.length} {plan.meals.length === 1 ? 'meal' : 'meals'}
              </ThemedText>
            </View>

            {plan.meals.length === 0 ? (
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Nothing planned for this day yet.
                </ThemedText>
              </View>
            ) : (
              plan.meals.map((meal) => (
                <MealCard
                  key={meal.momentId}
                  meal={meal}
                  color={personColor}
                  background={theme.backgroundElement}
                  onSwap={() => {
                    setSwapError(null);
                    setWantRecipes(true);
                    setSwapping(meal);
                  }}
                  onRemove={() => {
                    if (personId) removeFromPlan(meal.momentId, personId).then(refetch);
                  }}
                />
              ))
            )}
          </>
        ) : null}
      </ScrollView>

      {swapping ? (
        <SwapSheet
          key={swapping.momentId}
          meal={swapping}
          recipes={recipes}
          viewerDiet={viewerDiet}
          error={swapError}
          onPick={handleSwapPick}
          onClose={() => {
            setSwapError(null);
            setSwapping(null);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function WeekStrip({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  return (
    <View style={styles.weekStrip}>
      {PLAN_WEEK.map((d) => {
        const active = d === selected;
        return (
          <Pressable
            key={d}
            onPress={() => onSelect(d)}
            style={[
              styles.dayBtn,
              { borderColor: Brand.hairline },
              active && { backgroundColor: Brand.accent, borderColor: Brand.accent },
            ]}>
            <ThemedText type="small" style={{ color: active ? '#fff' : Brand.deep, fontSize: 11 }}>
              {weekdayShort(d)}
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: active ? '#fff' : Brand.deep, fontSize: 15 }}>
              {dayNumber(d)}
            </ThemedText>
            <ThemedText
              type="smallBold"
              style={{ color: active ? '#fff' : Brand.accent, fontSize: 8, opacity: isRunDay(d) ? 1 : 0 }}>
              RUN
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function PersonSwitcher({
  members,
  youId,
  selectedId,
  onSelect,
}: {
  members: { id: string; name: string; short: string }[];
  youId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.switcher}>
      {members.map((m) => {
        const active = m.id === selectedId;
        const label = m.id === youId ? 'You' : m.name;
        const accent = m.id === youId ? Brand.accent : Members.jacq.color;
        return (
          <Pressable
            key={m.id}
            onPress={() => onSelect(m.id)}
            style={[
              styles.pill,
              { borderColor: Brand.hairline },
              active && { backgroundColor: accent, borderColor: accent },
            ]}>
            <ThemedText type="smallBold" style={{ color: active ? '#fff' : Brand.deep }}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function TargetsCard({
  plan,
  color,
  background,
}: {
  plan: { totals: import('@/lib/nutrition').Nutrition; target: PlanTarget | null };
  color: string;
  background: string;
}) {
  const t = plan.target;
  return (
    <View style={[styles.card, { backgroundColor: background }]}>
      <View style={styles.cardHeadRow}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Targets
        </ThemedText>
        {t ? (
          <ThemedText
            type="smallBold"
            style={[styles.modeBadge, { color: Brand.deep, backgroundColor: Brand.tint }]}>
            {TARGET_LABEL[t.kind]}
          </ThemedText>
        ) : null}
      </View>

      {t ? (
        <View style={styles.bars}>
          <MacroBar label="Calories" planned={plan.totals.kcal} target={t.kcal} unit="" color={Brand.deep} />
          <MacroBar label="Protein" planned={plan.totals.protein} target={t.protein} unit="g" color={Brand.deep} />
          <MacroBar label="Carbs" planned={plan.totals.carbs} target={t.carbs} unit="g" color={Brand.deep} />
          <MacroBar label="Fat" planned={plan.totals.fat} target={t.fat} unit="g" color={Brand.deep} />
          <MacroBar label="Fiber" planned={plan.totals.fiber} target={t.fiber} unit="g" color={color} hero />
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No target set for this person.
        </ThemedText>
      )}
    </View>
  );
}

function MacroBar({
  label,
  planned,
  target,
  unit,
  color,
  hero,
}: {
  label: string;
  planned: number;
  target: number;
  unit: string;
  color: string;
  hero?: boolean;
}) {
  const pct = target > 0 ? Math.min(1, planned / target) : 0;
  const met = target > 0 && planned >= target;
  return (
    <View style={styles.barRow}>
      <View style={styles.barLabelRow}>
        <ThemedText type="small">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {planned}
          {unit} / {target}
          {unit}
          {hero && met ? '  · goal met' : ''}
        </ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: Brand.barTrack }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function MealCard({
  meal,
  color,
  background,
  onSwap,
  onRemove,
}: {
  meal: PlanMeal;
  color: string;
  background: string;
  onSwap: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={[styles.card, styles.mealCard, { backgroundColor: background }]}>
      <View style={styles.mealHeadRow}>
        <ThemedText type="smallBold" style={styles.mealLabel}>
          {meal.label}
        </ThemedText>
        <View style={styles.mealHeadRight}>
          {meal.shared ? (
            <ThemedText type="smallBold" style={[styles.tag, { color, borderColor: color }]}>
              Together
            </ThemedText>
          ) : null}
          <Pressable onPress={onSwap} hitSlop={8}>
            <ThemedText type="smallBold" style={styles.mealSwap}>
              Swap
            </ThemedText>
          </Pressable>
          <Pressable onPress={onRemove} hitSlop={8}>
            <ThemedText type="smallBold" style={styles.removeX}>
              ×
            </ThemedText>
          </Pressable>
        </View>
      </View>
      <View style={styles.mealBodyRow}>
        <ThemedText style={styles.mealName}>{meal.recipeName}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {meal.kcal} kcal
        </ThemedText>
      </View>
    </View>
  );
}

function Chip({
  label,
  active,
  accent = Brand.accent,
  onPress,
}: {
  label: string;
  active: boolean;
  accent?: string;
  onPress: () => void;
}) {
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

/** Full-screen recipe picker for replacing one planned meal. */
function SwapSheet({
  meal,
  recipes,
  viewerDiet,
  error,
  onPick,
  onClose,
}: {
  meal: PlanMeal;
  recipes: LibraryRecipe[] | null;
  viewerDiet: string | null;
  error: string | null;
  onPick: (recipeId: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [veganOnly, setVeganOnly] = useState((viewerDiet ?? '').toLowerCase() === 'vegan');
  const [slot, setSlot] = useState<'all' | RecipeSlot>(
    (SLOTS as string[]).includes(meal.slot) ? (meal.slot as RecipeSlot) : 'all',
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (recipes ?? []).filter((r) => {
      if (veganOnly && !r.vegan) return false;
      if (slot !== 'all' && r.slot !== slot) return false;
      if (q && !`${r.name} ${r.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [recipes, query, veganOnly, slot]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]}>
      <View style={{ flex: 1 }}>
        <View style={styles.modalBar}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            SWAP {meal.label.toUpperCase()}
          </ThemedText>
          <Pressable onPress={onClose} hitSlop={8}>
            <ThemedText type="smallBold" style={{ color: Brand.accent }}>
              Cancel
            </ThemedText>
          </Pressable>
        </View>

        {error ? (
          <ThemedText type="small" style={styles.swapError}>
            Couldn’t swap — {error}
          </ThemedText>
        ) : null}

        <View style={styles.swapHead}>
          <ThemedText type="small" themeColor="textSecondary">
            Replacing
          </ThemedText>
          <ThemedText style={styles.swapCurrent}>{meal.recipeName}</ThemedText>

          <TextInput
            style={[styles.search, { borderColor: Brand.hairline, color: theme.text, backgroundColor: theme.backgroundElement }]}
            placeholder="Search recipes & tags"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            value={query}
            onChangeText={setQuery}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Chip label="Any" active={slot === 'all'} onPress={() => setSlot('all')} />
            {SLOTS.map((s) => (
              <Chip key={s} label={s} active={slot === s} onPress={() => setSlot(s)} />
            ))}
            <Chip label="Vegan" active={veganOnly} accent={Severity.good} onPress={() => setVeganOnly((v) => !v)} />
          </ScrollView>
        </View>

        {recipes == null ? (
          <View style={styles.center}>
            <ActivityIndicator color={Brand.accent} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.swapList}>
            {filtered.map((r) => {
              const current = r.id === meal.recipeId;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => onPick(r.id)}
                  style={[styles.swapRow, { backgroundColor: theme.backgroundElement }, current && { borderColor: Brand.accent, borderWidth: 1 }]}>
                  <View style={styles.swapRowTop}>
                    <ThemedText type="smallBold" style={styles.slot}>
                      {r.slot.toUpperCase()}
                    </ThemedText>
                    {r.vegan ? (
                      <ThemedText type="smallBold" style={[styles.tag, { color: Severity.good, borderColor: Severity.good }]}>
                        Vegan
                      </ThemedText>
                    ) : null}
                  </View>
                  <ThemedText style={styles.swapName}>
                    {r.name}
                    {current ? '  · current' : ''}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {[r.kcal != null ? `${Math.round(r.kcal)} kcal` : null, `serves ${r.servings}`].filter(Boolean).join('  ·  ')}
                  </ThemedText>
                </Pressable>
              );
            })}
            {filtered.length === 0 ? (
              <View style={styles.center}>
                <ThemedText type="small" themeColor="textSecondary">
                  No recipes match these filters.
                </ThemedText>
                <Pressable
                  onPress={() => {
                    setSlot('all');
                    setVeganOnly(false);
                    setQuery('');
                  }}
                  hitSlop={8}>
                  <ThemedText type="smallBold" style={{ color: Brand.accent, marginTop: Spacing.two }}>
                    Show all recipes
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.three },
  kicker: { letterSpacing: 1, marginTop: Spacing.two },
  weekStrip: { flexDirection: 'row', gap: Spacing.one, marginTop: Spacing.three },
  dayBtn: { flex: 1, borderWidth: 1, borderRadius: Radius.control, paddingVertical: Spacing.two, alignItems: 'center', gap: 1 },
  center: { paddingVertical: Spacing.six, alignItems: 'center' },
  switcher: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  pill: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  modeBadge: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    fontSize: 12,
  },
  bars: { gap: Spacing.three },
  barRow: { gap: Spacing.one },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  mealCard: { gap: Spacing.two },
  mealHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealHeadRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  mealSwap: { color: Brand.accent, fontSize: 13 },
  removeX: { color: Brand.deep, fontSize: 18, lineHeight: 18 },
  mealLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: Brand.deep,
    fontSize: 12,
  },
  mealBodyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  mealName: { flex: 1, fontSize: 15, fontWeight: '700' },
  tag: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    fontSize: 11,
  },
  // Swap picker
  modalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  swapError: { color: Severity.watch, paddingHorizontal: Spacing.four, paddingTop: Spacing.one },
  swapHead: { paddingHorizontal: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.two },
  swapCurrent: { fontSize: 18, fontWeight: '800' },
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
  swapList: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.two },
  swapRow: { borderRadius: Radius.card, padding: Spacing.three, gap: 2 },
  swapRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  swapName: { fontSize: 15, fontWeight: '700' },
  slot: { textTransform: 'uppercase', letterSpacing: 0.6, color: Brand.deep, fontSize: 12 },
});
