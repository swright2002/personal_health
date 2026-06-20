# Recipe & Product Sourcing — Design

How Harbor gets **many recipes in fast**, maps each abstract ingredient to the
**specific product the household actually uses** (learning the choice so you
pick once), and pulls **nutrition + ingredient lists** so we can check
**allergens and diets**. This expands `PLAN.md` §5 and §2a; it's the design for
**M2.5 (import)** and the foundation the meal-module schema must support.

> Sourced from a 2026 research pass (4 agents). Key external facts and their
> sources are cited inline so we can re-verify before implementing.

---

## The three hard problems

1. **Volume** — we need a lot of recipes (websites + cookbook photos), not the 8 hand-seeded ones.
2. **Abstract → concrete** — a recipe says "½ cup flour"; *which* product (white / wheat / rice; which brand → different nutrition + allergens)? Learn it once, reuse forever, override when needed.
3. **Product truth** — get each product's nutrition label **and full ingredient list**, so we can flag allergens (gluten, etc.) and diet fit (vegan / vegetarian / pescetarian) per household member.

---

## 1. Getting recipes in

### 1a. From a URL  *(loveandlemons.com, ohsheglows.com, recipe blogs)*

Food blogs almost universally embed **schema.org/Recipe JSON-LD** (WordPress recipe-card plugins like WP Recipe Maker / Tasty Recipes emit it automatically for Google rich results). Confirmed live on loveandlemons.com (`recipeIngredient`, `recipeInstructions`, `recipeYield`, `image`, `nutrition` all present). So structured data is the happy path; the LLM is only a fallback.

**Pipeline** — one Supabase Edge Function (Deno/TS):
1. Receive **one user-pasted URL per explicit action** (no crawling). Normalize away `/print-recipe/` variants → canonical post URL.
2. Fetch with a realistic, identifying `User-Agent` + short timeout. Handle non-200 gracefully — **ohsheglows returns 403 to bots**, so fail to a "paste it manually" path.
3. **Deterministic parse:** collect all `<script type="application/ld+json">`, unwrap `@graph`, find the node whose `@type` includes `Recipe`. Normalize the multi-type fields (`recipeYield` string|int|array, `image` string|array|ImageObject, `recipeInstructions` string|HowToStep[]|HowToSection).
4. **LLM fallback (only if JSON-LD missing/partial):** strip page → markdown (~1–3k tokens), call **Claude Haiku 4.5** with `output_config.format` JSON schema (nullable quantity/unit; per-line `source_quote` we verify is a substring; "never guess"). Batch API for bulk.
5. **Parse ingredient lines** with `parse-ingredient` (JS/Deno, MIT) → `{quantity, quantity2, unit, name, comment, isGroupHeader}`.
6. **Hero image:** capture the source image **URL** (JSON-LD `image` → `og:image`) for attribution/linking, but **do not re-host source recipe photos** — they're separately copyrighted and re-hosting is the single clearest commercial-infringement risk ([legal briefing](commercialization-and-legal.md) R2). Link to the source, or use a user-captured / generated image, or none.
7. Persist Recipe + recipe_line; defer product matching to step 2.

**Cost:** ~$0.008/recipe when the LLM fallback fires; $0 on the JSON-LD happy path.
**Legal — "facts in, expression out"** (keeps the commercial door open; see [`commercialization-and-legal.md`](commercialization-and-legal.md)): ingredient lists, quantities, times, yield, nutrition are **uncopyrightable facts** → store freely; **regenerate cooking steps** in our own words; **drop headnotes/narrative** at ingest; **never re-host source photos**; import on explicit user action into the **private** household collection (never a public corpus); keep **provenance** (source URL + method + timestamp). Honor robots.txt; identifiable User-Agent; one user-initiated fetch at a time.

### 1b. From a photo  *(cookbook pages)*

Send the photo **straight to Claude Opus 4.8 vision** → structured recipe JSON. **No separate OCR step** — Opus reads clean printed text at the top tier and does the *structuring* (splitting lines into qty/unit/name) that raw OCR can't.

**Pipeline:**
1. **Expo capture** with a document/edge-detection camera (encourage flat, overhead, good light).
2. **On device:** transcode **HEIC→JPEG** (iPhones shoot HEIC; the API rejects it), deskew / perspective-correct, crop to page, resize **long edge ≤ 2576px** (Opus's native vision resolution), JPEG q≈85. Upload to Supabase Storage.
3. **Edge Function** → Anthropic Messages API: `model: claude-opus-4-8`, **image before text**, `output_config.format` JSON schema. System prompt = "transcribe only what's printed; if illegible set null + confidence `low`; never guess a number; margin notes → `notes`, not steps." Cache the system prompt + schema.
4. Persist as a **draft (`status: needs_review`)**; the app shows it with low-confidence fields highlighted for the user to confirm. **Never auto-save.**

Multi-page recipe = multiple images in one request ("these are pages of the same recipe"). **Cost:** ~$0.02–0.05/photo. OCR cross-check (Google Vision/Textract) is a *future* option only if quantity accuracy proves problematic — better to invest in capture/preprocessing first.

### 1c. Seed + manual editor
Keep the manual recipe editor (PLAN §5.1) as the always-there baseline, and the prototype seed for day-one content. Import (1a/1b) is the volume play.

### 1d. Attribution & sharing rules (keep it commercial-safe)

The legal posture ([`commercialization-and-legal.md`](commercialization-and-legal.md)) reduces to a few mechanical rules:

- **Web sources — link back, never embed.** Store the factual recipe + the source URL; show "From _\<site\>_ →" that **opens the page in the browser**. Do **not** iframe/embed the page or hotlink its images, and never store its photos or headnote prose. The link is *protective* (anti-substitution + good faith), not an admission.
- **Cookbooks you own — private extraction only.** Photographing a book *you own* and extracting the **facts** (ingredients, quantities, steps-as-procedure) into your **private household** collection is personal use — **no publisher approval needed for the facts**. Owning the book covers your *access* (first-sale doctrine), not a right to *redistribute*. Two cautions vs. web: there's no public source to link back to, and cookbook recipes carry more protected expression (the _Barbour v. Head_ "infused with commentary" fact-question) — so the facts-only discipline matters more. **Sharing cookbook recipes into a corpus other households/users can browse would need a publisher license** — keep them private to the household.
- **Product data — attribution required.** Open Food Facts (ODbL) **must** be attributed + linked; USDA FDC (CC0) credited as a courtesy.
- **The line that keeps all of this safe:** _facts in, expression out_; a **private** per-household collection; **never a public redistribution corpus** without licenses.

---

## 2. Product data — nutrition, ingredients, allergens, diet

We need three things **per product**: per-serving nutrition, the **full ingredient list**, and **diet classification**. Ranked sources:

| Source | Nutrition | Ingredient list | Allergens | Diet flags | Barcode | US coverage | Cost | License (storage) |
|---|---|---|---|---|---|---|---|---|
| **Open Food Facts** (primary) | ✅ | ✅ `ingredients_text` | ✅ `allergens_tags` | ✅ vegan/veg analysis | ✅ (key) | ~923K US (~50% have ingredients) | Free, no key | ODbL — **storage OK**, attribution required |
| **USDA FoodData Central** Branded (fallback) | ✅ | ✅ `ingredients` | ❌ derive | ❌ derive | via UPC query | ~455K branded | Free (1k/hr) | **CC0** — cleanest |
| Nutritionix (optional) | ✅ | ✅ sparse | sparse | ❌ | ✅ ~92% | best US | free dev / ~$1,850/mo | attribution; paid to store |
| **Spoonacular / Edamam** | — | — | — | — | — | — | — | ❌ **ToS forbids a stored product DB** — do not use as canonical source |
| Kroger/Walmart/Target/Instacart APIs | ❌ | ❌ | ❌ | ❌ | catalog | — | — | no nutrition/ingredient data to indie devs |

**Strategy:** seed our `product` table from the **OFF bulk dump** + **FDC Branded**, both storable and complementary; at scan/runtime resolve **OFF → FDC → (optional Nutritionix)** on cache-miss. Barcode is the join key — scan with `expo-camera`, **normalize to GTIN-14** (iOS returns UPC-A as EAN-13 + leading 0; FDC pads to 14). Send OFF a custom `User-Agent`. Attribute OFF in the UI; lean on CC0 FDC where we want zero friction; **be cautious re-hosting product photos** (OFF's license doesn't cover package trademark/artwork) — use the *data*, show photos sparingly.

**Deriving diet + allergen** (three tiers, fail-closed):
1. **Trust OFF tags** when present and confident (`en:vegan`, `allergens_tags`).
2. **Parse the ingredient text** for the FDA **Big 9** (milk, egg, fish, crustacean shellfish, tree nuts, peanuts, wheat, soybeans, **sesame**) via a keyword/`food_term` dictionary (casein→milk, semolina→wheat…).
3. **Claude Opus 4.8 classifies the gaps** — when OFF is `unknown`/`maybe`, when the product came from FDC (no diet flags), or to compute **pescetarian**. Opus catches hidden non-vegan items keyword lists miss (gelatin, carmine, rennet, isinglass, shellac, L-cysteine). Output strict JSON; surface genuinely ambiguous items (mono/diglycerides, "natural flavors", enzymes) as **`maybe`, never a hard claim**. LLM = screening, not a safety guarantee.

### 2a. One food, many barcodes (package/size variants)

**The problem** (MyFitnessPal's well-known wart, raised by Spencer): a single Snickers bar, a fun-size Snickers, and a box of Snickers each carry a **distinct GTIN**, but they're the **same food** — identical nutrition *per 100 g* and identical ingredient/allergen/diet profile. They differ only in **net weight, serving size, and multipack count**. A barcode scanner that treats every barcode as its own product gives you three "Snickers" entries with subtly different per-serving numbers, no clean history, and a fragile join for `product_selection` learning. We want: **scan any of the three → one nutritional truth → prefill the right *amount*.**

**Model: split nutritional identity from the scannable package.**
- **`food`** — the nutritional identity: nutrition **per 100 g** (the invariant), ingredient list, `diet_level`/allergens, brand + canonical name. This is what `recipe_line` resolves to and what `product_selection` (§3) learns. Size-independent.
- **`product_package` (SKU)** — the scannable unit: `barcode` (GTIN-14), `net_weight_g`, `serving_size_g`, `servings_per_container`, `package_label` ("fun size" / "king size" / "12-ct box"). **Many packages → one `food`.**

**Scan flow:** barcode → SKU → its `food` supplies nutrition; the SKU's `serving_size_g`/`net_weight_g` **prefills the quantity** ("1 bar" = one serving, or "whole box" = `net_weight_g`). Unknown barcode → look up OFF/FDC, create the SKU, and **cluster it onto an existing `food`** when the nutrition-per-100 g + ingredient fingerprint match; otherwise mint a new `food`.

**Clustering is the crux** — and it's the *same dedup machinery as ingredients* (§3): OFF stores each barcode as its own product, so a box vs. a single bar are separate OFF rows that usually share `nutriments` per 100 g, `ingredients_text`, and brand. Merge `food`s by **(brand, normalized name, per-100 g nutrition within tolerance, ingredient fingerprint)**; **Opus adjudicates ambiguous merges**. Bias **conservative** — a wrong merge corrupts nutrition for every linked SKU, so when unsure keep distinct `food`s and offer the user a one-tap "these are the same" merge. (Diet/allergen is computed once on the `food`, not per SKU.)

**Migration implication:** today's `product` table *conflates* food + package (it carries `barcode`, per-serving nutrition, **and** `serving_size`). The clean split — `food` (nutrition/diet/allergen) ⟂ `product_package` (barcode/size) — can wait until barcode scan lands (build-order step 6); until then `product` = one food with an optional primary barcode. **Flag for 0006+: introduce `product_package` rather than piling additional `barcode` values onto `product`.**

---

## 3. Abstract ingredient → preferred product (learned)

`product_selection(household_id, ingredient_id, product_id)` already gives a **household-wide learned default** — choose once, reuse. We extend it for per-recipe and per-member overrides, and add provenance.

**Resolution precedence** (most specific wins) for a given (recipe_line, member):
1. `recipe_line_product` (line, member) — "for *this* recipe, flour = rice flour, for Jacq"
2. `recipe_line_product` (line, null) — recipe-wide override
3. `product_selection` (ingredient, member) — this member's learned default
4. `product_selection` (ingredient, null) — household learned default
5. `product.is_default` — generic recipe-book fallback

So: pick once at level 3/4 → auto-applies; override per recipe at 1/2; and two members can resolve the **same ingredient to different products** (you = wheat flour, Jacq = rice flour) without splitting the recipe — the shopping list buys both because it walks each member's resolved product.

**Ingredient resolution / dedup** ("AP flour" == "all-purpose flour"): normalize → exact match in `ingredient_synonym` (household, then global seed) → fuzzy/embedding (pgvector) → **Claude maps to an existing ingredient or proposes a new canonical one** → **write the resolution back to `ingredient_synonym`** (this is the learning). New ingredients get a `Default` product whose nutrition comes from USDA FDC (or an LLM estimate as fallback).

**First-time choice is filtered + ranked, not a raw list:** for an ingredient's candidate products, tag each per member as `allowed` / `disallowed(reason)` / `unverified`, rank products allowed-for-all first, and **pre-select the top compliant one** (gluten-allergic household → "flour" defaults to a rice-flour product). The user confirms once; we store it `source='manual'` (sticky). Auto-defaults are `source='auto'` (freely re-derivable).

---

## 4. Diet & allergen model

- **Allergens:** adopt the **FDA Big 9** as the baseline enum, designed so **EU-14** rows (gluten cereals, celery, mustard, lupin, sulphites, molluscs) slot in later without a schema change.
- **Gluten ≠ wheat:** model `gluten_free` as a **dietary restriction** (scans wheat+barley+rye+oats+spelt+malt), separate from the `wheat` allergen — so a celiac member is protected beyond wheat.
- **Diet hierarchy is containment:** `0 omnivore ⊃ 1 pescetarian ⊃ 2 vegetarian ⊃ 3 vegan`. A member with level `D` may eat a product iff `product.diet_level ≥ D`.
- **Fail-closed (OFF's model):** any disqualifying ingredient → `no`; any unknown/`maybe` ingredient → `maybe`/`unverified`; only all-known-compliant → safe. **Never assert "vegan/safe" on an unrecognized ingredient.**
- **Multi-member:** a shared meal's product is "allowed" only if it passes for **every participating member**; otherwise tag per member ("OK for Spencer, contains dairy for Jacq"). Irreconcilable cases resolve to per-member products (precedence levels 1/3).

---

## 5. Schema changes — migration `20260619000005` (all additive)

No existing column is dropped/retyped; the current seed + RLS keep working.

**New columns**
- `ingredient`: `canonical_key text` (OFF-style `en:flour`), `category text` (grain/dairy/meat/fish/produce/legume/oil/spice/sweetener/additive/other).
- `product`: `ingredients_text text`, `diet_level smallint` (0–3, null=unknown), `diet_status text` (confirmed/derived/maybe/unknown), `allergens text[]`, `allergen_traces text[]`, `gluten_free boolean`, `analysis_source text`, `barcode text` (GTIN-14).
- `member`: `diet_level smallint` (backfill from `diet`), `allergies text[]`, `restrictions text[]`.
- `recipe`: `source_type text` (`manual` | `url_import` | `photo_import` | `seed`; `licensed_pack` reserved), `source_url text` (link-back for URL imports), `source_attribution text` (site name, or "From _\<Book\>_, p.NN" for cookbook photos). Everything stays **`household`-private**; this provenance keeps a future licensed catalog forward-compatible without a rewrite — see [`commercialization-and-legal.md`](commercialization-and-legal.md).
- `product_selection`: `source text` (manual/auto/import), `member_id uuid null`. PK becomes `(household_id, ingredient_id, member_id)` + a partial unique index `where member_id is null` (one household default). Existing rows → household defaults automatically.

**New tables**
- `allergen(key, label, scheme, position)` — FDA Big 9 seed, EU-14-extensible.
- `food_term(term, canonical, allergen_key, vegan, vegetarian, gluten)` — keyword dictionary driving the scans; seeded from OFF `allergens.txt` + `ingredients_analysis.txt`.
- `ingredient_synonym(household_id null, surface, ingredient_id, source, confidence)` — the learned dedup cache.
- `recipe_line_product(recipe_line_id, member_id null, product_id)` — per-recipe-line override.

**RLS/grants:** `allergen` + global `food_term`/seed synonyms are read-only reference (select to `authenticated`, writes to service_role); `ingredient_synonym` / `recipe_line_product` scope via parent `household_id` like `product`/`recipe_line` today.

**New Edge Functions:** `import-recipe-url`, `import-recipe-image`, `resolve-ingredient`, `analyze-product` (+ `lookup-product-barcode`). All hold the Anthropic key server-side.

---

## 6. Cost & build order

**Cost** (2 users, modest volume): URL import ~$0.008/recipe (often $0), photo import ~$0.02–0.05, product analysis a few ¢ only on gaps. Batch API halves bulk imports. Effectively a few dollars to seed hundreds of recipes.

**Build order (proposed):**
1. **Migration 0005** + seed the `allergen` table and a starter `food_term` slice; backfill `member.diet_level`, `product` diet/allergen for the ~60 seed products.
2. **`analyze-product`** Edge Function (OFF/FDC + Opus gap-fill) — unlocks diet/allergen everywhere.
3. **`import-recipe-url`** (JSON-LD + Haiku fallback) — the volume win for Jacq's blog recipes.
4. **Ingredient resolution + product picker UI** (the learning loop) — wired into the Recipe-detail screen (M2).
5. **`import-recipe-image`** (Opus vision) — cookbook photos.
6. **Barcode scan** + OFF bulk-dump seed — and the **`food` ⟂ `product_package` split** (§2a) so size variants collapse to one nutritional identity.

---

## 7. Open product decisions

- **Recipe & product photos — don't re-host source images.** Recipe photos and OFF package photos are copyrighted/trademarked; for commercial-readiness, **link** to the source (with attribution) or use generated/user-captured imagery — never persist source photos. *(changed per the [legal briefing](commercialization-and-legal.md); was "re-host hero")*
- **Embedding match (pgvector):** start with exact + synonym + LLM; add pgvector fuzzy matching only if dedup misses pile up. *(default: defer)*
- **Allergen scheme:** ship FDA Big 9 now, EU-14 later. *(default: Big 9)*
- **How aggressively to auto-default vs. always-ask** for product choice on import — lean auto-default-to-compliant, one-tap confirm. *(default: auto + confirm)*
- **Package-variant clustering threshold** (§2a) — how tight the per-100 g + ingredient match must be before two barcodes auto-merge to one `food`. Bias conservative (false-merge corrupts nutrition); user-confirmable merge for the gray zone. *(default: conservative auto-merge + manual merge affordance)*
