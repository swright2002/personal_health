// Diet/allergen derivation — fail-closed 3-tier cascade (spec §E).
// Tier 1: OFF analysis tags. Tier 2: food_term keyword scan of ingredients_text.
// Tier 3: Claude gap-fill (optional, used for persisted/selected products).
import { ProductCandidate } from './normalize.ts';

export type FoodTerm = {
  term: string;
  allergen_key: string | null;
  vegan: boolean | null;
  vegetarian: boolean | null;
  pescetarian_ok: boolean | null;
  gluten: boolean;
  ambiguous: boolean;
};

type Verdict = 'pass' | 'fail' | 'maybe' | 'unknown';
const RANK: Record<Verdict, number> = { fail: 0, maybe: 1, unknown: 2, pass: 3 };
const moreRestrictive = (a: Verdict, b: Verdict): Verdict => (RANK[a] <= RANK[b] ? a : b);

export type DietResult = {
  diet_level: number | null;
  diet_status: 'confirmed' | 'derived' | 'maybe' | 'unknown';
  allergens: string[];
  allergen_traces: string[];
  gluten_free: boolean | null;
  allergens_known: boolean;
};

const BIG9 = new Set(['milk', 'egg', 'fish', 'crustacean_shellfish', 'tree_nuts', 'peanuts', 'wheat', 'soybeans', 'sesame', 'mollusc']);
// gluten deliberately NOT mapped → it is a restriction (gluten_free), not the wheat allergen.
const ALLERGEN_SYNONYM: Record<string, string> = {
  eggs: 'egg', dairy: 'milk', soy: 'soybeans', soya: 'soybeans', soybean: 'soybeans',
  hazelnut: 'tree_nuts', hazelnuts: 'tree_nuts', almond: 'tree_nuts', almonds: 'tree_nuts',
  walnut: 'tree_nuts', walnuts: 'tree_nuts', cashew: 'tree_nuts', cashews: 'tree_nuts',
  pecan: 'tree_nuts', pecans: 'tree_nuts', pistachio: 'tree_nuts', macadamia: 'tree_nuts',
  coconut: 'tree_nuts', nut: 'tree_nuts', nuts: 'tree_nuts', 'tree nut': 'tree_nuts', 'tree nuts': 'tree_nuts', treenuts: 'tree_nuts',
  peanut: 'peanuts', shellfish: 'crustacean_shellfish', crustacean: 'crustacean_shellfish', crustaceans: 'crustacean_shellfish',
  'crustacean shellfish': 'crustacean_shellfish', sesame_seeds: 'sesame', 'sesame seeds': 'sesame',
  mollusk: 'mollusc', molluscs: 'mollusc', wheat_flour: 'wheat',
};
/** Map a freeform allergen string to a canonical Big-9 key, or null if unrecognized. */
function canonAllergen(a: string): string | null {
  const k = a.toLowerCase().trim().replace(/\s+/g, ' ');
  if (BIG9.has(k)) return k;
  const syn = ALLERGEN_SYNONYM[k] ?? ALLERGEN_SYNONYM[k.replace(/ /g, '_')];
  return syn && BIG9.has(syn) ? syn : null;
}

const OFF_ALLERGEN: Record<string, string> = {
  'en:milk': 'milk', 'en:eggs': 'egg', 'en:fish': 'fish', 'en:crustaceans': 'crustacean_shellfish',
  'en:molluscs': 'mollusc', 'en:nuts': 'tree_nuts', 'en:peanuts': 'peanuts', 'en:soybeans': 'soybeans',
  'en:sesame-seeds': 'sesame',
};

function offDiet(tags: string[]): { vegan: Verdict; vegetarian: Verdict } {
  const has = (t: string) => tags.includes(t);
  const vegan: Verdict = has('en:vegan') ? 'pass' : has('en:non-vegan') ? 'fail' : has('en:maybe-vegan') ? 'maybe' : 'unknown';
  const vegetarian: Verdict = has('en:vegetarian') || has('en:vegan') ? 'pass'
    : has('en:non-vegetarian') ? 'fail' : has('en:maybe-vegetarian') ? 'maybe' : 'unknown';
  return { vegan, vegetarian };
}

/** Tokenize an ingredient list, keeping sub-ingredients in parentheses. */
function tokens(text: string): string[] {
  return text.toLowerCase().replace(/\d+(\.\d+)?\s*%/g, ' ').split(/[,;()\[\]]+/).map((t) => t.trim()).filter(Boolean);
}

const INERT = new Set([
  'water', 'salt', 'sea salt', 'sugar', 'cane sugar', 'citric acid', 'baking soda', 'baking powder',
  'spices', 'spice', 'vinegar', 'yeast', 'corn starch', 'cornstarch', 'rice', 'oat', 'maltodextrin',
]);

// Word-boundary matcher with an optional plural/inflection suffix, so a seed
// term "soybean" matches "soybeans", "almond" matches "almonds", etc. Same
// matcher drives BOTH the signal pass and the leftover check (a substring
// includes() leftover test fails OPEN: "wheatstarch" would mask "wheat").
function termRe(term: string): RegExp {
  return new RegExp('(^|[^a-z])' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(s|es)?([^a-z]|$)', 'i');
}

function scan(text: string, terms: FoodTerm[]) {
  const lc = ' ' + text.toLowerCase() + ' ';
  const allergens = new Set<string>();
  let vegan: Verdict = 'unknown', vegetarian: Verdict = 'unknown', pescetarian: Verdict = 'unknown';
  let glutenHit = false;
  let matchedAny = false;
  // longest-match-first so "soy lecithin" wins before "soy"
  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length).map((t) => ({ t, re: termRe(t.term) }));
  for (const { t, re } of sorted) {
    if (!re.test(lc)) continue;
    matchedAny = true;
    if (t.allergen_key) allergens.add(t.allergen_key);
    if (t.gluten) glutenHit = true;
    if (t.vegan === false) vegan = moreRestrictive(vegan, t.ambiguous ? 'maybe' : 'fail');
    if (t.vegetarian === false) vegetarian = moreRestrictive(vegetarian, t.ambiguous ? 'maybe' : 'fail');
    if (t.pescetarian_ok === false) pescetarian = moreRestrictive(pescetarian, t.ambiguous ? 'maybe' : 'fail');
  }
  // A token is a "leftover" if no seed term matches it at a word boundary.
  const leftovers = tokens(text).some((tok) => {
    if (INERT.has(tok)) return false;
    const pad = ' ' + tok + ' ';
    return !sorted.some(({ re }) => re.test(pad));
  });
  return { allergens: [...allergens], vegan, vegetarian, pescetarian, glutenHit, matchedAny, leftovers };
}

async function llmClassify(c: ProductCandidate, apiKey: string): Promise<any | null> {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system:
          'You classify a food product for diet suitability and allergens. Be conservative and fail-closed: ' +
          'only answer "pass" for a diet axis when you are confident NO disqualifying ingredient is present. ' +
          'Use "maybe" for ambiguous ingredients (natural flavors, mono- and diglycerides, enzymes). ' +
          'Use "unknown" when there is not enough information. Never assert safety on doubt. ' +
          'For allergens, return ONLY these FDA Big-9 keys that apply: milk, egg, fish, crustacean_shellfish, ' +
          'tree_nuts, peanuts, wheat, soybeans, sesame (coconut counts as tree_nuts).',
        tools: [{
          name: 'classify',
          description: 'Return the diet/allergen classification.',
          input_schema: {
            type: 'object',
            properties: {
              vegan: { type: 'string', enum: ['pass', 'fail', 'maybe', 'unknown'] },
              vegetarian: { type: 'string', enum: ['pass', 'fail', 'maybe', 'unknown'] },
              pescetarian: { type: 'string', enum: ['pass', 'fail', 'maybe', 'unknown'] },
              allergens: { type: 'array', items: { type: 'string', enum: ['milk', 'egg', 'fish', 'crustacean_shellfish', 'tree_nuts', 'peanuts', 'wheat', 'soybeans', 'sesame'] } },
              gluten_free: { type: 'string', enum: ['true', 'false', 'unknown'] },
            },
            required: ['vegan', 'vegetarian', 'pescetarian', 'allergens', 'gluten_free'],
          },
        }],
        tool_choice: { type: 'tool', name: 'classify' },
        messages: [{
          role: 'user',
          content: `Product: ${c.brand} ${c.name}\nIngredients: ${c.ingredients_text || '(none listed — classify by the food name)'}`,
        }],
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const block = (j.content || []).find((b: any) => b.type === 'tool_use');
    return block?.input ?? null;
  } catch {
    return null;
  }
}

export async function deriveDietAllergen(
  c: ProductCandidate,
  terms: FoodTerm[],
  opts: { useLLM?: boolean; anthropicKey?: string } = {},
): Promise<DietResult> {
  const analysisTags = c._offAnalysisTags || [];
  const allergenTags = c._offAllergenTags || [];
  const tracesTags = c._offTracesTags || [];
  const hadSignal = analysisTags.length > 0 || allergenTags.length > 0 || !!(c.ingredients_text && c.ingredients_text.trim());

  // Tier 1
  const t1 = offDiet(analysisTags);
  const allergens = new Set<string>();
  for (const tag of allergenTags) if (OFF_ALLERGEN[tag]) allergens.add(OFF_ALLERGEN[tag]);
  const traces = new Set<string>();
  for (const tag of tracesTags) if (OFF_ALLERGEN[tag]) traces.add(OFF_ALLERGEN[tag]);
  let glutenFalse = allergenTags.includes('en:gluten');

  let vegan = t1.vegan, vegetarian = t1.vegetarian, pescetarian: Verdict = 'unknown';
  let leftovers = false, matchedAny = false;

  // Tier 2 — a scan verdict of 'unknown' means "no disqualifier found"; it must
  // NOT wipe a Tier-1 pass (that would defeat OFF's en:vegan tag). Only merge
  // an actual fail/maybe downgrade.
  if (c.ingredients_text && c.ingredients_text.trim()) {
    const s = scan(c.ingredients_text, terms);
    s.allergens.forEach((a) => allergens.add(a));
    if (s.glutenHit) glutenFalse = true;
    if (s.vegan !== 'unknown') vegan = moreRestrictive(vegan, s.vegan);
    if (s.vegetarian !== 'unknown') vegetarian = moreRestrictive(vegetarian, s.vegetarian);
    if (s.pescetarian !== 'unknown') pescetarian = moreRestrictive(pescetarian, s.pescetarian);
    leftovers = s.leftovers;
    matchedAny = s.matchedAny;
  }

  // Tier 3 — gap-fill (only when asked, e.g. persisted/selected products)
  let llmRan = false;
  const needsLLM = opts.useLLM && opts.anthropicKey &&
    (vegan === 'maybe' || vegan === 'unknown' || vegetarian === 'unknown' || pescetarian === 'unknown' || leftovers);
  if (needsLLM) {
    const out = await llmClassify(c, opts.anthropicKey!);
    if (out) {
      llmRan = true;
      vegan = moreRestrictive(vegan, out.vegan as Verdict);
      vegetarian = moreRestrictive(vegetarian, out.vegetarian as Verdict);
      pescetarian = moreRestrictive(pescetarian, out.pescetarian as Verdict);
      (out.allergens || []).forEach((a: string) => { const k = canonAllergen(a); if (k) allergens.add(k); });
      if (out.gluten_free === 'false') glutenFalse = true;
      if (out.gluten_free === 'true' && !glutenFalse) glutenFalse = false;
    }
  }

  // A vegan pass implies vegetarian + pescetarian pass.
  if (vegan === 'pass') { vegetarian = 'pass'; pescetarian = 'pass'; }
  if (vegetarian === 'pass' && pescetarian !== 'fail') pescetarian = 'pass';

  // diet_level = highest level hard-passed
  let diet_level: number | null;
  let binding: Verdict;
  if (vegan === 'pass') { diet_level = 3; binding = vegan; }
  else if (vegetarian === 'pass') { diet_level = 2; binding = vegetarian; }
  else if (pescetarian === 'pass') { diet_level = 1; binding = pescetarian; }
  else { diet_level = 0; binding = moreRestrictive(moreRestrictive(vegan, vegetarian), pescetarian); }

  let diet_status: DietResult['diet_status'];
  if (!hadSignal) { diet_level = null; diet_status = 'unknown'; }
  else if (diet_level >= 1) diet_status = leftovers && !opts.useLLM ? 'maybe' : 'derived';
  else {
    // level 0: confident only if a hard fail established it (found meat/fish disqualifier)
    diet_status = binding === 'fail' ? 'derived' : matchedAny ? 'maybe' : 'unknown';
  }

  // gluten_free tri-state: false if any gluten hit; true only on a clean signal; else null
  const gluten_free = glutenFalse ? false : (hadSignal && matchedAny && !leftovers ? true : null);

  // Whether we had any basis to assess allergens at all. If false (e.g. an FDC
  // whole food with no tags/ingredients and no LLM pass), an empty allergens[]
  // must NOT read as "allergen-free" — ranking treats it as unverified.
  const allergens_known = allergenTags.length > 0 || !!(c.ingredients_text && c.ingredients_text.trim()) || llmRan;

  const canon = (set: Set<string>) => [...new Set([...set].map(canonAllergen).filter((x): x is string => !!x))];
  return {
    diet_level,
    diet_status,
    allergens: canon(allergens),
    allergen_traces: canon(traces),
    gluten_free,
    allergens_known,
  };
}
