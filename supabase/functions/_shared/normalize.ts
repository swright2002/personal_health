// Normalized product shape + nutrition helpers (spec §B3, §C).

export type Nutrition = {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sodium: number | null; // mg
};

export const EMPTY_NUTRITION: Nutrition = { kcal: null, protein: null, carbs: null, fat: null, fiber: null, sodium: null };

export type ProductCandidate = {
  barcode: string | null;
  name: string;
  brand: string;
  size: string | null;
  net_weight_g: number | null;
  serving_size: number;
  serving_unit: string;
  servings_per_container: number | null;
  nutrition: Nutrition; // per the stated serving
  nutrition_per_100g: Nutrition; // invariant; feeds future food/package clustering
  ingredients_text: string | null;
  diet_level: number | null;
  diet_status: 'confirmed' | 'derived' | 'maybe' | 'unknown' | null;
  allergens: string[];
  allergen_traces: string[];
  allergens_known?: boolean; // false/undefined → allergens not assessed (treat as unverified, not clean)
  gluten_free: boolean | null;
  form?: 'cooked' | 'canned' | 'dry' | 'raw' | null; // cooked/dry state, detected from the name
  analysis_source: string;
  source_url: string | null;
  source_ref: string | null;
  attribution: string | null;
  image_url: string | null;
  completeness: number | null;
  // raw OFF tags carried for the diet/allergen cascade (not returned to the client)
  _offAnalysisTags?: string[];
  _offAllergenTags?: string[];
  _offTracesTags?: string[];
};

export function round(n: number | null | undefined, dp = 1): number | null {
  if (n == null || !isFinite(n)) return null;
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

/** Scale a per-serving nutrition block to per-100g, given the serving mass in grams. */
export function per100From(n: Nutrition, servingGrams: number | null): Nutrition {
  if (!servingGrams || servingGrams <= 0) return { ...EMPTY_NUTRITION };
  const k = 100 / servingGrams;
  return {
    kcal: n.kcal == null ? null : round(n.kcal * k),
    protein: n.protein == null ? null : round(n.protein * k),
    carbs: n.carbs == null ? null : round(n.carbs * k),
    fat: n.fat == null ? null : round(n.fat * k),
    fiber: n.fiber == null ? null : round(n.fiber * k),
    sodium: n.sodium == null ? null : round(n.sodium * k),
  };
}

/** Strip the private fields before returning a candidate to the client. */
export function publicCandidate(c: ProductCandidate): ProductCandidate {
  const { _offAnalysisTags, _offAllergenTags, _offTracesTags, ...rest } = c;
  return rest as ProductCandidate;
}

/** Completeness score for ranking (spec §F key 4): 0..9. */
export function completenessScore(c: ProductCandidate): number {
  let s = 0;
  if (c.ingredients_text && c.ingredients_text.trim()) s += 2;
  const n = c.nutrition;
  if (n.kcal != null && n.protein != null && n.carbs != null && n.fat != null) s += 2;
  if (n.fiber != null) s += 1;
  if (n.sodium != null) s += 1;
  if (c.serving_size && c.serving_unit) s += 1;
  if (c.barcode) s += 1;
  return s;
}
