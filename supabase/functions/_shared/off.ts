// Open Food Facts client (spec §B4, §C). Barcode lookup with code-variant
// probing + full-text search, normalized to ProductCandidate.
import { EMPTY_NUTRITION, Nutrition, per100From, ProductCandidate, round } from './normalize.ts';
import { leftPad14, stripNonDigits } from './gtin.ts';
import { detectForm } from './forms.ts';

const UA = 'HarborMealPlanner/0.1 (spencerwright@gmail.com)';
const FIELDS = [
  'code', 'product_name', 'product_name_en', 'brands', 'quantity', 'product_quantity',
  'categories_tags', 'countries_tags', 'nutriments', 'serving_size', 'serving_quantity',
  'serving_quantity_unit', 'nutrition_data_per', 'ingredients_text', 'ingredients_text_en',
  'allergens_tags', 'traces_tags', 'ingredients_analysis_tags', 'completeness', 'image_front_url', 'lang',
].join(',');

async function offFetch(url: string, timeoutMs = 8000): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Probe the common code forms OFF may have stored a product under. */
export async function offByBarcode(barcode: string): Promise<ProductCandidate | null> {
  const raw = stripNonDigits(barcode);
  const variants = Array.from(new Set([raw, leftPad14(raw), raw.replace(/^0+/, ''), raw.length === 14 ? raw.slice(1) : raw]));
  for (const code of variants) {
    if (!code) continue;
    const j = await offFetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`);
    if (j && j.status === 1 && j.product) return normalizeOff(j.product);
  }
  return null;
}

export async function offSearch(query: string, limit = 20): Promise<ProductCandidate[]> {
  const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&langs=en&page_size=${limit}&fields=${FIELDS}`;
  const j = await offFetch(url);
  const hits: any[] = j?.hits ?? j?.products ?? [];
  return hits.map(normalizeOff).filter((c): c is ProductCandidate => c != null);
}

function num(nutriments: any, key: string): number | null {
  const v = nutriments?.[key];
  return typeof v === 'number' && isFinite(v) ? v : null;
}

const UNIT_TO_G: Record<string, number> = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };

/** Resolve the serving mass in grams (prefer OFF's pre-parsed value). */
function servingGrams(p: any): { grams: number | null; size: number; unit: string } {
  const sq = typeof p.serving_quantity === 'number' ? p.serving_quantity : parseFloat(p.serving_quantity);
  const su = (p.serving_quantity_unit || '').toLowerCase();
  if (isFinite(sq) && sq > 0) {
    if (UNIT_TO_G[su]) return { grams: sq * UNIT_TO_G[su], size: sq, unit: su };
    if (su === 'ml' || su === 'cl' || su === 'l') {
      const g = su === 'l' ? sq * 1000 : su === 'cl' ? sq * 10 : sq; // density ≈ 1
      return { grams: g, size: sq, unit: su };
    }
    return { grams: sq, size: sq, unit: su || 'g' }; // assume grams
  }
  // Parse the messy serving_size string: take the last metric (N unit) group.
  const s = String(p.serving_size || '');
  const matches = [...s.matchAll(/(\d+(?:\.\d+)?)\s*(g|ml|oz|cl|l|kg)\b/gi)];
  if (matches.length) {
    const m = matches[matches.length - 1];
    const n = parseFloat(m[1]);
    const u = m[2].toLowerCase();
    const grams = UNIT_TO_G[u] ? n * UNIT_TO_G[u] : u === 'l' ? n * 1000 : u === 'cl' ? n * 10 : n;
    return { grams, size: n, unit: u };
  }
  return { grams: null, size: 0, unit: '' };
}

export function normalizeOff(p: any): ProductCandidate | null {
  if (!p || !p.code) return null;
  const nutr = p.nutriments || {};
  const { grams, size, unit } = servingGrams(p);

  // per-100g (OFF sodium is in grams → ×1000 mg; salt fallback = salt/2.5)
  const sodium100 = num(nutr, 'sodium_100g') != null
    ? num(nutr, 'sodium_100g')! * 1000
    : num(nutr, 'salt_100g') != null ? (num(nutr, 'salt_100g')! / 2.5) * 1000 : null;
  const per100: Nutrition = {
    kcal: round(num(nutr, 'energy-kcal_100g')),
    protein: round(num(nutr, 'proteins_100g')),
    carbs: round(num(nutr, 'carbohydrates_100g')),
    fat: round(num(nutr, 'fat_100g')),
    fiber: round(num(nutr, 'fiber_100g')),
    sodium: round(sodium100),
  };

  // per-serving: prefer explicit _serving keys, else scale per-100g by serving grams.
  const sodiumS = num(nutr, 'sodium_serving') != null
    ? num(nutr, 'sodium_serving')! * 1000
    : num(nutr, 'salt_serving') != null ? (num(nutr, 'salt_serving')! / 2.5) * 1000 : null;
  const explicitServing: Nutrition = {
    kcal: round(num(nutr, 'energy-kcal_serving')),
    protein: round(num(nutr, 'proteins_serving')),
    carbs: round(num(nutr, 'carbohydrates_serving')),
    fat: round(num(nutr, 'fat_serving')),
    fiber: round(num(nutr, 'fiber_serving')),
    sodium: round(sodiumS),
  };
  const hasExplicit = Object.values(explicitServing).some((v) => v != null);

  let serving_size = size;
  let serving_unit = unit || 'g';
  let nutrition: Nutrition;
  if (hasExplicit && grams && grams > 0) {
    nutrition = explicitServing;
  } else if (grams && grams > 0) {
    const k = grams / 100;
    nutrition = {
      kcal: round((per100.kcal ?? 0) * k), protein: round((per100.protein ?? 0) * k),
      carbs: round((per100.carbs ?? 0) * k), fat: round((per100.fat ?? 0) * k),
      fiber: round((per100.fiber ?? 0) * k), sodium: round((per100.sodium ?? 0) * k),
    };
  } else {
    // No serving info → store on a per-100g basis.
    nutrition = per100;
    serving_size = 100;
    serving_unit = 'g';
  }

  const brands = Array.isArray(p.brands) ? p.brands.join(', ') : (p.brands || '');
  const name = p.product_name_en || p.product_name || brands || p.code;
  const ingredients = (p.ingredients_text_en || p.ingredients_text || '').trim() || null;

  return {
    barcode: p.code ? leftPad14(p.code) : null,
    name: String(name),
    brand: String(brands),
    size: p.quantity || null,
    net_weight_g: typeof p.product_quantity === 'number' ? p.product_quantity : (parseFloat(p.product_quantity) || null),
    serving_size,
    serving_unit,
    servings_per_container: grams && typeof p.product_quantity === 'number' && grams > 0 ? round(p.product_quantity / grams, 0) : null,
    nutrition,
    nutrition_per_100g: per100.kcal != null ? per100 : (grams ? per100From(nutrition, grams) : { ...EMPTY_NUTRITION }),
    ingredients_text: ingredients,
    diet_level: null, // filled by the diet cascade
    diet_status: null,
    allergens: [],
    allergen_traces: [],
    gluten_free: null,
    form: detectForm(`${name} ${p.categories_tags || ''}`),
    analysis_source: 'off',
    source_url: `https://world.openfoodfacts.org/product/${p.code}`,
    source_ref: String(p.code),
    attribution: 'Data © Open Food Facts contributors (ODbL)',
    image_url: p.image_front_url || null,
    completeness: typeof p.completeness === 'number' ? p.completeness : null,
    _offAnalysisTags: p.ingredients_analysis_tags || [],
    _offAllergenTags: p.allergens_tags || [],
    _offTracesTags: p.traces_tags || [],
  };
}
