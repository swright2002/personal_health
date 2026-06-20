// Edge function: resolve an ingredient to ranked product candidates by name
// search, or extract from a manufacturer URL (spec §B2, §A1, §E, §F).
import { corsHeaders, json } from '../_shared/cors.ts';
import { offSearch } from '../_shared/off.ts';
import { fdcSearch } from '../_shared/fdc.ts';
import { deriveDietAllergen } from '../_shared/diet.ts';
import { rankCandidates } from '../_shared/ranking.ts';
import { EMPTY_NUTRITION, per100From, ProductCandidate, publicCandidate, round } from '../_shared/normalize.ts';
import { ingredientBasis } from '../_shared/forms.ts';
import { loadFoodTerms, loadMembers, loadPreferredBrands } from '../_shared/db.ts';

const ANALYZE_WHOLE_FOOD = new Set(['produce', 'grain', 'legume', 'meat', 'fish', 'dairy', 'oil', 'spice', 'nut']);
// Plain whole foods of these categories are vegan (used to infer diet for FDC
// entries that carry no ingredient list). Excludes meat/fish/dairy/sweetener.
const PLANT_CATS = new Set(['produce', 'grain', 'legume', 'nut', 'oil', 'spice']);

// Map a learned brand to the retailer whose site carries it, so we can source a
// new ingredient from the household's store FIRST (their actual product) instead
// of settling for a generic aggregator entry.
const RETAILERS: { match: RegExp; domain: string; brand: string }[] = [
  { match: /365|whole\s*foods/i, domain: 'wholefoodsmarket.com', brand: '365 organic' },
];
function preferredRetailer(brands: string[]): (typeof RETAILERS)[number] | null {
  for (const b of brands) for (const r of RETAILERS) if (r.match.test(b)) return r;
  return null;
}

type RetailerResult = { candidate: ProductCandidate | null; ddg: number; url: string | null };

/** Find the household's-retailer product for a query via web search, then extract
 *  its nutrition from the product page (the proven manufacturer path). DuckDuckGo
 *  intermittently rate-limits datacenter IPs, so retry a couple times. */
async function retailerSearch(query: string, retailer: (typeof RETAILERS)[number], anthropicKey?: string): Promise<RetailerResult> {
  if (!anthropicKey) return { candidate: null, ddg: 0, url: null };
  // site: keeps results on the retailer; brand sharpens to the 365 line.
  const q = `${query} ${retailer.brand} site:${retailer.domain}`;
  const re = new RegExp(retailer.domain.replace(/\./g, '\\.') + '/product/[a-z0-9-]+', 'i');
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
  const endpoints: (() => Promise<Response>)[] = [
    () => fetch('https://html.duckduckgo.com/html/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, body: 'q=' + encodeURIComponent(q) }),
    () => fetch('https://lite.duckduckgo.com/lite/?q=' + encodeURIComponent(q), { headers: { 'User-Agent': UA } }),
  ];
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const call of endpoints) {
      let html = '';
      try {
        const r = await call();
        lastStatus = r.status;
        html = await r.text();
      } catch {
        continue;
      }
      const m = html.match(re);
      if (m) {
        const url = 'https://www.' + m[0];
        return { candidate: await extractManufacturer(url, anthropicKey), ddg: lastStatus, url };
      }
    }
  }
  return { candidate: null, ddg: lastStatus, url: null };
}

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

    const [foodTerms, members, preferredBrands] = await Promise.all([loadFoodTerms(req), loadMembers(req), loadPreferredBrands(req)]);

    const ingBasis = ingredientBasis(label, category);

    let candidates: ProductCandidate[] = [];
    let retailerResult: RetailerResult = { candidate: null, ddg: 0, url: null };
    if (mode === 'manufacturer_url') {
      const c = await extractManufacturer(body.url, anthropicKey);
      if (c) candidates = [c];
    } else {
      // Preferred-retailer-first: if the household has a store habit (e.g. 365 →
      // Whole Foods), try sourcing their actual product before the aggregators.
      const retailer = body.skip_retailer ? null : preferredRetailer(preferredBrands);
      const retailerP = retailer ? retailerSearch(query, retailer, anthropicKey) : Promise.resolve({ candidate: null, ddg: 0, url: null } as RetailerResult);

      const wholeFood = !brandIntent && category != null && ANALYZE_WHOLE_FOOD.has(category);
      let aggregators: ProductCandidate[];
      if (wholeFood) {
        // Surface the right cooked/dry FDC entry: "Quinoa, cooked" vs "uncooked".
        const formWord = ingBasis === 'wet' ? 'cooked' : ingBasis === 'dry' ? 'dry' : '';
        const fdcQuery = formWord && !query.toLowerCase().includes(formWord) ? `${query} ${formWord}` : query;
        const [fdc, off] = await Promise.all([fdcSearch(fdcQuery, 'Foundation,SR Legacy', 6), offSearch(query, 8)]);
        aggregators = [...fdc, ...off];
      } else {
        const [off, fdc] = await Promise.all([offSearch(query, 12), fdcSearch(query, 'Branded', 5)]);
        aggregators = [...off, ...fdc];
      }
      retailerResult = await retailerP;
      candidates = retailerResult.candidate ? [retailerResult.candidate, ...aggregators] : aggregators;
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
        (c.diet_level == null || c.diet_status === 'unknown') &&
        (c.analysis_source === 'fdc_foundation' || c.analysis_source === 'fdc_sr_legacy' || c.analysis_source === 'manufacturer') &&
        category && PLANT_CATS.has(category)
      ) {
        c.diet_level = 3;
        c.diet_status = 'derived';
      }
    }

    const { ranked, auto_suggest_index } = rankCandidates(candidates, { label, category, brandIntent, members, ingredientBasis: ingBasis, preferredBrands });
    return json({
      ok: true,
      candidates: ranked.map((c) => ({ ...publicCandidate(c), compliance: (c as any).compliance })),
      auto_suggest_index,
      error: null,
      debug: body.debug ? { preferredBrands, retailer: preferredRetailer(preferredBrands)?.domain ?? null, ddg: retailerResult.ddg, retailerUrl: retailerResult.url, retailerFound: !!retailerResult.candidate } : undefined,
    });
  } catch (e) {
    return json({ ok: false, candidates: [], auto_suggest_index: null, error: { code: 'INTERNAL', message: String(e) } }, 500);
  }
});
