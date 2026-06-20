// Edge function: resolve an ingredient to ranked product candidates by name
// search, or extract from a manufacturer URL (spec §B2, §A1, §E, §F).
import { corsHeaders, json } from '../_shared/cors.ts';
import { offSearch } from '../_shared/off.ts';
import { fdcSearch } from '../_shared/fdc.ts';
import { deriveDietAllergen } from '../_shared/diet.ts';
import { rankCandidates } from '../_shared/ranking.ts';
import { EMPTY_NUTRITION, per100From, ProductCandidate, publicCandidate, round } from '../_shared/normalize.ts';
import { ingredientBasis } from '../_shared/forms.ts';
import { loadFoodTerms, loadMembers } from '../_shared/db.ts';

const ANALYZE_WHOLE_FOOD = new Set(['produce', 'grain', 'legume', 'meat', 'fish', 'dairy', 'oil', 'spice', 'nut']);
// Plain whole foods of these categories are vegan (used to infer diet for FDC
// entries that carry no ingredient list). Excludes meat/fish/dairy/sweetener.
const PLANT_CATS = new Set(['produce', 'grain', 'legume', 'nut', 'oil', 'spice']);

async function extractManufacturer(url: string, anthropicKey?: string): Promise<ProductCandidate | null> {
  if (!anthropicKey) return null;
  let text = '';
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'HarborMealPlanner/0.1 (spencerwright@gmail.com)' } });
    if (!r.ok) return null;
    text = (await r.text()).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 12000);
  } catch {
    return null;
  }
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: 'Extract product facts from a manufacturer page. Only return numbers explicitly stated; use null for anything not clearly present. Never guess.',
        tools: [{
          name: 'product', description: 'Extracted product facts',
          input_schema: {
            type: 'object',
            properties: {
              name: { type: 'string' }, brand: { type: 'string' },
              serving_size: { type: ['number', 'null'] }, serving_unit: { type: ['string', 'null'] },
              kcal: { type: ['number', 'null'] }, protein: { type: ['number', 'null'] }, carbs: { type: ['number', 'null'] },
              fat: { type: ['number', 'null'] }, fiber: { type: ['number', 'null'] }, sodium_mg: { type: ['number', 'null'] },
              ingredients_text: { type: ['string', 'null'] },
            },
            required: ['name', 'brand'],
          },
        }],
        tool_choice: { type: 'tool', name: 'product' },
        messages: [{ role: 'user', content: `URL: ${url}\n\nPage text:\n${text}` }],
      }),
    });
    if (!resp.ok) return null;
    const j = await resp.json();
    const x = (j.content || []).find((b: any) => b.type === 'tool_use')?.input;
    if (!x) return null;
    const nutrition = { kcal: round(x.kcal), protein: round(x.protein), carbs: round(x.carbs), fat: round(x.fat), fiber: round(x.fiber), sodium: round(x.sodium_mg) };
    const ss = x.serving_size ?? 100;
    return {
      barcode: null, name: x.name, brand: x.brand || '', size: null, net_weight_g: null,
      serving_size: ss, serving_unit: x.serving_unit || 'g', servings_per_container: null,
      nutrition, nutrition_per_100g: per100From(nutrition, x.serving_unit === 'g' ? ss : null),
      ingredients_text: x.ingredients_text || null, diet_level: null, diet_status: null,
      allergens: [], allergen_traces: [], gluten_free: null, analysis_source: 'manufacturer',
      source_url: url, source_ref: url, attribution: `Manufacturer: ${url}`, image_url: null, completeness: null,
      _offAnalysisTags: [], _offAllergenTags: [], _offTracesTags: [],
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const mode = body.mode ?? 'name_search';
    const query: string = body.query ?? '';
    const label: string = body.label ?? query;
    const category: string | null = body.category ?? null;
    const brandIntent: boolean = !!body.brand_intent;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? undefined;

    const [foodTerms, members] = await Promise.all([loadFoodTerms(req), loadMembers(req)]);

    const ingBasis = ingredientBasis(label, category);

    let candidates: ProductCandidate[] = [];
    if (mode === 'manufacturer_url') {
      const c = await extractManufacturer(body.url, anthropicKey);
      if (c) candidates = [c];
    } else {
      const wholeFood = !brandIntent && category != null && ANALYZE_WHOLE_FOOD.has(category);
      if (wholeFood) {
        // Surface the right cooked/dry FDC entry: "Quinoa, cooked" vs "uncooked".
        const formWord = ingBasis === 'wet' ? 'cooked' : ingBasis === 'dry' ? 'dry' : '';
        const fdcQuery = formWord && !query.toLowerCase().includes(formWord) ? `${query} ${formWord}` : query;
        const [fdc, off] = await Promise.all([fdcSearch(fdcQuery, 'Foundation,SR Legacy', 6), offSearch(query, 8)]);
        candidates = [...fdc, ...off];
      } else {
        const [off, fdc] = await Promise.all([offSearch(query, 12), fdcSearch(query, 'Branded', 5)]);
        candidates = [...off, ...fdc];
      }
    }

    // dedupe by barcode (else source_ref)
    const seen = new Set<string>();
    candidates = candidates.filter((c) => {
      const k = c.barcode || `${c.analysis_source}:${c.source_ref}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // derive diet/allergen for each (keyword/tag tiers only — cheap, no LLM per list item)
    for (const c of candidates) {
      const d = await deriveDietAllergen(c, foodTerms, { useLLM: mode === 'manufacturer_url', anthropicKey });
      Object.assign(c, d);
      // FDC whole-food entries have no ingredient list, so diet derivation can't
      // confirm veganness and they'd lose to OFF on compliance — even though a
      // plain plant food (grain/legume/produce/nut/oil/spice) IS vegan. Infer it
      // for those so the authoritative-nutrition FDC entry can win on form.
      if (
        c.diet_level == null &&
        (c.analysis_source === 'fdc_foundation' || c.analysis_source === 'fdc_sr_legacy') &&
        category && PLANT_CATS.has(category)
      ) {
        c.diet_level = 3;
        c.diet_status = 'derived';
      }
    }

    const { ranked, auto_suggest_index } = rankCandidates(candidates, { label, category, brandIntent, members, ingredientBasis: ingBasis });
    return json({
      ok: true,
      candidates: ranked.map((c) => ({ ...publicCandidate(c), compliance: (c as any).compliance })),
      auto_suggest_index,
      error: null,
    });
  } catch (e) {
    return json({ ok: false, candidates: [], auto_suggest_index: null, error: { code: 'INTERNAL', message: String(e) } }, 500);
  }
});
