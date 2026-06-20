import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Brand, Members, Radius, Severity, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlanDay, type PlanMeal, type PlanTarget } from '@/hooks/use-plan-day';
import { useAuth } from '@/lib/auth';

// The seeded demo day. A week selector lands later in M2.
const PLAN_DATE = '2026-06-18';

const TARGET_LABEL: Record<PlanTarget['kind'], string> = {
  run_day: 'Run day',
  rest_day: 'Rest day',
  maintenance: 'Vegan maintenance',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WEEKDAYS[dt.getDay()]}, ${MONTHS[m - 1]} ${d}`;
}

export default function PlanScreen() {
  const theme = useTheme();
  const { member } = useAuth();
  const { data, loading, error } = usePlanDay(PLAN_DATE);
  const [personId, setPersonId] = useState<string | null>(null);

  // Default to viewing yourself once the household loads.
  useEffect(() => {
    if (data && !personId) setPersonId(member?.id ?? data.members[0]?.id ?? null);
  }, [data, member, personId]);

  const plan = personId ? data?.byMember[personId] : undefined;
  const personColor = useMemo(() => {
    const m = data?.members.find((x) => x.id === personId);
    return m?.accentColor ?? Brand.accent;
  }, [data, personId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.kicker}>
          {formatDate(PLAN_DATE).toUpperCase()}
        </ThemedText>
        <ThemedText type="subtitle">Plan</ThemedText>

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
                />
              ))
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
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

function MealCard({ meal, color, background }: { meal: PlanMeal; color: string; background: string }) {
  return (
    <View style={[styles.card, styles.mealCard, { backgroundColor: background }]}>
      <View style={styles.mealHeadRow}>
        <ThemedText type="smallBold" style={styles.mealLabel}>
          {meal.label}
        </ThemedText>
        {meal.shared ? (
          <ThemedText type="smallBold" style={[styles.tag, { color, borderColor: color }]}>
            Together
          </ThemedText>
        ) : null}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.three },
  kicker: { letterSpacing: 1, marginTop: Spacing.two },
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
});
