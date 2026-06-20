# Harbor — Product & Nutrition Engine: Build Spec

> Generated 2026-06-20 by a 6-agent research+design workflow (OFF, FDC, UPC-validation, manufacturer, ranking+diet, synthesis). This is the implementation source of truth for feature A. Companion to docs/recipe-and-product-sourcing.md.

> **Implementation status (2026-06-20):** Migration 0007 applied; `gtin.ts` + OFF/FDC/diet/ranking modules built; `lookup-product-barcode` + `analyze-product` edge functions deployed (via the Management API inline-body path — the CLI `functions deploy` delegate is version-broken here) and tested end-to-end (Nutella barcode → diet/allergen + a BRAND_MISMATCH verdict; "kale"/"oat milk" → vegan auto-suggest). The engine auto-suggests a real product w/ diet+allergen for all 22 ingredients.
>
> **UNIT CONVERSION — DONE (2026-06-20, migration 0009 + `mobile/src/lib/units.ts`).** `lineFactor()` reconciles a recipe line's cooking unit against a product's serving: unit-match fast path (keeps seed products working), else both sides → grams via universal mass rules + per-ingredient `ingredient_portion` rows (volume density / can weight), else null → recipe falls back to cached nutrition. The household-default selections now point at the engine's per-100g OFF products and the Plan computes real macros through the converter (verified: live hook == from-DB replica, 1655 kcal for Spencer's day). **Cooked-vs-dry form matching — DONE (migration 0010 + `_shared/forms.ts`).** Each candidate gets a detected `form`; ranking adds a form-match key so "cooked quinoa" resolves to FDC's "Quinoa, cooked" (120 kcal/100g) not a dry OFF entry (367). Enablers: (a) a plant-vegan inference for FDC whole-food entries (they carry no ingredient list, so diet derivation can't confirm vegan and they'd lose to OFF on compliance — a plain grain/legume/produce/nut IS vegan, so infer `diet_level 3 derived` for FDC Foundation/SR plant entries); (b) ranking rejects null-kcal products and prefers a clean name match over a tangential one from a preferred source (fixed olive-oil→null, cucumber→pickles, berries→babyfood). Picker shows form + warns on a cooked/dry mismatch. Verified: Spencer's day tightened 1655 → 1413 kcal. **FDC key:** a registered `FDC_API_KEY` (3600/hr) is set as the Supabase secret (and `.devtools/.env` for tooling); whole-food resolution is now reliable. The local copy lives in the Windows env var `GOV_DATA_API`.
>
> **Adversarial review (2026-06-20, 5-dimension workflow, 20 confirmed findings) — FIXED:** 4 HIGH fail-OPEN diet/allergen bugs — (a) leftover-token guard used substring `includes()` (→ `gluten_free=true` fail-open) now uses a word-boundary matcher; (b) LLM allergen output now constrained to Big-9 keys + `canonAllergen` expanded (was silently dropping coconut/dairy/crustacean; `gluten→wheat` mismap removed); (c) unassessed allergens now carry `allergens_known=false` so ranking treats them as *unverified*, not clean; (d) empty member list now returns `unverified_for_some` (was auto-suggesting non-vegan as "OK for both"). Plus MEDIUMs: OFF `en:vegan` no longer wiped to unknown by a no-signal scan; word-boundary matcher now handles plural/compound forms (soybeans/peanuts); `complianceFor` restructured so an unverified restriction can't mask a known diet violation; vegan-only green diet badge; reference-table write grants revoked + `recipe_line_product` PK fixed (migration 0008); `chooseProduct` made update-in-place. **Deferred (low priority):** OFF/FDC 429/5xx error taxonomy + token-bucket rate-limiting; `NON_FOOD_DRUG` prefix flag; `matchStrength` category-drift penalty; threading `claimed_brand` into the picker barcode path; a "macros pending unit conversion" UI signal.

I now have complete ground truth. The most important reconciliation: **none of the §5 product/member/ingredient columns or new tables exist yet** — migration 0005 only touched `recipe` and `recipe_line`. Every brief that said "added in 0005" or "typed GTIN-14 in 0005" is wrong. The next migration must be **0007** (0006 is the swap-meal function). Here is the consolidated build spec.

---

# Harbor — Product & Nutrition Engine BUILD SPEC

Consolidated from five research briefs (OFF, FDC, UPC-validation, manufacturer, ranking+diet), de-conflicted against the live migrations (`0001`–`0006`). This is the single source of truth to build from.

## 0. Ground-truth correction (read first — multiple briefs are wrong about this)

The briefs repeatedly assert that `product.barcode`, `product.ingredients_text`, `product.diet_level/diet_status`, `product.allergens/allergen_traces`, `product.analysis_source`, and `member.diet_level/allergies` were "added in migration 0005." **They were not.** Verified against the live files:

- `0005_recipe_import.sql` only altered **`recipe`** (provenance + cached nutrition) and **`recipe_line`** (raw_text/name/note/group_heading, dropped NOT NULLs). It added **nothing** to `product`, `member`, or `ingredient`.
- `0006` is `swap_meal_fn` (unrelated).
- The §5 columns and new tables (`food_term`, `allergen`, `ingredient_synonym`, `recipe_line_product`) **do not exist in any applied migration.**

**Therefore: all product diet/allergen/barcode storage is greenfield and lands in a new migration `0007` (§G below). Build order step 1 is that migration — nothing in the engine can be persisted until it exists.** This is the single biggest correction across the briefs.

Second standing reconciliation: live `product` stores nutrition **per its own `serving_size`/`serving_unit`** (0001 lines 66–80), and recipe nutrition is `product.nutrition × quantity / serving_size`. The design's §2a per-100g `food`⟂`product_package` split is **deferred to build-order step 6**. Until then, the engine writes per-serving into `product` using the **`serving_size=100, serving_unit='g'` convention** for any source that is natively per-100g (OFF `_100g`, FDC Foundation/SR). This keeps the existing compute formula correct and unit-clean.

---

## A. Data-source PRECEDENCE & merge rules

There are **two distinct orderings** — do not conflate them (this is a real conflict between the OFF/FDC briefs and the manufacturer/ranking briefs, resolved here):

### A1. LOOKUP order (which source to *call first*, by ingredient shape — cheap-first)
Route by what the ingredient **is**, not by a fixed source preference:

| Input shape | Call order |
|---|---|
| **Whole food / produce / generic** ("kale", "brown rice", "chicken breast, raw") | FDC `Foundation,SR Legacy` → OFF name search → Opus estimate |
| **Branded, named** ("Oatly Barista") | OFF name search → FDC Branded (enrich only) → manufacturer page → Opus gap-fill |
| **Scanned barcode (GTIN)** | OFF barcode → FDC Branded by `gtinUpc` → SmartLabel-by-GTIN (step 6) → Opus gap-fill |
| **New ingredient needs a generic `Default` product** | FDC `Foundation,SR Legacy` → OFF → Opus estimate |

### A2. TRUST order (which value *wins* when sources conflict — applied **per field**, not per product)
A product may take its ingredient list from one source and a missing fiber value from another. Higher rank wins; lower ranks fill gaps only.

| Rank | Source | When it wins |
|---|---|---|
| **1** | **GS1 SmartSearch / SmartLabel** (manufacturer, structured/GS1-conformant) | Deterministic manufacturer declaration = the physical label. Rare but authoritative. Outranks OFF on conflict. |
| **2** | **USDA FDC** (Foundation/SR Legacy) | Whole foods/produce. CC0 (cleanest license), lab-analytical, per-100g. **Not** for branded (frozen since 2023-11-16). |
| **3** | **Open Food Facts** | Primary by *volume* and barcode coverage; the source of diet/allergen tags. But crowd-sourced/noisy → fail-closed on unknowns. |
| **4** | **Manufacturer page — LLM-extracted** (HTML/PDF) | Authoritative content but adds a transcription/hallucination surface. Earns rank 4 (not 5) only because every number is `source_quote`-verified. |
| **5** | **LLM estimate (no source)** | Last resort — a `Default` product needs *some* number to compute a recipe. Always flagged `analysis_source='llm'`; never an allergen/safety claim. |

**Merge rules (concrete):**
1. **Per-field fill:** start from the highest-trust source that has the field; for each still-null field, descend the trust order. Record `analysis_source` as the source that supplied the *binding* nutrition (and a separate provenance note if diet/allergen came from elsewhere).
2. **Conflict beyond tolerance** (two sources disagree on a numeric field by > tolerance, default ±10% relative or the per-100g fingerprint mismatch of §2a): prefer the source with a verifiable provenance artifact (GS1 JSON-LD node, verified `source_quote`, FDC fdcId). If a SmartLabel/GS1 value (rank 1) conflicts with OFF (rank 3), **rank 1 wins**.
3. **Hard data-integrity conflict** (OFF and FDC name *entirely different products* for the same GTIN — "Cola" vs "Peanut Butter"): never silently pick. Emit `SOURCE_CONFLICT`, surface a one-tap "which is right?" to the user.
4. **Diet/allergen is computed ONCE, downstream, on the merged facts** (§E). The trust order decides *which facts* feed the classifier; it does not itself assert vegan/allergen status.
5. **Allergens are union-only** across sources and tiers — additive, never subtractive. Removal requires explicit human confirmation.
6. **Diet tags from OFF are `derived`, not `confirmed`** — even an explicit `en:vegan` is OFF-algorithm-derived from ingredient text, not human-verified. Reserve `confirmed` for in-app human confirmation or a certified label. (Resolves the OFF brief's internal hedge.)

---

## B. Edge-function API surface

Two functions, both Deno, both holding `ANTHROPIC_API_KEY` + `FDC_API_KEY` server-side, both writing resolved results into `product` to cache (cache-miss-only external calls). The RN client never calls OFF/FDC/Anthropic directly.

### B1. `lookup-product-barcode`
```
POST /functions/v1/lookup-product-barcode
body: { barcode: string, claimed_brand?: string, claimed_name?: string }
```
Flow: validate+normalize barcode (§D) → OFF barcode lookup (probe code variants) → on miss, FDC Branded by `gtinUpc` → run UPC validation/corroboration (§D5) → merge (§A2) → derive diet/allergen (§E) → upsert `product` → return.

### B2. `analyze-product`
```
POST /functions/v1/analyze-product
body: {
  ingredient_id?: uuid,          // to link/cache the resulting product
  mode: "name_search" | "resolve" | "manufacturer_url",
  query?: string,                // name search / ingredient head-noun
  category?: string,             // ingredient.category → routes A1
  brand_intent?: boolean,        // true → branded bias; false → whole-food bias
  url?: string                   // mode=manufacturer_url
}
```
Flow: route by `category`/`brand_intent` (§A1) → search the chosen source → re-rank candidates (§F) → derive diet/allergen for each kept candidate (§E) → return ranked list with per-candidate compliance tags.

### B3. Normalized JSON contract (BOTH endpoints return this `ProductCandidate` shape)
```jsonc
{
  "ok": true,
  "candidates": [
    {
      "barcode": "00030000064220",        // GTIN-14 canonical, or null
      "name": "Nutella Hazelnut Spread",
      "brand": "Ferrero",
      "size": "13 oz",                     // human label
      "net_weight_g": 368.5,               // null until known
      "serving_size": 37,                  // numeric, in serving_unit
      "serving_unit": "g",
      "servings_per_container": 10,        // null ok
      "nutrition": {                       // per the stated serving (NOT per-100g)
        "kcal": 200, "protein": 2, "carbs": 23,
        "fat": 11, "fiber": 1, "sodium": 15   // sodium in MG
      },
      "nutrition_per_100g": {              // always also returned (invariant; feeds §2a clustering)
        "kcal": 540, "protein": 5.4, "carbs": 62,
        "fat": 30, "fiber": 3, "sodium": 41
      },
      "ingredients_text": "Sugar, palm oil, hazelnuts...",
      "diet_level": 2,                     // 0..3 | null
      "diet_status": "derived",            // confirmed|derived|maybe|unknown
      "allergens": ["milk","tree_nuts","soybeans"],   // Big-9 keys
      "allergen_traces": [],
      "gluten_free": true,                 // true|false|null (tri-state)
      "analysis_source": "off",            // off|fdc_foundation|fdc_sr_legacy|fdc_branded|manufacturer|llm|unavailable
      "source_url": "https://world.openfoodfacts.org/product/3017620422003",
      "attribution": "Data © Open Food Facts contributors (ODbL)",
      "image_url": "https://...",          // LINK ONLY — never re-host
      "completeness": 0.7875,              // OFF 0..1, else computed (§F key 4)
      "barcode_validation": {              // present on barcode lookups (§D5)
        "ok": true, "confidence": 95, "class": "RETAIL_GLOBAL",
        "witnesses": 2, "brand_result": "MATCH", "flags": []
      },
      "rank_explain": { "compliance_class": 0, "match_strength": 0 }  // optional debug
    }
  ],
  "auto_suggest_index": 0,                  // index of the auto-pick, or null if none qualifies
  "error": null
}
```
Failure shape: `{ "ok": false, "candidates": [], "auto_suggest_index": null, "error": { "code": "RATE_LIMITED"|"NOT_FOUND"|"UPSTREAM_5XX"|"CHECK_DIGIT_FAIL"|..., "message": "..." } }`.

### B4. Endpoint reference (verified live params)
**OFF barcode:** `GET world.openfoodfacts.org/api/v2/product/{barcode}.json?fields={csv}` → `{status, status_verbose, product}`. `status:0` → fall to FDC.
**OFF name search (full-text):** `GET search.openfoodfacts.org/search?q={query} countries_tags:"en:united-states"&langs=en&page_size=25&fields={csv}` → `{ hits[], count, page, page_count }`. **Note `hits`, not `products`.** Lucene syntax; **omit `sort_by`** (relevance is the signal).
**OFF structured/popularity (tiebreaker only):** `GET world.openfoodfacts.org/api/v2/search?categories_tags_en=...&countries_tags_en=United States&states_tags_en=nutrition-facts-completed&sort_by=popularity_key&page_size=10` → `{ count, products[] }`. **Note `products`, not `hits`** — handle both shapes.
**FDC search:** `GET api.nal.usda.gov/fdc/v1/foods/search?query={q}&dataType=Foundation,SR%20Legacy&requireAllWords=true&pageSize=5&sortBy=dataType.keyword&sortOrder=asc` (header `X-Api-Key`) → `{totalHits, foods[]}`. Branded: `dataType=Branded`.
**FDC detail:** `GET /food/{fdcId}` or batch `GET /foods?fdcIds=a,b,c` (≤20).

**Required `fields` CSV for OFF:** `code,product_name,product_name_en,brands,quantity,product_quantity,categories_tags,countries_tags,nutriments,serving_size,serving_quantity,serving_quantity_unit,nutrition_data_per,ingredients_text,ingredients_text_en,allergens_tags,traces_tags,ingredients_analysis_tags,nutriscore_grade,completeness,image_front_url,lang`.

### B5. Rate limits & etiquette (mandatory, not optional)
- **OFF:** product reads **15/min/IP**, search **10/min/IP** — *shared across all users via the one Supabase egress IP*. → Cache every resolution in `product`; **server-side token-bucket** (≤12 product/min, ≤8 search/min); **debounce** name search to an explicit user action (never search-as-you-type); on bucket exhaustion return `RATE_LIMITED` not a retry-loop.
- **FDC:** registered data.gov key = **1000/hr** (DEMO_KEY is 30/hr/50-day — smoke tests only). Read `X-RateLimit-Remaining`; back off to OFF/Opus when low; treat `429` as "skip FDC now."
- **User-Agent on every OFF/manufacturer call:** `HarborMealPlanner/0.1 (spencerwright@gmail.com)`.
- **Bulk seed (step 6) uses the data dumps, never the API** — OFF JSONL/CSV dump + FDC Foundation/SR CSV (both small, CC0/ODbL, zero API calls).
- **Dev/experimentation → OFF staging** `world.openfoodfacts.net` (basic auth `off:off`); production reads → `.org`.

---

## C. Normalized product record fields (storage) + source mapping

Target table = `product` (live), extended by migration `0007` (§G). Per-field source mapping:

| `product` column | OFF source | FDC source | Manufacturer | Notes |
|---|---|---|---|---|
| `barcode` (NEW, GTIN-14) | `code` → normalize §D | Branded `gtinUpc` → normalize | `gtin*` JSON-LD | Canonical GTIN-14 left-padded |
| `brand` | `brands` (string on barcode API; **array** on Search-a-licious → `join(", ")`) | Branded `brandOwner`/`brandName` (cleaner) | `brand` JSON-LD | FDC preferred for brand cross-check |
| `size` | `quantity` | `householdServingFullText` | extracted | human label |
| `serving_size` (numeric) | `serving_quantity` (pre-parsed) → else parse `serving_size` string (§C2) | Branded `servingSize`; Foundation/SR → **100** | extracted | |
| `serving_unit` | `serving_quantity_unit` → else parse | Branded `servingSizeUnit`; Foundation/SR → **'g'** | extracted | |
| `kcal` | `energy-kcal_serving` → else `energy-kcal_100g × q/100` | Foundation `208` (per-100g, store at serving=100) | `nutrition.kcal` | use `energy-kcal_*`; if only kJ: `/4.184` |
| `protein` | `proteins_serving` → `_100g × q/100` | `203` | `protein_g` | grams |
| `carbs` | `carbohydrates_serving` → `_100g × q/100` | `205` | `carbs_g` | grams |
| `fat` | `fat_serving` → `_100g × q/100` | `204` | `fat_g` | grams |
| `fiber` | `fiber_serving` → `_100g × q/100` | `291` | `fiber_g` | grams |
| `sodium` (**mg**) | `sodium_serving×1000` → `_100g×q/100×1000`; if only salt: `sodium_g = salt_g/2.5` | `307` (already mg) | `sodium_mg` | **OFF sodium is grams → ×1000** |
| `ingredients_text` (NEW) | `ingredients_text`/`_en` (empty = missing) | Branded `ingredients` (ALL-CAPS string; often absent) | `ingredients_text` (verbatim) | |
| `diet_level` (NEW) | from `ingredients_analysis_tags` (§E Tier 1) | — (derive) | — (derive) | 0..3 \| null |
| `diet_status` (NEW) | derived (never `confirmed` from OFF tag) | derive | derive | confirmed\|derived\|maybe\|unknown |
| `allergens` (NEW) | `allergens_tags` → Big-9 (§E) ∪ ingredient scan | derive (scan) | `declared_allergens_text` + scan | union-only |
| `allergen_traces` (NEW) | `traces_tags` → Big-9 | — | — | |
| `gluten_free` (NEW) | `en:gluten` + ingredient scan | scan | scan | tri-state |
| `analysis_source` (NEW) | `'off'` | `'fdc_foundation'`/`'fdc_sr_legacy'`/`'fdc_branded'` | `'manufacturer'` | provenance |
| `net_weight_g` (NEW, optional) | `product_quantity` (grams) | — | `net_weight_g` | feeds §2a split |
| `note` | — | — | — | "per 100 g" flag when no serving |
| `image_url` (link only — **do NOT add a stored-image column**) | `image_front_url` | — | — | hotlink + attribute only |

**Nutrient-shape gotcha (FDC):** search flattens (`n.nutrientNumber`, `n.value`, `unitName` UPPERCASE) but detail nests (`n.nutrient.number`, `n.amount`, `unitName` lowercase). Normalizer must read `n.nutrientNumber ?? n.nutrient?.number` and `n.value ?? n.amount`, and uppercase `unitName` before comparing. Key on `nutrientNumber` (stable), never `nutrientId`.

### C2. `serving_size` string parsing (fallback only — prefer OFF's pre-parsed `serving_quantity`)
Live values are messy: `"1 serving (37 g)"`, `"30 g"`, `"2 cookies (28g)"`, `"1 cup (240 ml)"`.
- Regex-capture the **last** `(\d+(?:\.\d+)?)\s*(g|ml|oz|cl|l|kg)` group (the parenthetical metric weight is reliable; leading "1 serving"/"2 cookies" is a count, not mass).
- `ml`/`l` → store as volume; per-serving nutrition still correct because OFF `_serving` keys account for it.
- No numeric serving AND no `_serving` keys → fall to per-100g basis (`serving_size=100, serving_unit='g'`), set `note='per 100 g'` for the UI.

---

## D. UPC/GTIN validation algorithm (inline, implementable)

Pure functions in a shared Deno module → run client-side (instant reject before any network) and server-side (full corroboration). **Normalization is lossless** (leading zeros never change check digit or company prefix).

### D1. Canonical form
Strip non-digits. Valid lengths: 8, 12, 13, 14. **Left-pad to GTIN-14** (canonical store). EAN-13 (iOS returns UPC-A as EAN-13 + leading 0) and UPC-A both normalize uniformly.

### D2. Check digit (mod-10, all GTIN lengths)
```
computeCheckDigit(body):           // body = digits WITHOUT the check digit
  sum = 0
  for r in 0..len(body)-1:         // r=0 is the RIGHTMOST data digit
    d = body[len(body)-1-r]
    sum += d * (r % 2 == 0 ? 3 : 1)
  return (10 - (sum % 10)) % 10

validateGtin(full):                // full INCLUDES the check digit
  if not allDigits(full) or len(full) not in {8,12,13,14}: return false
  return computeCheckDigit(full[0..len-2]) == full[len-1]
```
(Verified: UPC-A `036000291452` → sum 58 → check 2 ✓.)

### D3. Indicator digit (GTIN-14 position 1)
`0` = base consumer unit; `1`–`8` = case/pack level; `9` = variable-measure. A non-0/non-9 indicator on something logged as a single retail item → soft flag `CASE_OR_PACK_LEVEL`.

### D4. Prefix class (read from EAN-13 = GTIN-14[1:]) — short-circuit non-food
Only `RETAIL_GLOBAL` is eligible for OFF/FDC cross-check. Map leading digits:

| EAN-13 leading | Class | Action |
|---|---|---|
| `001`–`019`, `030`–`039`, `050`–`139` (and `0000000`–`0000099` GTIN-8 space) | `RETAIL_GLOBAL` (GS1 US) | normal path (`030–039` = US Drug → also flag `NON_FOOD_DRUG`) |
| `020`–`029`, `040`–`049`, `200`–`299` | `RESTRICTED_INTERNAL` | store-local; **no global cross-check**, conf cap 25 |
| `977` | `NON_FOOD_PUBLICATION` (ISSN) | block |
| `978`–`979` | `NON_FOOD_PUBLICATION` (ISBN/ISMN) | block |
| `980` | `NON_PRODUCT` (refund receipt) | block |
| `981`–`984`, `99` | `COUPON` | block |
| `950`, `951`, `952` | `950` normal; `951` `NON_RETAIL` (EPC/RFID); `952` `TEST_CODE` | per class |

GS1 prefix → brand-owner lookup is **NOT runtime-viable** (GEPIR retired Dec-2023; Verified-by-GS1 free tier is web-only ≤30/day, no API). Prefix→owner is a manual escalation link only. Runtime brand check is **name-based** (D5).

### D5. Corroboration + confidence (the mismatch detector)
```
validateBarcode(scanned, claimedBrand?, claimedName?, off?, fdc?):
  digits = stripNonDigits(scanned)
  if len not in {8,12,13,14}:      return {ok:false, confidence:0, class:"INVALID", flags:["BAD_LENGTH"]}
  gtin14 = leftPad(digits,14,'0')
  if not validateGtin(digits):     return {ok:false, confidence:0, class:"INVALID", flags:["CHECK_DIGIT_FAIL"]}
  cls = classifyPrefix(gtin14[1:])
  if cls != "RETAIL_GLOBAL":       return {ok:false, confidence: cls=="RESTRICTED_INTERNAL"?25:10, class:cls, gtin14, flags:[cls]}

  flags = []
  if gtin14[0] not in {'0','9'}: flags += "CASE_OR_PACK_LEVEL"
  offN = off ? leftPad(stripNonDigits(off.code),14,'0') : null
  fdcN = fdc ? leftPad(stripNonDigits(fdc.gtinUpc),14,'0') : null
  witnesses = (offN==gtin14) + (fdcN==gtin14)
  if offN && offN!=gtin14: flags += "OFF_CODE_MISMATCH"
  if fdcN && fdcN!=gtin14: flags += "FDC_CODE_MISMATCH"
  if off && fdc && productsDisagree(off,fdc): flags += "SOURCE_CONFLICT"

  sourceBrand = fdc?.brandOwner || fdc?.brandName || off?.brands   // prefer FDC (cleaner)
  brandResult = "UNKNOWN"
  if claimedBrand && sourceBrand:
    r = fuzzyBrandMatch(norm(claimedBrand), norm(sourceBrand))      // 0..1; norm = lowercase, strip inc/llc/co, collapse ws
    brandResult = r>=0.85 ? "MATCH" : r>=0.55 ? "WEAK" : "MISMATCH"
    if brandResult=="MISMATCH": flags += "BRAND_MISMATCH"
    if brandResult=="WEAK":     flags += "BRAND_WEAK"

  conf = 50
  conf += witnesses==2 ? 30 : witnesses==1 ? 15 : 0
  conf += brandResult=="MATCH" ? 20 : brandResult=="WEAK" ? 5 : brandResult=="MISMATCH" ? -40 : 0
  if "SOURCE_CONFLICT" in flags: conf -= 30
  if "OFF_CODE_MISMATCH" in flags or "FDC_CODE_MISMATCH" in flags: conf -= 25
  if "CASE_OR_PACK_LEVEL" in flags: conf -= 5
  conf = clamp(conf,0,100)
  ok = conf>=70 and "BRAND_MISMATCH" not in flags and "SOURCE_CONFLICT" not in flags
  return {ok, confidence:conf, class:cls, gtin14, witnesses, brandResult, flags}
```
**UX bands:** ≥85 auto-accept · 70–84 accept + subtle "verify" · 40–69 ask user to confirm · <40 or any hard flag (`BRAND_MISMATCH`/`SOURCE_CONFLICT`/`CHECK_DIGIT_FAIL`) → block auto-fill, require manual confirm/override. Opus only adjudicates `BRAND_WEAK` and explains `SOURCE_CONFLICT` (screening, not guarantee).

**On-read variant probing (OFF stores one food under multiple un-padded codes):** if the GTIN-14 lookup 404s, retry OFF with `{raw}`, zero-stripped, and EAN-13 forms before falling to FDC.

---

## E. Diet/allergen derivation pipeline (fail-closed, 3-tier cascade)

Run once per **food/product** (not per package). The three tiers are a **per-axis fallback cascade**, not three passes — each axis (vegan, vegetarian, pescetarian, each Big-9 allergen, gluten) resolves at the highest tier that yields a confident answer. Per-axis verdict ∈ {`pass`,`fail`,`maybe`,`unknown`}; **`fail` is sticky** (one fail outranks any passes).

`diet_level` = highest hierarchy level **hard-passed** (`0 omni ⊃ 1 pesc ⊃ 2 veg ⊃ 3 vegan`): vegan pass→3, else veg pass→2, else pesc pass→1, else 0. **A `maybe`/`unknown` on the binding axis NEVER lets the food claim that level** — it caps lower and records uncertainty in `diet_status`.

`diet_status` = confidence of the **binding axis** (the one that set the level): `confirmed` (positive external assertion / certification only) > `derived` (our clean keyword pass, zero leftover tokens, no maybe) > `maybe` (any ambiguous term / `en:maybe-*` / Claude maybe) > `unknown` (no signal / leftover unrecognized tokens / Claude declined).

### Tier 1 — OFF tags
`ingredients_analysis_tags` (closed vocab, 3 axes):
- vegan: `en:vegan`→pass(→level 3) · `en:non-vegan`→fail · `en:maybe-vegan`→maybe · `en:vegan-status-unknown`→no signal (→Tier 2)
- vegetarian: parallel set (→level 2)
- `en:vegan` ⟹ also vegetarian. `en:non-vegetarian` ⟹ contains meat/fish → level ∈{0,1}; **OFF has no pescetarian axis** → pescetarian always falls to Tier 2/3.
- **All OFF diet verdicts → `diet_status='derived'`, never `confirmed`** (OFF tags are algorithm-derived).

Allergens: map `allergens_tags`→`allergens[]`, `traces_tags`→`allergen_traces[]` (table below). **Absence of a tag ≠ absence of allergen** — always ALSO run Tier 2 ingredient scan and union.

| OFF tag | Big-9 key | OFF tag | Big-9 key |
|---|---|---|---|
| `en:milk` | milk | `en:nuts` | tree_nuts |
| `en:eggs` | egg | `en:peanuts` | peanuts |
| `en:fish` | fish | `en:soybeans` | soybeans |
| `en:crustaceans` | crustacean_shellfish | `en:sesame-seeds` | sesame |
| `en:molluscs` | mollusc (EU-14, not Big-9 gate) | `en:gluten` | **drives `gluten_free=false`, NOT the wheat allergen** |

### Tier 2 — `food_term` keyword scan of `ingredients_text`
For any axis still `unknown`/`maybe`, and **always** for allergens (union) and pescetarian:
1. Lowercase, strip percentages/percent-parentheticals, split on `,;()[]`. **Keep sub-ingredients** (`lecithin (soy)` hides there).
2. Match against `food_term` with **longest-match-wins** ("soy lecithin" before "soy").
3. Per match: allergen→add key; `vegan=f` term→vegan fail; `vegetarian=f`→veg fail; `pescetarian_ok=f` (land meat)→pesc fail; `ambiguous=t`→that axis maybe.
4. **Leftover-token check:** unrecognized tokens not in the inert allowlist (water, salt, sugar, citric acid, spices…) → axis can't be a clean `derived` pass; at best `maybe` → trigger Tier 3.

`gluten_free` (restriction, distinct from wheat allergen): scan wheat+barley+rye+oats+spelt+malt+triticale+farro+kamut+brewer's-yeast. Any hit or `en:gluten`→`false`. Clean pass, no leftovers→`true`. Leftover/maybe→`null` (never true-on-doubt; `null` gates fail-closed like `false` but displays "unverified").

### Tier 3 — Claude Opus 4.8 gap-fill
Invoked only when a binding axis is `maybe`, there are leftover tokens, the product is FDC-only (no tags), or pescetarian is still `unknown`. Input: brand, name, `ingredients_text`, the Tier-1/2 partial verdict, and **the leftover/unrecognized tokens** (focus the model on the gap). Strict JSON output (`output_config.format` json_schema; cache the static system prompt + schema):
```json
{ "vegan":{"verdict":"pass|fail|maybe|unknown","reason":"..."},
  "vegetarian":{...}, "pescetarian":{...},
  "allergens":["milk",...], "allergen_traces":[...],
  "gluten_free":"true|false|unknown", "ambiguous_ingredients":["natural flavors",...] }
```
**Merge (fail-closed):** per axis take the **most restrictive** of {Tier-1/2, Claude}. Claude may resolve `unknown`→anything and tighten `maybe`→`fail`, but **cannot upgrade a hard `fail` to `pass`**. Allergens unioned (Claude adds, never removes). On Claude error/timeout/invalid-JSON: persist Tier-1/2 partial with unresolved axes at `unknown`/`maybe` — **never default-to-safe**.

### E-seed. `food_term` seed list (inline, ~95 terms)
Columns: `term` (lowercase match surface) · `canonical` · `allergen_key` (Big-9 key | null) · `vegan` · `vegetarian` · `pescetarian_ok` · `gluten` · `ambiguous`. `f`=false (disqualifying for that axis), `t`=true, null=says-nothing.

```
# MILK (allergen=milk; vegan f / veg t / pesc t)
milk·milk·milk·f·t·t·f·f | whole milk·milk·milk·f·t·t·f·f | skim milk·milk·milk·f·t·t·f·f
milk powder·milk·milk·f·t·t·f·f | nonfat dry milk·milk·milk·f·t·t·f·f | cream·milk·milk·f·t·t·f·f
butter·milk·milk·f·t·t·f·f | butterfat·milk·milk·f·t·t·f·f | whey·milk·milk·f·t·t·f·f
whey protein·milk·milk·f·t·t·f·f | casein·milk·milk·f·t·t·f·f | caseinate·milk·milk·f·t·t·f·f
sodium caseinate·milk·milk·f·t·t·f·f | lactose·milk·milk·f·t·t·f·f | ghee·milk·milk·f·t·t·f·f
cheese·milk·milk·f·t·t·f·f | yogurt·milk·milk·f·t·t·f·f
# EGG
egg·egg·egg·f·t·t·f·f | egg white·egg·egg·f·t·t·f·f | egg yolk·egg·egg·f·t·t·f·f
albumen·egg·egg·f·t·t·f·f | ovalbumin·egg·egg·f·t·t·f·f | mayonnaise·egg·egg·f·t·t·f·f
# FISH (pesc-OK, veg-fail)
fish·fish·fish·f·f·t·f·f | anchovy·fish·fish·f·f·t·f·f | anchovies·fish·fish·f·f·t·f·f
fish sauce·fish·fish·f·f·t·f·f | tuna·fish·fish·f·f·t·f·f | salmon·fish·fish·f·f·t·f·f
cod·fish·fish·f·f·t·f·f | sardine·fish·fish·f·f·t·f·f | fish gelatin·fish·fish·f·f·t·f·f
isinglass·fish·fish·f·f·t·f·f | worcestershire·fish·fish·f·f·t·f·t   # usually anchovy; some vegan
# CRUSTACEAN SHELLFISH (pesc-OK, veg-fail)
shrimp·crustacean_shellfish·crustacean_shellfish·f·f·t·f·f | prawn····f·f·t·f·f | crab····f·f·t·f·f
lobster·crustacean_shellfish·crustacean_shellfish·f·f·t·f·f | crawfish····f·f·t·f·f
# MOLLUSC (EU-14, allergen=null, pesc-OK veg-fail)
oyster·mollusc·null·f·f·t·f·f | clam·mollusc·null·f·f·t·f·f | mussel·mollusc·null·f·f·t·f·f
squid·mollusc·null·f·f·t·f·f | oyster sauce·mollusc·null·f·f·t·f·f
# TREE NUTS
almond·tree_nuts·tree_nuts·t·t·t·f·f | hazelnut····t·t·t·f·f | walnut····t·t·t·f·f
cashew·tree_nuts·tree_nuts·t·t·t·f·f | pecan····t·t·t·f·f | pistachio····t·t·t·f·f
macadamia·tree_nuts·tree_nuts·t·t·t·f·f | coconut·tree_nuts·tree_nuts·t·t·t·f·f   # FDA classes coconut as tree nut
# PEANUTS
peanut·peanuts·peanuts·t·t·t·f·f | peanut butter····t·t·t·f·f | groundnut····t·t·t·f·f
arachis oil·peanuts·peanuts·t·t·t·f·f
# WHEAT (allergen=wheat, also gluten)
wheat·wheat·wheat·t·t·t·t·f | wheat flour····t·t·t·t·f | semolina·wheat·wheat·t·t·t·t·f
durum·wheat·wheat·t·t·t·t·f | spelt·wheat·wheat·t·t·t·t·f | farro·wheat·wheat·t·t·t·t·f
vital wheat gluten·wheat·wheat·t·t·t·t·f | seitan·wheat·wheat·t·t·t·t·f
flour·wheat·wheat·t·t·t·t·t   # AMBIGUOUS: bare "flour" could be rice/almond → maybe, not hard claim
# SOYBEANS
soy·soybeans·soybeans·t·t·t·f·f | soybean····t·t·t·f·f | soy lecithin····t·t·t·f·f
soybean oil·soybeans·soybeans·t·t·t·f·f | tofu····t·t·t·f·f | edamame····t·t·t·f·f
soy protein·soybeans·soybeans·t·t·t·f·f
# SESAME
sesame·sesame·sesame·t·t·t·f·f | tahini·sesame·sesame·t·t·t·f·f | sesame oil····t·t·t·f·f
# GLUTEN CEREALS (restriction, allergen=null)
barley·barley·null·t·t·t·t·f | rye·rye·null·t·t·t·t·f | malt·malt·null·t·t·t·t·f
malt extract·malt·null·t·t·t·t·f | oats·oats·null·t·t·t·t·f   # gluten-restriction yes; allergen no
triticale·triticale·null·t·t·t·t·f | brewer's yeast·brewers_yeast·null·t·t·t·t·t  # often barley-derived
# HIDDEN NON-VEGAN/NON-VEG (allergen=null, diet-disqualifying)
gelatin·gelatin·null·f·f·t·f·f | gelatine·gelatin·null·f·f·t·f·f   # usually pork/beef → veg-fail
beef gelatin·gelatin·null·f·f·f·f·f   # land meat → pesc-fail
carmine·carmine·null·f·f·t·f·f | cochineal·carmine·null·f·f·t·f·f   # insect
rennet·rennet·null·f·t·t·f·t   # animal or microbial → ambiguous veg
shellac·shellac·null·f·t·t·f·f | confectioner's glaze·shellac·null·f·t·t·f·f
lard·lard·null·f·f·f·f·f | tallow·tallow·null·f·f·f·f·f | suet·suet·null·f·f·f·f·f
chicken·chicken·null·f·f·f·f·f | beef·beef·null·f·f·f·f·f | pork·pork·null·f·f·f·f·f
honey·honey·null·f·t·t·f·f | beeswax·beeswax·null·f·t·t·f·f   # vegan-fail, veg-OK
l-cysteine·l_cysteine·null·f·f·t·f·t   # often feathers/hair → maybe
mono- and diglycerides·mono_diglycerides·null·t·t·t·f·t   # ambiguous source
natural flavors·natural_flavors·null·t·t·t·f·t   # ambiguous source
vitamin d3·vitamin_d3·null·t·t·t·f·t   # lanolin (veg-OK) vs vegan-?
```
Seed as a **global** reference table (`household_id` null), select→`authenticated`, write→`service_role`. Note: `flour` is deliberately `ambiguous=true` so a bare "flour" yields `maybe`, while "almond flour"/"rice flour" (add as encountered) win by longest-match first. `coconut`→`tree_nuts` per FDA labeling.

---

## F. Auto-suggest RANKING algorithm

Input: an `ingredient` (`category`, `canonical_key`), each household member's `diet_level`+`allergies[]`+`restrictions[]`, and a candidate set (existing `product` rows for the ingredient + fresh OFF/FDC candidates with `analysis_source`).

### F1. Per-member compliance tag (computed first; drives the dominant sort key)
For product P, member M:
- **`disallowed`** — P violates an allergy in `M.allergies` (allergen present, or a trace if M treats traces as disqualifying — default yes for a true allergy), OR `P.diet_level < M.diet_level` with `diet_status ∈ {confirmed,derived}` (a *known* violation), OR a restriction fails knownly (`gluten_free` restriction & `P.gluten_free=false`).
- **`unverified`** — not knowingly disallowed but evidence is soft: `P.diet_status ∈ {maybe,unknown}` where M needs the unproven property, OR `P.gluten_free IS NULL` under a gluten restriction, OR an allergen axis is `unknown`. **Fail-closed: never `allowed` on unknown.**
- **`allowed`** — positively compliant: allergen-clean (known) AND `P.diet_level ≥ M.diet_level` with `diet_status ∈ {confirmed,derived}` AND restrictions satisfied with known-true values.

Household roll-up: `compliant_for_all` (every member allowed) ‹ `unverified_for_some` (none disallowed, ≥1 unverified) ‹ `disallowed_for_some` (≥1 disallowed).

### F2. Sort keys (lexicographic, first dominates)
1. **Household compliance class:** `compliant_for_all`(0) ‹ `unverified_for_some`(1) ‹ `disallowed_for_some`(2). Dominant key. Known-bad products are **returned** (for override/transparency) but sort last and are never auto-selected.
2. **Binding-axis diet confidence:** `confirmed`(0) ‹ `derived`(1) ‹ `maybe`(2) ‹ `unknown`(3).
3. **Source-appropriateness for the ingredient category:**
   - Whole-food/produce (`category ∈ {produce, grain-raw, legume,…}`, no brand intent): FDC Foundation(0) ‹ FDC SR Legacy(1) ‹ OFF(2) ‹ FDC Survey/FNDDS(3) ‹ FDC Branded(4).
   - Branded/packaged (brand intent, or `category ∈ {additive, sweetener, snack, sauce}`): OFF(0) ‹ FDC Branded(1) ‹ manufacturer(2) ‹ FDC Foundation/SR(3). OFF wins (carries ingredient list + diet/allergen tags).
4. **Completeness score** (higher wins): +2 `ingredients_text` non-empty; +2 full macros (kcal+protein+carbs+fat all non-null); +1 fiber; +1 sodium; +1 serving_size/unit; +1 barcode.
5. **Name/brand match strength** vs label/`canonical_key`: exact canonical(0) ‹ all tokens present(1) ‹ partial overlap(2) ‹ fuzzy-only(3). Penalize category drift ("almond milk" → "almond milk **chocolate**").
6. **Deterministic tie-break:** (a) existing household `product` row > fresh external candidate; (b) has `price` > no price; (c) more recent `created_at`/freshness; (d) lowest barcode/`id` lexicographically (so the auto-pick never flickers).

### F3. Auto-select rule
`auto_suggest_index` = rank-1 **iff** its class is `compliant_for_all` (or, for a single-trivial-diet household, `unverified_for_some` where the binding axis is only `unknown`, not a maybe-with-suspected-disqualifier). If rank-1 is `disallowed_for_some` → **no auto-select** (`auto_suggest_index=null`); present the list, require an explicit pick. Persist auto-pick as `product_selection.source='auto'` (re-derivable); user confirm/override → `source='manual'` (sticky).

For **Spencer (Omnivore L0) + Jacq (Vegan L3):** a shared product must be `diet_level=3, status∈{confirmed,derived}` and allergen-clean to be `compliant_for_all`. A vegetarian (L2) product is allowed for Spencer, disallowed for Jacq → class `disallowed_for_some` → not auto-selected for shared use; the §3 precedence then resolves Jacq's line to a vegan product via per-member `product_selection`/`recipe_line_product` without splitting the recipe.

---

## G. Additive SCHEMA still needed (migration `0007`) — reconciled to live migrations

**These are NOT in any applied migration** (correcting the briefs — 0005 only touched `recipe`/`recipe_line`; 0006 is `swap_meal`). Next number is **0007** (e.g. `20260620000007_product_analysis.sql`). All additive, no drops/retypes — existing seed/RLS keep working.

```sql
-- product: diet/allergen/ingredient/barcode (greenfield — none exist today)
alter table product
  add column ingredients_text text,
  add column diet_level   smallint check (diet_level between 0 and 3),
  add column diet_status  text check (diet_status in ('confirmed','derived','maybe','unknown')),
  add column allergens        text[] not null default '{}',
  add column allergen_traces  text[] not null default '{}',
  add column gluten_free   boolean,                  -- tri-state: true/false/null
  add column analysis_source text,                   -- off|fdc_foundation|fdc_sr_legacy|fdc_branded|manufacturer|llm|unavailable
  add column source_url    text,
  add column barcode       text,                     -- GTIN-14 canonical (until 0008 product_package split)
  add column net_weight_g  numeric;                  -- optional; feeds §2a clustering
create index product_barcode_idx on product (barcode);

-- member: diet level + allergies/restrictions (today: only `diet text`)
alter table member
  add column diet_level   smallint check (diet_level between 0 and 3),  -- backfill from diet: Omnivore=0,Pescetarian=1,Vegetarian=2,Vegan=3
  add column allergies    text[] not null default '{}',
  add column restrictions text[] not null default '{}';
update member set diet_level = case lower(diet)
  when 'vegan' then 3 when 'vegetarian' then 2 when 'pescetarian' then 1 else 0 end;

-- ingredient: category + canonical key (drives ranking §F key 3)
alter table ingredient
  add column category      text,   -- grain/dairy/meat/fish/produce/legume/oil/spice/sweetener/additive/other
  add column canonical_key text;   -- OFF-style 'en:flour'

-- product_selection: auto/manual stickiness + per-member resolution
alter table product_selection add column source text not null default 'auto'
  check (source in ('manual','auto','import'));
alter table product_selection add column member_id uuid references member(id) on delete cascade;
alter table product_selection drop constraint product_selection_pkey;
alter table product_selection add primary key (household_id, ingredient_id, member_id);
-- one household-default per (hh, ingredient) when member_id is null:
create unique index product_selection_hh_default_idx
  on product_selection (household_id, ingredient_id) where member_id is null;

-- Big-9 reference (global)
create table allergen (key text primary key, label text not null, scheme text not null default 'fda_big9', position int);

-- food_term keyword dictionary (global; seed §E-seed)
create table food_term (
  term text primary key, canonical text not null,
  allergen_key text references allergen(key),
  vegan boolean, vegetarian boolean, pescetarian_ok boolean,
  gluten boolean not null default false, ambiguous boolean not null default false
);

-- learned dedup cache + per-line override (household-scoped)
create table ingredient_synonym (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references household(id) on delete cascade,   -- null = global seed
  surface text not null, ingredient_id uuid not null references ingredient(id) on delete cascade,
  source text, confidence numeric, created_at timestamptz not null default now()
);
create table recipe_line_product (
  recipe_line_id uuid not null references recipe_line(id) on delete cascade,
  member_id uuid references member(id) on delete cascade,         -- null = recipe-wide
  product_id uuid not null references product(id) on delete cascade,
  primary key (recipe_line_id, member_id)
);
```
**RLS/grants (follow the live 0002/0003/0004 pattern):**
- `allergen`, `food_term`, and **global** `ingredient_synonym` rows (`household_id null`): enable RLS, `select` policy `using(true)` to `authenticated`, writes via `service_role` (already covered by `grant all … to service_role` default privileges). These are reference tables.
- `ingredient_synonym` (household rows) and `recipe_line_product`: scope via parent `household_id` exactly like `product`/`recipe_line` do today (the `exists(... current_household_id())` child pattern). `recipe_line_product` scopes via `recipe_line → recipe.household_id`.
- New tables inherit `authenticated`/`service_role` grants via the 0003/0004 default privileges, but **add explicit RLS `enable` + policies** (default-privilege grants don't create policies).

**Deferred to a later migration (0008, build step 6) — NOT in 0007:** the `food`⟂`product_package` split (§2a). Until then `product` carries the optional primary `barcode` and per-serving nutrition; the `barcode` column moves to `product_package` then, and the UPC validator runs at SKU-creation time. Optionally add `barcode_class text`, `barcode_confidence smallint`, `barcode_flags text[]`, `barcode_verified_at timestamptz` to `product_package` in 0008 to persist the §D verdict.

---

## H. BUILD ORDER (concrete, reconciled to the live build-order in §6)

1. **Migration `0007`** (§G) — all product/member/ingredient/product_selection columns + `allergen`/`food_term`/`ingredient_synonym`/`recipe_line_product` tables + RLS/grants. Seed `allergen` (Big-9) and `food_term` (§E-seed). Backfill `member.diet_level` from `diet`. **Blocks everything — do first.** (Correction: the briefs assumed this existed; it does not.)
2. **Shared Deno module** `gtin.ts` — `validateGtin`/`computeCheckDigit`/`classifyPrefix`/`leftPad14`/`normBrand` (§D). Pure, runs client + server. Wire the client-side check-digit + prefix-class reject into the `expo-camera` scan path (instant, pre-network).
3. **`lookup-product-barcode` Edge Function** (§B1) — OFF barcode (+variant probing) → FDC Branded by `gtinUpc` → UPC corroboration (§D5) → merge (§A2) → diet/allergen (§E, Tiers 1–2, Opus Tier 3 on gaps) → upsert `product`. Token-bucket + cache. Secrets: `FDC_API_KEY` (registered data.gov key), `ANTHROPIC_API_KEY`.
4. **`analyze-product` Edge Function** (§B2) — category-routed lookup (§A1), OFF Search-a-licious + FDC Foundation/SR, candidate re-rank (§F), per-member compliance tags. This unlocks diet/allergen + auto-suggest everywhere (matches §6 step 2).
5. **Diet/allergen tier implementation** shared by both functions (§E) — `food_term` scan + Opus gap-fill with the strict-JSON contract and fail-closed merge. (Folded into 3/4; called out so the classifier has one home.)
6. **Ingredient resolution + product-picker UI** (the learning loop, §6 step 4) — ranking (§F) feeds the picker; auto-pick → `product_selection.source='auto'`, confirm → `'manual'`.
7. **Manufacturer fallback module** inside `analyze-product` (§A2 rank 4) — fetch (polite UA, honor robots, no JS render in v1) → GS1-JSON-LD parse → readable-HTML/PDF reduce → Claude Haiku `output_config.format` extraction (strict, `source_quote`-verified, drop unverifiable numbers) → `analysis_source='manufacturer'` → existing diet/allergen tiers. Fires only on OFF+FDC miss. (Manufacturer brief.)
8. **Bulk seed** (§6 step 6) — OFF JSONL dump + FDC Foundation/SR CSV loaded **offline** (never the API). Seeds generic `Default` products and the ~60 seed products' diet/allergen.
9. **Migration `0008` + barcode scan** (§6 step 6) — `food`⟂`product_package` split (§2a clustering), `barcode` moves to `product_package`, per-100g nutrition on `food`, persist §D verdict columns, SmartLabel-by-GTIN path (step 7's manufacturer module, now GTIN-addressable).

---

## I. Conflicts between briefs — resolved explicitly

1. **"Columns added in migration 0005" (OFF, FDC, UPC, manufacturer briefs) vs. reality.** RESOLVED: false — 0005 touched only `recipe`/`recipe_line`. All product/member/ingredient diet-allergen-barcode storage is greenfield in new migration **0007** (§G). The ranking+diet brief is the only one that got this right ("not yet in any migration… migration 0007+").
2. **GTIN canonical form: OFF brief says "GTIN-14"; UPC brief notes OFF actually normalizes to 13/8 and FDC stores 12.** RESOLVED: canonical **storage** = GTIN-14 (left-pad). But **outbound lookup keys must match each source** — query OFF with raw/13/EAN-13 variants on a 404 (§D5 probing), and exact-match FDC `gtinUpc` after normalizing both sides to 14. The conflict is only apparent: store 14, probe variants on read.
3. **OFF diet tag confidence: OFF brief's table once labels `en:vegan` as `confirmed`, then its own note says use `derived`.** RESOLVED in favor of **`derived`** — OFF tags are algorithm-derived, not human-verified. `confirmed` is reserved for in-app human confirmation or a certified label (consistent with the ranking+diet brief's `diet_status` discipline).
4. **TRUST vs LOOKUP order (manufacturer brief ranks SmartLabel #1, FDC #2, OFF #3; FDC/OFF briefs run lookup OFF→FDC).** RESOLVED: these are two different orderings (§A1 lookup, §A2 trust). Lookup is cheap-first by ingredient shape; trust resolves *conflicts* per field. A SmartLabel/GS1 value (trust rank 1) outranks OFF (rank 3) only when reconciling conflicting values — it does not change that OFF/FDC are called first.
5. **Nutrition basis: per-serving (live `product`) vs per-100g (design §2a).** RESOLVED: write per-serving into live `product` now; for natively-per-100g sources use the `serving_size=100, serving_unit='g'` bridge. Per-100g `food` identity is deferred to migration 0008 (build step 9). The API still returns `nutrition_per_100g` always (feeds §2a clustering and survives the future split).
6. **`en:gluten` ↦ wheat allergen?** RESOLVED: NO. `en:gluten` drives `gluten_free=false` (a restriction), not the `wheat` Big-9 allergen. `en:nuts`=tree_nuts, `en:peanuts` separate. (All four briefs that touched this now agree; codified in §E.)
7. **FDC Branded as a branded source?** RESOLVED: enrichment/cross-ref only — it's frozen since 2023-11-16. OFF is canonical for branded. FDC is primary for whole foods/produce (Foundation/SR Legacy).

---

**Files this spec builds on (absolute):**
- `C:\Users\spenc\projects\personal_health\docs\recipe-and-product-sourcing.md` (§2/§2a/§3/§5 — validated; §5 columns confirmed *not yet migrated*)
- `C:\Users\spenc\projects\personal_health\supabase\migrations\20260619000001_init_schema.sql` (live `product`/`member`/`ingredient`/`product_selection` shape §G extends)
- `C:\Users\spenc\projects\personal_health\supabase\migrations\20260619000005_recipe_import.sql` (touched only `recipe`/`recipe_line` — the correction in §0/§I.1)
- `C:\Users\spenc\projects\personal_health\supabase\migrations\20260619000002_rls.sql` / `20260619000003_grants.sql` / `20260619000004_service_role_grants.sql` (RLS/grant pattern §G follows)
- `C:\Users\spenc\projects\personal_health\supabase\migrations\20260620000006_swap_meal_fn.sql` (confirms next migration number is 0007)