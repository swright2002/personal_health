// Auto-suggest ranking + per-member compliance (spec §F).
import { completenessScore, ProductCandidate } from './normalize.ts';
import { formMatchScore } from './forms.ts';

export type Member = { id: string; diet_level: number; allergies: string[]; restrictions: string[] };
export type Tag = 'allowed' | 'unverified' | 'disallowed';

const CONFIDENT = (s: string | null) => s === 'confirmed' || s === 'derived';

/**
 * Compliance of product P for member M across allergy, restriction, and diet
 * axes. A KNOWN violation on any axis is a definitive 'disallowed'; otherwise we
 * accumulate the most severe of the soft (unverified) signals — so an unverified
 * restriction never masks a known diet violation, and fail-closed everywhere.
 */
export function complianceFor(p: ProductCandidate, m: Member): Tag {
  let worst: Tag = 'allowed';
  const worsen = (t: Tag) => {
    if (t === 'disallowed') worst = 'disallowed';
    else if (t === 'unverified' && worst !== 'disallowed') worst = 'unverified';
  };

  // allergies — a declared allergen present (or a trace) is a definitive block
  for (const a of m.allergies) {
    if (p.allergens.includes(a) || p.allergen_traces.includes(a)) return 'disallowed';
  }
  // ...but if we never assessed allergens, an empty list isn't proof of safety
  if (m.allergies.length && !p.allergens_known) worsen('unverified');

  // restrictions
  if (m.restrictions.includes('gluten_free')) {
    if (p.gluten_free === false) return 'disallowed';
    if (p.gluten_free == null) worsen('unverified');
  }

  // diet axis (omnivore L0 needs no property; higher diets need a confident pass)
  if (m.diet_level > 0) {
    if (p.diet_level != null && CONFIDENT(p.diet_status)) {
      if (p.diet_level < m.diet_level) return 'disallowed';
    } else worsen('unverified');
  }
  return worst;
}

const CLASS = { compliant_for_all: 0, unverified_for_some: 1, disallowed_for_some: 2 } as const;

export function householdClass(p: ProductCandidate, members: Member[]): number {
  if (!members.length) return CLASS.unverified_for_some; // no one to verify against → never "compliant for all"
  let worst = 0; // 0 allowed-for-all
  for (const m of members) {
    const t = complianceFor(p, m);
    if (t === 'disallowed') return CLASS.disallowed_for_some;
    if (t === 'unverified') worst = Math.max(worst, CLASS.unverified_for_some);
  }
  return worst;
}

const DIET_CONF: Record<string, number> = { confirmed: 0, derived: 1, maybe: 2, unknown: 3 };

const WHOLE_FOOD_CATS = new Set(['produce', 'grain', 'legume', 'meat', 'fish', 'dairy', 'oil', 'spice', 'nut']);

function sourceRank(source: string, category: string | null, brandIntent: boolean): number {
  const wholeFood = !brandIntent && category != null && WHOLE_FOOD_CATS.has(category);
  if (wholeFood) {
    return { fdc_foundation: 0, fdc_sr_legacy: 1, off: 2, fdc: 3, fdc_branded: 4, manufacturer: 5, llm: 6 }[source] ?? 7;
  }
  return { off: 0, fdc_branded: 1, manufacturer: 2, fdc_foundation: 3, fdc_sr_legacy: 3, fdc: 4, llm: 5 }[source] ?? 6;
}

// Words that describe prep/form/quality, not the food's identity — ignored when
// judging how well a product NAME matches an ingredient (and not counted as drift).
const NON_IDENTITY = new Set([
  'cooked', 'raw', 'dry', 'dried', 'uncooked', 'fresh', 'boiled', 'roasted', 'steamed', 'canned', 'drained',
  'chopped', 'sliced', 'smashed', 'cubed', 'crumbled', 'frozen', 'organic', 'whole', 'ground', 'mature',
  'with', 'without', 'in', 'and', 'or', 'salt', 'water', 'peel', 'seeds', 'seed', 'plain', 'unsweetened',
]);
const idTokens = (s: string) =>
  s.toLowerCase().replace(/[,()]/g, ' ').split(/\s+/).map((w) => w.replace(/s$/, '')).filter((w) => w.length > 2 && !NON_IDENTITY.has(w));

/** 0 = clean identity match; higher = missing tokens or extra "drift" tokens. */
function matchStrength(name: string, label: string): number {
  const want = idTokens(label);
  const have = idTokens(name);
  if (!want.length) return 3;
  const allPresent = want.every((w) => have.some((t) => t.includes(w) || w.includes(t)));
  if (!allPresent) return want.some((w) => have.some((t) => t.includes(w) || w.includes(t))) ? 4 : 6;
  const extra = have.filter((t) => !want.some((w) => t.includes(w) || w.includes(t))).length;
  return Math.min(3, extra); // category drift: "Pickles, cucumber" (extra "pickle") loses to "Cucumber"
}

export type RankedCandidate = ProductCandidate & {
  compliance: { householdClass: number; perMember: Record<string, Tag> };
};

export function rankCandidates(
  candidates: ProductCandidate[],
  opts: {
    label: string;
    category: string | null;
    brandIntent: boolean;
    members: Member[];
    ingredientBasis?: 'wet' | 'dry' | 'unknown';
  },
): { ranked: RankedCandidate[]; auto_suggest_index: number | null } {
  const ingBasis = opts.ingredientBasis ?? 'unknown';
  const scored = candidates.map((c) => {
    const perMember: Record<string, Tag> = {};
    for (const m of opts.members) perMember[m.id] = complianceFor(c, m);
    const hc = householdClass(c, opts.members);
    const keys = [
      hc,
      c.nutrition.kcal == null ? 1 : 0, // a product with no calories can't fill a nutrition slot
      DIET_CONF[c.diet_status ?? 'unknown'] ?? 3,
      formMatchScore(ingBasis, c.form ?? null), // cooked-for-cooked beats dry-for-cooked (nutrition basis)
      matchStrength(c.name, opts.label), // relevance: a clean name match beats a tangential one from a preferred source
      sourceRank(c.analysis_source, opts.category, opts.brandIntent),
      -completenessScore(c),
      c.barcode ?? 'zzz', // deterministic tie-break
    ];
    return { c: { ...c, compliance: { householdClass: hc, perMember } } as RankedCandidate, keys };
  });

  scored.sort((a, b) => {
    for (let i = 0; i < a.keys.length; i++) {
      const x = a.keys[i], y = b.keys[i];
      if (x < y) return -1;
      if (x > y) return 1;
    }
    return 0;
  });

  const ranked = scored.map((s) => s.c);
  // Auto-select rank-1 only when it's compliant for all (never auto-pick a
  // known-bad product, and never when we have no members to verify against).
  const auto_suggest_index =
    opts.members.length && ranked.length && ranked[0].compliance.householdClass === 0 ? 0 : null;
  return { ranked, auto_suggest_index };
}
