/**
 * Unit conversion for recipe quantities. Recipe lines use cooking units
 * (cup/tbsp/tsp/oz/can) while real products carry nutrition per a metric serving
 * (usually 100 g). To scale a per-100g product onto a "1 cup" line we convert
 * both sides to grams.
 *
 * Mass units are universal. Volume units need a per-ingredient DENSITY, and
 * count/container units (can, each) need a per-ingredient WEIGHT — both supplied
 * by `ingredient_portion` rows (grams in one of that unit).
 */

/** ml in one of each volume unit. */
const VOLUME_ML: Record<string, number> = {
  ml: 1, milliliter: 1, l: 1000, liter: 1000, litre: 1000,
  tsp: 4.92892, teaspoon: 4.92892,
  tbsp: 14.7868, tablespoon: 14.7868,
  'fl oz': 29.5735, floz: 29.5735,
  cup: 236.588,
  pint: 473.176, pt: 473.176,
  quart: 946.353, qt: 946.353,
  gallon: 3785.41, gal: 3785.41,
};

/** grams in one of each mass unit. */
const MASS_G: Record<string, number> = {
  mg: 0.001, g: 1, gram: 1, grams: 1, kg: 1000, kilogram: 1000,
  oz: 28.3495, ounce: 28.3495, lb: 453.592, lbs: 453.592, pound: 453.592,
};

export type Portion = { unit: string; grams: number };

export function normalizeUnit(u: string | null | undefined): string {
  const s = (u ?? '').trim().toLowerCase().replace(/\.$/, '');
  if (s in VOLUME_ML || s in MASS_G) return s; // known as-is (incl. "grams", "lbs")
  return s.replace(/s$/, ''); // "cups" → "cup", "cans" → "can"
}

const isVolume = (u: string) => u in VOLUME_ML;
const isMass = (u: string) => u in MASS_G;

/** Density (g per ml) for an ingredient, derived from any volume portion row. */
function densityOf(portions: Portion[]): number | null {
  for (const p of portions) {
    const u = normalizeUnit(p.unit);
    if (isVolume(u) && p.grams > 0) return p.grams / VOLUME_ML[u];
  }
  return null;
}

/**
 * Convert `quantity` of `unit` to grams for a given ingredient.
 * Returns null when the conversion needs ingredient data we don't have
 * (volume without a density, or an unknown count/container unit).
 */
export function toGrams(quantity: number, unit: string, portions: Portion[]): number | null {
  const u = normalizeUnit(unit);
  if (isMass(u)) return quantity * MASS_G[u];
  if (isVolume(u)) {
    // exact portion row for this volume unit wins (most precise)
    const exact = portions.find((p) => normalizeUnit(p.unit) === u);
    if (exact) return quantity * exact.grams;
    const density = densityOf(portions);
    return density == null ? null : quantity * VOLUME_ML[u] * density;
  }
  // count / container unit (can, each, clove, slice, …): needs an exact row
  const exact = portions.find((p) => normalizeUnit(p.unit) === u);
  return exact ? quantity * exact.grams : null;
}

/**
 * The scale factor to apply to a product's per-serving nutrition for a recipe
 * line: (line amount) / (product serving), both reduced to a common basis.
 * - If the units match, the ratio is exact and needs no ingredient data.
 * - Otherwise both sides convert to grams (needs density/portion data).
 * Returns null when it can't be computed safely (caller should fall back).
 */
export function lineFactor(
  lineQty: number,
  lineUnit: string,
  servingSize: number,
  servingUnit: string,
  portions: Portion[],
): number | null {
  if (!servingSize) return null;
  if (normalizeUnit(lineUnit) === normalizeUnit(servingUnit)) return lineQty / servingSize;
  const lineG = toGrams(lineQty, lineUnit, portions);
  const servG = toGrams(servingSize, servingUnit, portions);
  if (lineG == null || servG == null || servG === 0) return null;
  return lineG / servG;
}
