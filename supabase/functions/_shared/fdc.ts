// USDA FoodData Central client (spec §B4, §C). Primary for whole foods/produce
// (Foundation + SR Legacy); Branded used only to cross-reference a barcode.
import { EMPTY_NUTRITION, Nutrition, ProductCandidate, round } from './normalize.ts';
import { leftPad14 } from './gtin.ts';

const KEY = Deno.env.get('FDC_API_KEY') || 'DEMO_KEY';
const BASE = 'https://api.nal.usda.gov/fdc/v1';

async function fdcFetch(url: string, timeoutMs = 9000): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: { 'X-Api-Key': KEY, Accept: 'application/json' }, signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Read a nutrient from search (flat: nutrientNumber/value) or detail (nested: nutrient.number/amount).
function nutr(food: any, number: string): number | null {
  const arr: any[] = food.foodNutrients || [];
  for (const n of arr) {
    const num = n.nutrientNumber ?? n.nutrient?.number;
    if (String(num) === number) {
      const v = n.value ?? n.amount;
      if (typeof v === 'number' && isFinite(v)) return v;
    }
  }
  return null;
}

function sourceOf(dataType: string): string {
  if (dataType === 'Foundation') return 'fdc_foundation';
  if (dataType === 'SR Legacy') return 'fdc_sr_legacy';
  if (dataType === 'Branded') return 'fdc_branded';
  return 'fdc';
}

export function normalizeFdc(food: any): ProductCandidate | null {
  if (!food || !food.fdcId) return null;
  const energy = nutr(food, '208') ?? nutr(food, '957') ?? nutr(food, '958');
  // Foundation/SR nutrients are per 100 g.
  const per100: Nutrition = {
    kcal: round(energy),
    protein: round(nutr(food, '203')),
    carbs: round(nutr(food, '205')),
    fat: round(nutr(food, '204')),
    fiber: round(nutr(food, '291')),
    sodium: round(nutr(food, '307')), // already mg
  };
  const branded = food.dataType === 'Branded';
  return {
    barcode: branded && food.gtinUpc ? leftPad14(food.gtinUpc) : null,
    name: String(food.description || food.lowercaseDescription || 'Unknown'),
    brand: branded ? String(food.brandOwner || food.brandName || '') : '',
    size: branded ? (food.householdServingFullText || null) : null,
    net_weight_g: null,
    serving_size: 100,
    serving_unit: 'g',
    servings_per_container: null,
    nutrition: per100,
    nutrition_per_100g: per100,
    ingredients_text: branded && food.ingredients ? String(food.ingredients) : null,
    diet_level: null,
    diet_status: null,
    allergens: [],
    allergen_traces: [],
    gluten_free: null,
    analysis_source: sourceOf(food.dataType),
    source_url: `https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`,
    source_ref: String(food.fdcId),
    attribution: 'Data from USDA FoodData Central (public domain, CC0)',
    image_url: null,
    completeness: null,
    _offAnalysisTags: [],
    _offAllergenTags: [],
    _offTracesTags: [],
  };
}

export async function fdcSearch(query: string, dataType = 'Foundation,SR Legacy', limit = 5): Promise<ProductCandidate[]> {
  const url = `${BASE}/foods/search?query=${encodeURIComponent(query)}&dataType=${encodeURIComponent(dataType)}` +
    `&requireAllWords=true&pageSize=${limit}&sortBy=dataType.keyword&sortOrder=asc`;
  const j = await fdcFetch(url);
  const foods: any[] = j?.foods ?? [];
  return foods.map(normalizeFdc).filter((c): c is ProductCandidate => c != null);
}

/** Find a Branded FDC item whose gtinUpc matches the scanned barcode (cross-ref only). */
export async function fdcByGtin(gtin14: string): Promise<ProductCandidate | null> {
  const stripped = gtin14.replace(/^0+/, '');
  const j = await fdcFetch(`${BASE}/foods/search?query=${stripped}&dataType=Branded&pageSize=5`);
  const foods: any[] = j?.foods ?? [];
  for (const f of foods) {
    if (f.gtinUpc && leftPad14(f.gtinUpc) === gtin14) return normalizeFdc(f);
  }
  return null;
}
