# Licensed Cookbook Marketplace — Viability, Economics & Go-to-Market

**A focused briefing for Harbor's founder.**

> **Not legal or financial advice.** This synthesizes business and IP research from public sources to inform a business-model decision. Every specific licensing rate in this space is a confidential, negotiated number — where a figure is unknowable, this report says so rather than inventing one. Before you paper a single license or ship the preview feature, have a media/IP attorney review the template license and the preview spec, and re-confirm Apple's current rules.

---

## VERDICT

**The model is viable, with one large caveat and one strong wedge.**

- **Viable, and de-risked on the law and the tech.** There is a direct, operating proof-of-concept — **ckbk** — that licenses ~900 real cookbooks and digitizes them into exactly the structured, shopping-list-/nutrition-ready format Harbor proposes. Publishers *will* license for this use. The legal line (facts/ingredient lists are free; prose/headnotes/photos need a license; bulk commercial redistribution needs a license regardless) is well-established. Harbor's structured-recipe + nutrition + planner engine is the hard technical part, and **you are already building it.**
- **The caveat: the *per-book unlock* storefront has no clean precedent, and the market keeps avoiding cookbook licensing.** ckbk is all-you-can-eat **subscription**, not buy-to-unlock. Every scaled "recipe app" that *could* have licensed cookbooks (Yummly tried and abandoned it; Samsung Food, SideChef, Cookpad, Mealime all chose aggregation/UGC/AI instead) walked away — a signal that licensing economics are hard at consumer price points. Your residual after the platform cut and a rights-holder share is thin (worked below: ~43% of gross *before* your own costs).
- **The wedge: indie authors + a public-domain seed corpus.** You do not need Big-5 deals to start. As of Jan 1 2026, every US cookbook published in 1930 or earlier is public domain (a 10,000+ title corpus on the Internet Archive alone), and indie/self-published authors own their own app/adaptation rights and can deal with you directly.

**Smartest first move:** Do **not** build a marketplace, an author portal, or sign a license yet. Build the structured-recipe engine you're already committed to, and **seed it with public-domain cookbooks** to prove the digitization-to-macro-aware-planning pipeline end to end. That single step (a) makes any future marketplace non-empty, (b) powers the macro-preview conversion hook with zero rights risk, (c) validates demand for "what would this book do for my macros," and (d) costs you nothing in licensing. Treat the paid marketplace as a *later* layer that turns on once the engine and the demand are real. The rest of this briefing is about what that layer looks like and why now is not the time to pour concrete on it.

---

## 1. Precedent — who already does this, and what Harbor can emulate

**ckbk (ckbk.com) is your single closest precedent — study it most.** It is a live subscription service branded "Spotify/Netflix for cookbooks." Confirmed specifics:

- **900+ cookbooks, 160,000+ recipes**, digitized into **structured data** — structured ingredient lists for shopping-cart integration and nutrition calculations, searchable by ingredient/diet. A co-founder described structuring "the ingredient list for integration with shopping carts, or nutrition calculations" — that is almost verbatim Harbor's value proposition.
- **Licensed from ~60 publishers** (confirmed names include Simon & Schuster, Houghton Mifflin Harcourt, Workman, Rodale, Barron's, Columbia University Press, Wiley) **plus ~100 individual authors/estates** (Marcella Hazan, MFK Fisher, Tyler Florence, Rose Levy Beranbaum). They called the rights work a "clearance rights morass" requiring "extensive detective work on a book-by-book basis."
- Pricing: **$4.99/month**, 14-day trial, free tier of 3 recipes/month.

**The single most important lesson from ckbk:** the rights clearance is the hard part, not the technology. Roughly 60 publisher deals + 100 separate author/estate deals took years. Harbor must license at *both* the publisher level and (for many titles) the individual author/estate level. Budget BD as your dominant cost and timeline driver, not engineering.

**The deal-shape caveat:** ckbk pays publishers a **proportionate share of subscription revenue** (Spotify-style usage payout), *not* per-recipe or per-title flat fees. The actual percentage is not public. This maps cleanly onto an all-you-can-eat tier — but **not** onto Harbor's "buy this specific book to unlock it" storefront. For a per-book-purchase model, the natural analog is an app-store-style split (the author/publisher gets X% of each book's sale price), which **Harbor will have to propose, not copy** — there is no posted precedent rate.

**Adjacent precedents worth knowing:**

| Service | What it does | What Harbor takes from it |
|---|---|---|
| **Eat Your Books** | *Indexes* cookbooks — recipe titles + ingredient lists, fully searchable — but hosts **no** full recipe text (you must own the book). Integrates with ckbk to hand off to licensed full text. Free ~5 books, then ~$2.50/mo. | **The legal-safe "no-license" layer.** Ingredient lists are uncopyrightable facts; EYB publishes them without any license, then links out for the protected full text. This is the exact template for Harbor's "preview the macros, then unlock the book" hook — and a viable MVP fallback that needs *zero* licenses. |
| **Epicurious / Bon Appétit (Condé Nast)** | 50,000+ recipes behind a freemium gate (~3 free/mo, then **$4.99/mo or ~$40/yr**). Mostly content Condé Nast *owns*, though it does carry some licensed third-party content (HarperCollins). | A validated **price band** for paid structured recipe access and proof the "few free, then pay" gate works for recipes. Weaker as a *licensing-economics* precedent because Condé Nast largely owns its content. |
| **Yummly, Samsung Food/Whisk, SideChef, Cookpad, Mealime** | Aggregate web/blog recipes, run UGC, or generate AI/original recipes. None license published cookbooks. Yummly *explored* licensing from ~25 publishers around 2010 (pay-per-recipe/subscription/ad models) but **abandoned it**. | **The cautionary signal.** Almost no scaled app pays to license and digitize published cookbooks. That is white space (opportunity, premium positioning, publisher goodwill) *and* a warning that the market has repeatedly chosen aggregation/UGC/AI over licensing. |

**What Harbor can emulate from ckbk:** the product shape (license → digitize into structured, plannable recipes), the dual publisher-and-author licensing track, and the streaming-style rev-share *if* you offer an all-you-can-eat tier. **What Harbor must invent:** the per-book-unlock split, since no one posts it.

---

## 2. The economics & the margin stack (with the Apple/Google cut)

Two cuts come off the top of every unlock before you and the rights holder split anything: **the platform (Apple/Google) cut**, then **the rights-holder share**. Then your own costs (Claude API digitization, nutrition compute, storage, support).

### The platform cut is mandatory and unavoidable in-app

Selling a cookbook "unlock" that reveals/activates recipes *inside the iOS app* is digital content/functionality, which squarely triggers **Apple's In-App Purchase rule (Guideline 3.1.1)**. The guideline explicitly bars apps from using their own mechanisms — license keys, codes, your own Stripe checkout — to unlock content. So:

- You **cannot** bypass Apple with your own in-app checkout. IAP (plus a working "restore purchases") is required.
- **Harbor's likely rate is 15%, not 30%.** The standard commission is 30%, reduced to **15% under the App Store Small Business Program** for developers under $1M/yr in proceeds. At Harbor's scale you almost certainly qualify. (Note: a rumored "25% US standard rate" is **false** — that 25% reduction is China-mainland-only, effective March 2026.)
- **Google Play** is comparable: historically 30%, **15% on the first $1M/yr** and 15% for subscriptions. Google's 2026 model is mid-rollout and genuinely in flux (a decoupled ~5% billing fee + a service fee that the verifier pegs at ~20% for new-install IAP, higher for existing installs, 10% for subscriptions, US/UK/EEA from June 30 2026). **Treat the precise 2026 Google sub-rates as unsettled**; the 15%-on-first-$1M baseline is the safe planning number.

### The external-link path is real but NOT a durable margin assumption

Post–*Epic v. Apple*, US App Store apps may include in-app buttons/links to your *own web checkout* with **no special entitlement** ("entitlements are not required... in their United States storefront apps"). So Harbor *can* route US buyers to web checkout. **But:**

- You must **still** offer IAP in-app; both coexist.
- The commission Apple may charge on those external links is **currently 0% only because it's legally unsettled.** On Dec 11 2025 the Ninth Circuit held Apple should be able to collect a "reasonable" fee and remanded to set it; Apple's earlier 27% attempt was rejected; Apple cannot charge until a court approves a fee. (SCOTUS subsequently declined to stay the underlying ruling.)
- Link-out conversion is typically far lower than one-tap native IAP.

**Bottom line: model the marketplace on the ~15% IAP path. Treat any external-link savings as upside, not baseline.** A future court-set "reasonable" fee could erase the advantage.

A note on the "Reader app" carve-out (Guideline 3.1.3(a), for apps displaying *previously purchased* books/magazines/music): **Harbor does not cleanly fit.** Harbor doesn't passively display a book the user already owns — it ingests recipes and generates new functionality (macro computation, scaling, planning, shopping lists). Banking on reader-app status to dodge IAP is a rejection risk.

### Worked example — a $9.99 unlock, US, Harbor under $1M/yr

| Step | At 15% (Small Business Program) | At 30% (if you exceed $1M/yr) |
|---|---|---|
| List price | $9.99 | $9.99 |
| − Platform cut | − $1.50 (15%) | − $3.00 (30%) |
| = Net to split | **$8.49** | **$6.99** |
| − Rights-holder share (50%, *illustrative*) | − $4.25 | − $3.50 |
| = **Harbor gross** | **~$4.25** (~43% of list) | **~$3.50** (~35% of list) |
| − Harbor's own COGS | Claude API digitization (mostly one-time per title, amortized over expected unlocks), nutrition compute, storage, support, payment edge cases | same |

**Read this honestly:** at 15% platform + a 50% rights-holder share, Harbor keeps ~43% of the gross price *before* its own costs. The Claude-API cost to digitize a book into Harbor's structured/macro format is a real per-title expense that must be spread across however many unlocks that title actually sells — and **how many unlocks per title you can expect is the single biggest unknown** in the whole model.

**The 50% rights-holder share is an illustrative placeholder, not a quoted term.** The actual split is negotiated per title and confidential.

**Crucial financial-hygiene correction:** **Delete the "$35–250 per recipe per year" figure** from any model. It is real, but it traces to *one food blogger's* (Jason Logsdon's) freelance rate card for licensing *his own* recipes to brands ("200 recipes with photos for $5,000"). It is **not** a cookbook-publisher or app-platform benchmark. Likewise, standard cookbook print/ebook norms (≈10%→15% hardcover royalties, ~25% of net for ebooks, modest mid-level advances ~$10k–$17.5k) **inform negotiation but don't transfer** — a structured-data + app-feature license is a different product. The only publicly-evidenced model is **revenue share**, and the real rates are not publicly knowable. Model a rev-share % of sale price; assume you negotiate it title-by-title.

**Margin levers, if/when you build this:** higher-priced unlock SKUs or bundles; a Harbor *subscription* wrapper (drops to 15% on iOS after year one); pushing repeat US buyers to web checkout *if* external-link fees stay low; and negotiating sub-50% shares for lower-demand titles.

---

## 3. The differentiated value — static book → interactive, macro-aware

This is the genuinely defensible part, and it's the same engine you're already building. A printed (or PDF/ebook) cookbook is static: fixed servings, no nutrition math, no planning. Harbor's transformation makes each licensed recipe:

- **Scalable** — adjust servings; nutrition recomputes exactly (Harbor already stores nutrition per the product's own serving and computes scaled nutrition at plan time — it does not pre-scale).
- **Macro-aware** — compute calories/protein/carbs/fat from ingredient facts and compare against *the user's* targets (run-day vs rest-day), via Harbor's existing `target` model and per-product nutrition.
- **Plannable** — drop into the meal plan (`moment` / `moment_assignment`), per person, shared or separate.
- **Shoppable** — auto-generated, store-grouped, deduped shopping list.

The verified market confirms this transformation is a *real, established licensing category*, not a fantasy: **People Inc. (Dotdash Meredith)** sells a "Recipes as a Service" API — structured data, 175+ tags, dietitian-developed meal plans, grocery integrations (Instacart, Walmart, Shipt), caching/search permitted — explicitly for apps and meal plans. **Recipy** brokers structured recipe licensing with creators retaining ownership and removal rights. These both (a) prove counterparties to deal with exist, and (b) give you a scope benchmark for your own license grant. Pricing on both is quote-based ("contact sales") — you can't benchmark exact rates publicly, you negotiate.

**Strategic implication:** Harbor's edge is not "we have cookbooks" (ckbk has 900). It's "we make any cookbook fit *your* body and *your* week." That's the conversion hook, and it's the reason a per-book unlock could plausibly justify higher lifetime value than a flat subscription — *if* demand exists. Pressure-test that early.

---

## 4. Go-to-market wedge (indie authors + public-domain seed + chicken-and-egg)

Two-sided marketplaces overwhelmingly solve cold-start by **getting the harder side (supply) first via manual, non-scalable, concentrated tactics** — the verified canon (NFX/Reforge: "get the hardest side first, then the easy side is 2–10x easier"; Zappos hand-fulfilled orders; Uber subsidized drivers first; Substack underwrote a small set of anchor writers with a $20M guarantee fund in Jan 2025). For Harbor, supply = rights-cleared, digitized cookbooks. The sequence:

**Step 1 — Seed the shelves with free, legal content first (do this now).**
Digitize a curated set of **public-domain cookbooks** so the app is never empty and the macro-preview hook has something to demo. As of Jan 1 2026 the US cutoff is **1930 and earlier** (95-year term; the old "pre-1923/1924" shorthand is outdated and advances one year annually). Sources, all confirmed:
- **Internet Archive** — 10,000+ historic cookbooks (Cookbooks and Home Economics collection), page scans.
- **Project Gutenberg** — cleaned text transcriptions (Cookbooks & Cooking bookshelf), easiest to parse (Fannie Farmer, Mrs. Beeton, Lydia Maria Child).
- **HathiTrust**, Google Books, Library of Congress "Community Cookbooks."
- For 1930–1963 US works, copyright had to be *renewed* — non-renewed titles are also PD, checkable in the **Stanford Copyright Renewal Database**.

Plus a screened layer of **truly commercial-usable** Creative Commons content. **Important license corrections from verification:**
- **Foodista is CC BY** (attribution-only) — usable commercially with attribution. ✅
- **Make Better Food is CC BY-NC-SA (NonCommercial)** — **drop it**; the NC clause bars use in a paid app. ❌ (It appeared on an earlier "free seed" list in error.)
- **Wikibooks Cookbook is CC BY-SA** — usable but ShareAlike forces downstream terms; handle with care.
- **Open Food Facts** — the structured *data* is **ODbL** (not CC BY-SA); CC BY-SA 3.0 covers only its photos. (Harbor already uses Open Food Facts for product data, so this is a known quantity — just don't mis-cite the license.)

**Caveats on PD:** only the *original edition/text* is public domain — modern reprints, translations, and added prose/photos can carry fresh copyright. Verify each title's edition and renewal status individually, and store the basis-for-PD per title as an audit trail.

**Step 2 — Hand-recruit 3–8 anchor indie authors, concierge-style.**
Indie/self-published authors **own all their subsidiary rights** — print, ebook, audio, foreign, *and* app/digital adaptation — so they can license to Harbor directly with **no publisher gatekeeper.** Target authors whose audiences match Harbor's niche (macro/high-protein/meal-prep). Do it the Airbnb/Substack way: digitize their book *for* them, for free, and let their existing followings pull your first paying users. To beat their Amazon KDP alternative, offer a comparable-or-better creator share (think 50–70% of net) *plus* the exposure of a curated macro-aware app. (KDP precision: the 70% rate applies only to ebooks priced **$2.99–$9.99**, less a per-MB delivery fee; below $2.99 and above $9.99 it's 35% — so "70%" is a band, not a floor.)

**Step 3 — Launch narrow.** Pick *one* niche for categorical density (e.g., high-protein home cooking) rather than a broad catalog.

**Step 4 — Only after you have users + revenue proof,** approach Big-5 publishers and/or a turnkey aggregator (People Inc.'s Recipe API) to scale the catalog. Real user demand is your leverage with gatekept supply. **This is exactly the Yummly cautionary tale in reverse:** Yummly went to ~25 publishers *first*, with no proven demand, and the deals never became its business.

---

## 5. SAFE FEATURE SPEC — buy-to-unlock + the macro-preview teaser

The whole model rests on one crisp line: **you may freely show the *uncopyrightable facts* of a not-yet-purchased book; you must keep the *protected expression* locked until purchase.** The legal anchors are solid and verified — *Feist* (facts aren't copyrightable; "sweat of the brow" rejected), US Copyright Office Circular 33 (a "mere listing of ingredients... or a simple set of directions, is uncopyrightable"), and *Publications International v. Meredith* / *Tomaydo-Tomahhdo v. Vozary* (individual recipes are functional, uncopyrightable directions; a cookbook's compilation copyright doesn't reach the individual recipes).

### ✅ What the preview (LOCKED book) MAY show — facts or Harbor's own computations, no license needed

- **Dish/recipe names** (titles).
- **Counts and categories** — "8 dinners, 3 breakfasts."
- **Per-recipe and aggregate computed nutrition/macros** — calories, protein/carbs/fat — that *Harbor derives* from ingredient facts via its own nutrition engine. (Harbor already computes nutrition from ingredient lines + per-product labels; USDA FoodData Central is public-domain US-government data and a clean basis.)
- **Fit-to-target aggregates** — the conversion hook itself: "8 dinners averaging 40g protein that fit your run-day calorie target."
- **Servings/scaling math.**
- Optionally, a **facts-only highlight** of macro-driving ingredients — but **not** the author's full written ingredient list reproduced verbatim where it carries expressive selection/arrangement.

Frame all of it as **Harbor's own analysis, attributed by book** ("Harbor's macro analysis of *[Book]*"). This is the Eat Your Books pattern, which has published exactly this kind of fact layer for years without licenses.

### ❌ What MUST stay locked until purchase — protected expression

- The **verbatim recipe step text / method** as the author wrote it.
- **Headnotes, stories, tips, narrative prose.**
- **Every photograph and illustration.**
- The author's **distinctive ingredient-list phrasing/annotations** and any substantial prose excerpt.

**The bulk-redistribution rule (the one that catches people):** even though any *single* bare recipe's copyright is thin-to-zero, do **not** mass-display protected step text across many recipes for un-bought books. And — critically — **you still need a license to *ship* the digitized full recipes of a copyrighted book**, even reproducing "just the steps," because (a) you're reproducing the author's actual expressive step-writing in bulk and (b) bulk commercial redistribution of a publisher's catalog is precisely what licensing exists to cover, regardless of the thin copyright in any one recipe. *Recipes-aren't-copyrightable* is **not** a license substitute.

### The sanctioned exception: free sample recipes

Releasing **1–3 full sample recipes per book** as marketing is an **industry norm** (Amazon/Google "Look Inside," promo recipes, samplers) that authors *expect* as a sales driver. **Negotiate the right to feature 1–3 designated full sample recipes per licensed book into the deal** — it directly powers the conversion funnel and authors will generally welcome it.

### Build-vs-legal guardrails

- **Compute nutrition independently** from ingredient facts. Bare numbers are facts, but don't lift a book's *formatted* nutrition table verbatim if it's presented with original expression.
- **Screen every CC/PD license programmatically** — store the license per item; block NonCommercial content from paid unlock; honor attribution and ShareAlike; record basis-for-PD and edition for PD titles.
- **Architect for IAP** — digital unlock = Apple IAP; model the rights-holder share *after* the platform cut; enroll in the Small Business Program early.
- **Put an IP-warranty + indemnity in every author deal** so rights risk sits with the rights holder.
- Have an IP attorney paper the **first template license** and **sign off on this preview spec** before launch.

### Minimal first license (indie author) — one-page term sheet

Non-exclusive · US-only · 1–2 year term, terminable by author on 30–60 days' notice (mirror Recipy's "remove anytime" trust signal) · grant = the right to (a) digitize the book's recipes into Harbor's structured/scalable/macro-aware format, (b) reproduce ingredient lists + functional steps, (c) reproduce protected prose/headnotes/photos *for paying unlockers* · rev-share = creator-favorable % of **net** (after the platform cut), benchmarked to beat KDP · include 1–3 free sample recipes for marketing · author warrants ownership and indemnifies Harbor. **Default to non-exclusive** to keep advances and risk low; reserve exclusivity for marquee titles only after demand is proven. **Scrutinize MFN ("most-favored-nation") clauses** — common in entertainment/music licensing, they can force a generous early-author share retroactively across your whole catalog and silently compress margin. Avoid them or scope them narrowly.

---

## 6. Risks & open questions

**Risks:**
- **Per-book-unlock is an unproven model.** No app does buy-to-unlock for cookbooks; ckbk and Epicurious are subscriptions. The consumer market has *repeatedly* chosen subscription/aggregation/UGC/AI over cookbook licensing (Yummly abandoned it). Pressure-test demand for paid licensed packs early — with PD-seeded packs + a couple of author-direct titles — before investing in marketplace machinery.
- **Thin, cost-sensitive margin.** ~43% of gross before COGS at the illustrative 50% split; the Claude-digitization cost per title only pays back if a title sells enough unlocks.
- **Rights clearance is the dominant cost/timeline,** not engineering (ckbk's "clearance rights morass," dual publisher-and-author track, years to assemble).
- **MFN clauses** can retroactively compress catalog margin.
- **Platform-rule flux:** the external-link fee is unsettled (post-Dec 2025 remand); Google's 2026 rates are mid-rollout. Don't hard-code either as a margin assumption.

**Open questions (genuinely unknowable from public sources — would require direct BD or counsel):**
1. What split will cookbook publishers/authors actually demand for a *per-book-unlock* (vs. subscription) model? No public precedent exists.
2. What is ckbk's actual revenue-share percentage/formula? Not disclosed.
3. Do publishers consider Harbor's "structured, scalable, macro-aware" transformation a **derivative work** needing broader rights than ckbk's reproduction license (does auto-scaling or computing nutrition implicate *adaptation* rights)? Needs IP counsel beyond the verified ingredient-list/steps-are-facts baseline.
4. Will marquee rights holders require **recoupable advances**, or is pure rev-share acceptable?
5. What "reasonable" external-link fee will the court ultimately set, and what are Google's finalized 2026 rates?
6. **How many unlocks per title can Harbor realistically expect** — the number that determines whether the digitization COGS ever amortizes?
7. For each PD/CC seed title: exact license + edition status (original vs. modern reprint/translation with fresh copyright)? Verify per title.

---

## 7. What this changes about what we build NOW

**Almost nothing — and that is the most important finding in this briefing.**

The marketplace is a *distribution and rights* layer on top of an engine you're already building. The structured-recipe spine (`recipe` → `ingredient` line → `product` with per-serving nutrition), plan-time scaling, the macro/target model, the `moment`/`moment_assignment` planner, and the auto-generated shopping list are **identical** whether a recipe came from your girlfriend's head, a URL import, a cookbook photo, a public-domain scan, or a licensed pack. ckbk's entire value prop *is* this engine; you're building the same thing for a household of two. **Do not pivot, do not pause Module 1, do not build a marketplace.** Keep shipping M1–M3 exactly as planned.

What *is* worth doing now is a handful of **cheap, forward-compatible hooks** — small additive schema/architecture choices that cost almost nothing today and save a painful migration later. These also dovetail with the commercialization research already in `docs/commercialization-and-legal.md` (facts-in / expression-out, charge-for-software-over-private-content), which this briefing reinforces rather than contradicts:

1. **Per-recipe license/source provenance.** Add a nullable `source` / `license` concept to the recipe record: where it came from (manual / URL / photo / public-domain / licensed-pack), the rights basis (PD-pre-1931 / CC-BY / licensed / user-clipped-private), attribution string, and edition/renewal note for PD titles. You already need provenance for the URL/photo importers and for CC attribution; making it a first-class, queryable field now means you can *prove* the rights basis of every recipe later and programmatically gate what's shareable vs. private. This is the audit trail the legal guardrails require.

2. **An entitlement / "owned packs" concept.** Introduce a lightweight notion of a **content pack** (a set of recipes) and a per-household/per-user **entitlement** ("this household owns Pack X"). In M1 it's trivial — everything is one implicitly-owned pack. But modeling "recipes belong to packs, users have entitlements to packs" *now* means the day you sell an unlock, the unlock is just "grant entitlement to Pack X," and IAP/restore-purchases slots in cleanly. Retrofitting entitlements after a flat recipe catalog ships is the kind of migration that hurts.

3. **A facts-vs-expression split in the recipe schema** (you largely have this already). Harbor already separates the *factual* layer (ingredient lines: ingredient + quantity + unit; computed nutrition) from where prose would live (`recipe.note`, step text). Keep that split clean and explicit, because it's exactly the line between "showable in a locked-book preview" (facts/macros) and "locked until purchase" (prose/steps/photos). The macro-preview teaser is then a *view* over the facts you already store — no new engine, just a query that returns names + computed macros + fit-to-target for recipes the user hasn't unlocked.

4. **(Optional, near-free) Seed with public-domain cookbooks as part of M1/M2.5.** Your plan already calls for a seed catalog and a photo/URL importer. Pointing that importer at a few **pre-1931 public-domain cookbooks** (Project Gutenberg text is trivially parseable) gives you a richer, zero-rights-risk seed corpus, exercises the digitization pipeline on real third-party books, and — for free — stands up a working demo of the macro-preview hook you'd later monetize. It's the cheapest possible validation of the entire marketplace thesis.

**Net:** the structured-recipe + nutrition + planner engine is the moat *and* the product, and it's already on your roadmap. Add provenance, an entitlement/packs seam, and (optionally) a public-domain seed. Then keep building Harbor for the household of two — and let the marketplace prove itself on top of an engine that already works.
