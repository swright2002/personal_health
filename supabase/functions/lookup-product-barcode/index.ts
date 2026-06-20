// Edge function: resolve a scanned/entered barcode to a product candidate with
// nutrition + diet/allergen + a UPC-validation verdict (spec §B1, §D, §E).
import { corsHeaders, json } from '../_shared/cors.ts';
import { stripNonDigits, validateBarcode } from '../_shared/gtin.ts';
import { offByBarcode } from '../_shared/off.ts';
import { fdcByGtin } from '../_shared/fdc.ts';
import { deriveDietAllergen } from '../_shared/diet.ts';
import { complianceFor, householdClass } from '../_shared/ranking.ts';
import { Nutrition, ProductCandidate, publicCandidate } from '../_shared/normalize.ts';
import { loadFoodTerms, loadMembers } from '../_shared/db.ts';

const NUTR_KEYS: (keyof Nutrition)[] = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sodium'];

/** Fill nulls in `base` from `fill` per field (per-field trust, spec §A2). */
function mergeCandidates(base: ProductCandidate, fill: ProductCandidate | null): ProductCandidate {
  if (!fill) return base;
  const out = { ...base };
  for (const k of NUTR_KEYS) if (out.nutrition[k] == null && fill.nutrition[k] != null) out.nutrition[k] = fill.nutrition[k];
  for (const k of NUTR_KEYS) if (out.nutrition_per_100g[k] == null && fill.nutrition_per_100g[k] != null) out.nutrition_per_100g[k] = fill.nutrition_per_100g[k];
  if (!out.ingredients_text && fill.ingredients_text) out.ingredients_text = fill.ingredients_text;
  if (!out.brand && fill.brand) out.brand = fill.brand;
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { barcode, claimed_brand, claimed_name } = await req.json();
    const digits = stripNonDigits(barcode ?? '');
    if (![8, 12, 13, 14].includes(digits.length)) {
      return json({ ok: false, candidates: [], auto_suggest_index: null, error: { code: 'BAD_LENGTH', message: 'Not a valid barcode length' } });
    }

    const off = await offByBarcode(digits);
    const fdc = await fdcByGtin(digits.padStart(14, '0'));
    const primary = off ?? fdc;
    if (!primary) {
      return json({ ok: false, candidates: [], auto_suggest_index: null, error: { code: 'NOT_FOUND', message: 'No product found for this barcode' } });
    }

    const sourceConflict = !!(off && fdc && off.name && fdc.name && !off.name.toLowerCase().includes(fdc.name.toLowerCase().slice(0, 6)) && !fdc.name.toLowerCase().includes(off.name.toLowerCase().slice(0, 6)));
    const verdict = validateBarcode(digits, {
      claimedBrand: claimed_brand,
      claimedName: claimed_name,
      offCode: off?.barcode,
      fdcGtin: fdc?.barcode,
      sourceBrand: fdc?.brand || off?.brand,
      sourceConflict,
    });

    const merged = mergeCandidates(primary, off && fdc ? (primary === off ? fdc : off) : null);
    const diet = await deriveDietAllergen(merged, await loadFoodTerms(req), {
      useLLM: true,
      anthropicKey: Deno.env.get('ANTHROPIC_API_KEY') ?? undefined,
    });
    Object.assign(merged, diet);

    const members = await loadMembers(req);
    const perMember: Record<string, string> = {};
    for (const m of members) perMember[m.id] = complianceFor(merged, m);
    const hc = householdClass(merged, members);

    const candidate = {
      ...publicCandidate(merged),
      compliance: { householdClass: hc, perMember },
      barcode_validation: verdict,
    };
    return json({ ok: true, candidates: [candidate], auto_suggest_index: hc === 0 && verdict.ok ? 0 : null, error: null });
  } catch (e) {
    return json({ ok: false, candidates: [], auto_suggest_index: null, error: { code: 'INTERNAL', message: String(e) } }, 500);
  }
});
