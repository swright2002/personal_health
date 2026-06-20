# Harbor — Commercialization & Legal-Risk Briefing

> **⚠️ NOT LEGAL ADVICE.** This document is a synthesis of researched-and-verified legal and commercial information prepared to inform business and product-risk decisions for Harbor. It is **not legal advice**, does not create an attorney-client relationship, and is not a substitute for a licensed attorney reviewing your actual product, contracts, and data pipeline. Laws change and apply differently to specific facts. Treat every "must"/"should" below as a research-backed recommendation to *raise with counsel*, not a legal conclusion you can rely on. A short "Get a real lawyer for…" list appears at the end.

---

## BOTTOM LINE

**Yes — Harbor can plausibly be sold commercially in the US, and its core design is already the industry-standard, litigation-tested pattern.** The single safest path is to position Harbor as a **neutral software tool that charges for features** (planning, AI coach, scaling, sync, household sharing, allergen/diet flagging) layered on top of **user-supplied / user-clipped content**, while running a strict **"facts in, expression out"** ingestion pipeline: store ingredient lists, quantities, times, yields, and nutrition (all uncopyrightable facts under *Feist* and *Publications Int'l v. Meredith*), regenerate cooking steps in Harbor's own words, and **never re-host source recipe photos or headnote prose**. Recipes import on explicit per-user action into a **private** household collection (never a public, all-users searchable corpus), which keeps Harbor on the safe side of copyright redistribution, web-scraping/ToS law, and Apple's aggregator rules. The two areas that actually escalate as you scale are **(1) allergen/diet mislabeling causing personal injury** — where disclaimers help but cannot fully bar a negligence claim, so you also need label-verification framing and insurance — and **(2) health-data privacy** (Washington's My Health My Data Act with its private right of action, CCPA/CPRA sensitive-data rules, the FTC Health Breach Notification Rule, and FTC Section 5). None of these are blockers; all are manageable with the postures below. Get counsel on the ODbL "derivative database" question, the allergen-liability/disclaimer enforceability, and the privacy-consent architecture before commercial launch.

**Overall research reliability:** All six tracks were independently verified as **high reliability** — every case citation checked is real, correctly named, and accurately held; no fabricated case law was found. The handful of corrections (flagged inline below) are narrow and do not change any bottom-line conclusion.

---

## Decisions locked in now (initial design)

We are **not** building the cookbook marketplace yet — but these choices keep that door open at near-zero cost, and the build reflects them:

1. **Every user-imported recipe lives in the private household database** — manual entry, URL clips, and **cookbook photos** alike. Nothing a user imports enters a shared/public/marketplace catalog. A photo a user takes of a cookbook *they own* is **their own private recipe** (personal use of their own copy) — no license needed, never redistributed.
2. **Online sources are cited.** URL imports store the source URL and link back to it (opens externally); facts only, never re-hosting photos or prose. Open Food Facts data is attributed (license-required).
3. **Recipes carry a `source_type` + attribution from day one** (`manual` / `url_import` / `photo_import` / `seed`, with `licensed_pack` reserved). Everything is `household`-private today; a future licensed catalog slots in without a rewrite. *(Schema: [`recipe-and-product-sourcing.md`](recipe-and-product-sourcing.md) §5.)*
4. **The licensed cookbook marketplace is deferred.** Today, the only way a book's recipes enter Harbor is a user **privately photographing their own copy**. Putting cookbook recipes into a *shared, sellable* catalog later requires the full **licensing process** (publisher/author deals) — that license is the legal unlock. A "you own the print book → discounted digital unlock" bundle is a deal to negotiate *with* the publisher, not a right we can grant.

---

## 1. Recipe & Cookbook Copyright

**Reliability: HIGH.** Every cited case was verified verbatim against primary sources. Two narrow attribution corrections and one ODbL-scope overstatement (carried into §4) are noted.

### What the law actually protects

US copyright law is strongly favorable to a recipe app. The split is clean:

| Element | Protected? | Authority |
|---|---|---|
| Ingredient list (names, quantities, proportions) | **No** — statement of facts | *Publications Int'l v. Meredith*; Circular 33 |
| Functional cooking steps (mix, bake at 350°F…) | **No** — excluded "procedure, process, [or] system" | 17 U.S.C. §102(b); *Meredith* |
| Times, yield, temperatures, nutrition | **No** — facts | *Feist* |
| Headnote / narrative prose, personal stories, "why this works" | **Yes** — literary expression (thin copyright in the exact wording) | *Meredith*; *Barbour v. Head* |
| Recipe photographs | **Yes** — fully copyrightable pictorial works | Circular 33 |
| A cookbook's selection/arrangement of recipes | **Thin** compilation copyright only (not the individual recipes) | *Feist*; *Meredith*; *Tomaydo-Tomahhdo* |

**The controlling authority** is *Publications International, Ltd. v. Meredith Corp.*, 88 F.3d 473 (7th Cir. 1996), which held the recipes "describe a procedure by which the reader may produce many dishes… As such, they are excluded from copyright protection as either a 'procedure, process, [or] system'" and "the identification of ingredients necessary for the preparation of each dish is a statement of facts. There is no expressive element in each listing." The court **vacated** the preliminary injunction. ([opinion PDF](https://cyber.harvard.edu/people/tfisher/IP/1996Publications.pdf); [17 U.S.C. §102](https://www.law.cornell.edu/uscode/text/17/102))

This is corroborated, not an outlier:
- *Lambing v. Godiva Chocolatier*, 142 F.3d 434 (6th Cir. 1998) — same rule (an **unpublished table decision**, so limited precedential weight; the holding is independently confirmed by the *Tomaydo* opinion's citation to it). ([opinion](http://www.opn.ca6.uscourts.gov/opinions.pdf/15a0705n-06.pdf))
- *Tomaydo-Tomahhdo, LLC v. Vozary*, 629 F. App'x 658 (6th Cir. 2015) — most recent appellate confirmation; "the list of ingredients is merely a factual statement," instructions are "statutorily excluded," and a compilation claim fails absent proof of copied selection/arrangement. ([opinion PDF](http://www.opn.ca6.uscourts.gov/opinions.pdf/15a0705n-06.pdf))
- *Feist Publications, Inc. v. Rural Tel. Serv. Co.*, 499 U.S. 340 (1991) — facts are never original; "sweat of the brow" rejected; compilation copyright is "limited to the particular selection or arrangement." ([opinion](https://supreme.justia.com/cases/federal/us/499/340/))
- US Copyright Office **Circular 33**: "A mere listing of ingredients or contents, or a simple set of directions, is uncopyrightable." ([Circular 33 PDF](https://www.copyright.gov/circs/circ33.pdf)) *(Verifier correction: the often-quoted "substantial literary expression… collection of recipes as in a cookbook" phrasing is from the Copyright Office's online [FAQ](https://www.copyright.gov/help/faq/faq-protect.html), not Circular 33's recipe section. Both sources support the point.)*

### The limiting case (Harbor's risk boundary)

*Barbour v. Head*, 178 F. Supp. 2d 758 (S.D. Tex. 2001) is the case a plaintiff would cite. On summary judgment the court **refused** to hold cookbook recipes uncopyrightable as a matter of law, finding a genuine fact issue over whether the recipes "represent mere unprotected facts or actual protected expression" because they were "infused with light-hearted or helpful commentary." ([opinion](https://law.justia.com/cases/federal/district-courts/FSupp2/178/758/2509787/)) **This is exactly why Harbor's pipeline must separate the factual core (safe) from any interwoven commentary (risky) and store only the former** — i.e., design to fall on the *Meredith* side, not the *Barbour* side.

### The highest-risk item: photographs

Recipe photographs are independently and fully copyrightable; re-hosting them is the **single most clear-cut infringement** in the food space, remediable by DMCA takedown. Re-hosting another's photo behind a paywall is textbook commercial infringement. *(Verifier note: the colorful "most common form of copyright infringement in the food blogging world" quote is mis-attributed to the Copyright Alliance article; the underlying proposition is accurate and supported by general food-law commentary.)* **Harbor must not scrape, store, cache, thumbnail, or display source recipe photos (including `schema.org` `image` / `og:image` contents).** Use generated/commissioned imagery, user-captured photos, or show no photo.

### Personal → commercial shift

Copyrightability of the facts/steps does **not** depend on Harbor's commercial status. But going commercial (a) removes the informal tolerance that protects a 2-person private tool, (b) weakens any fair-use defense (commercial purpose and serving content to paying users cut against factors 1 and 4 of [17 U.S.C. §107](https://www.law.cornell.edu/uscode/text/17/107)), and (c) makes Harbor a visible, deeper-pocketed enforcement target. **The facts remain unprotected regardless — so design the commercial product to touch only facts.**

---

## 2. Web Scraping & Structured-Data Reuse (URL → JSON-LD)

**Reliability: HIGH.** All 15 claims rest on real, correctly-held sources. One minor overstatement on robots.txt and one nuance on the hiQ contract theory are corrected below.

For Harbor's specific pattern — a **single, user-initiated fetch of one public recipe page**, parsing the `schema.org/Recipe` JSON-LD the publisher deliberately published for machines — US legal risk is **low but non-zero**, and is dominated by **breach-of-contract / Terms-of-Service exposure, not the CFAA**.

### CFAA is essentially off the table for public pages

- *Van Buren v. United States*, 593 U.S. 374 (2021) (6-3, Barrett, J.) adopted a narrow "gates-up-or-down" reading of "exceeds authorized access" — liability turns on crossing a technological barrier, not on violating a use policy. ([opinion PDF](https://www.supremecourt.gov/opinions/20pdf/19-783_k53l.pdf)) *(It expressly left open whether contractual terms can limit authorization.)*
- *hiQ Labs v. LinkedIn*, 31 F.4th 1180 (9th Cir. 2022) held scraping data from public, no-login pages is **not** access "without authorization": "a computer hosting publicly available webpages has erected no gates to lift or lower in the first place." ([Fenwick analysis](https://www.fenwick.com/insights/publications/hiq-labs-scrapes-by-again-the-ninth-circuit-reaffirms-that-data-scraping-does-not-violate-the-cfaa-1)) Binding in the 9th Cir., persuasive elsewhere. Recipe blogs are public, no-login pages.

### The real live risk: contract / ToS

hiQ **won** the CFAA point and still **lost** on contract — the N.D. Cal. found it breached LinkedIn's User Agreement, ending in a **$500,000 stipulated judgment** plus permanent injunction (Dec. 2022) covering breach of contract, CFAA, Cal. Penal Code §502, trespass to chattels, misappropriation, and spoliation. ([Morgan Lewis](https://www.morganlewis.com/blogs/sourcingatmorganlewis/2022/12/linkedin-v-hiq-landmark-data-scraping-suit-provides-guidance-to-data-scrapers-and-web-operators); [Proskauer](https://newmedialaw.proskauer.com/2022/11/11/court-finds-hiq-breached-linkedins-terms-prohibiting-scraping-but-in-mixed-ruling-declines-to-grant-summary-judgment-to-either-party-as-to-certain-key-issues/)) **Lesson: "public data + no CFAA" ≠ "no liability."** *(Verifier correction: the court did **not** require hiQ to have personally "assented" — it rested breach on conduct/agency, so a site could establish breach without a clean clickwrap moment. Contract risk is marginally broader than "hinges on assent" implies.)*

But contract enforceability is fact-specific and often weak against Harbor's pattern:
- **Browsewrap vs. clickwrap:** Clickwrap ("I agree" click) is routinely enforced; **browsewrap** (a footer "Terms" link, no affirmative assent) frequently fails for lack of notice/assent — an industry survey reports browsewrap succeeding only **~14%** of the time. ([Ironclad report](https://explore.ironcladhq.com/rs/528-QBH-821/images/21.04.30_ClickwrapLitigationReport.pdf)) Most recipe blogs use footer browsewrap a URL-paster never saw.
- *Meta Platforms v. Bright Data*, 2024 WL 251406 (N.D. Cal. Jan. 23, 2024) (Chen, J.): Bright Data did **not** breach Meta's terms by scraping public Facebook/Instagram data **while logged out**, because the terms govern a "user's" use and a logged-off scraper isn't "using" the service; the court also voided a perpetual post-termination anti-scraping survival clause. ([Goldman analysis](https://blog.ericgoldman.org/archives/2024/01/game-on-bright-data-scores-major-victory-in-web-scraping-dispute-with-meta-guest-blog-post.htm)) **Favorable analogy** for "user pastes a public URL, app fetches it logged-out" — but it is contract-language-specific and only persuasive outside its facts.

### Other doctrines: effectively non-risks at Harbor's volume

- **Trespass to chattels** requires actual server harm/impairment. *eBay v. Bidder's Edge*, 100 F. Supp. 2d 1058 (N.D. Cal. 2000) enjoined a bot sending ~100,000 requests/day; *Intel v. Hamidi*, 30 Cal. 4th 1342 (2003) requires actual damage. A single user-initiated GET causes zero strain → non-risk. ([eBay](https://en.wikipedia.org/wiki/EBay_v._Bidder's_Edge); [Hamidi](https://en.wikipedia.org/wiki/Intel_Corp._v._Hamidi))
- **"Hot news" misappropriation** is narrow and largely confined to the 2d Cir. (*NBA v. Motorola*, 105 F.3d 841; *Barclays v. Theflyonthewall*, 650 F.3d 876). Recipes aren't time-sensitive news → effectively zero risk.
- **robots.txt** is advisory in effect and not a contract; ignoring it is not itself a crime or breach. *(Verifier correction: RFC 9309 (Sept. 2022) formally **standardized** the protocol as an IETF Proposed Standard — it isn't "merely an advisory convention." The RFC itself says robots.txt is not an access-control mechanism. Courts may still treat directives as evidence of a site's expressed intent.)* ([RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html)) **Honoring it is cheap insurance** against "bad faith / circumvention" narratives.

### The 2023–2026 AI-scraping wave — don't overstate it

Those cases concern **bulk ingestion to train models or build directly competing products**, and do not map onto a single-page recipe clipper:
- *Thomson Reuters v. Ross* (D. Del. Feb. 11, 2025, Bibas, J.) **rejected** fair use where a startup copied **2,243 Westlaw headnotes** to build a competing legal-research tool — but stressed the copied material was **creative editorial expression** and the use was non-transformative and market-harming, and **expressly limited the ruling to non-generative AI**. ([Perkins Coie](https://perkinscoie.com/insights/update/fair-use-defense-failed-thomson-reuters-v-ross-jury-still-out-generative-ai))
- *NYT v. OpenAI* (S.D.N.Y., MTD largely denied Apr. 4, 2025) concerns mass article copying for LLM training. ([opinion summary](https://ipwatchdog.com/2025/04/07/new-york-judge-keeps-key-aspects-suit-openai-alive/))

The factors that doomed *Ross* (copying **creative expression** + **market substitution**) are largely **absent** if Harbor takes only uncopyrightable facts and links back. **Scope the LLM-fallback parse to extracting facts from the single fetched page; do not retain page content to train/fine-tune any model or reuse it across users as a dataset.**

### Secondary liability is now harder to establish

*Cox Communications v. Sony Music*, 607 U.S. ___ (2026) narrowed contributory copyright liability: a provider is liable only if it **induced** infringement or supplied a service **"tailored for"** infringement (some sources phrase the second prong as a service incapable of substantial lawful uses); **mere knowledge that some users might infringe is not enough**, and it reversed the ~$1B verdict. ([Kirkland](https://www.kirkland.com/publications/kirkland-alert/2026/04/supreme-court-narrows-scope-of-secondary-copyright-liability-in-cox-v-sony); [Mintz](https://www.mintz.com/insights-center/viewpoints/2251/2026-03-27-supreme-court-narrows-contributory-copyright-liability)) **This helps a general-purpose clipper — but design and marketing matter:** an app advertised to "rip any recipe site," that caches content server-side or strips paywalls, looks "tailored for" the wrong use.

### EU/UK divergence (if Harbor sells there)

The **sui generis database right** (Directive 96/9/EC) protects substantial extraction from a database with "substantial investment," for 15 years, even absent originality — broader than US law (which has no equivalent). A single user clipping one recipe extracts an insubstantial part (outside the right); systematic harvesting of a site's whole catalog is not. Open Food Facts is EU-origin. Plus *Ryanair v. PR Aviation*, C-30/14 (CJEU 2015): where a database isn't copyright/sui-generis protected, owners may **contractually** forbid scraping of even unprotected data via properly-notified T&Cs. ([Pinsent Masons](https://www.pinsentmasons.com/out-law/news/website-operators-can-prohibit-screen-scraping-of-unprotected-data-via-terms-and-conditions-says-eu-court-in-ryanair-case); [EU database right](https://eur-lex.europa.eu/EN/legal-content/summary/legal-protection-databases.html))

---

## 3. App Store Policy & Competitor Precedent

**Reliability: HIGH.** All Apple guideline numbers/texts and all competitor facts were confirmed verbatim against live sources.

**The "point a URL at it → parse JSON-LD → save to the user's private collection" pattern is the dominant, defensible commercial model in this category** — used by Paprika, AnyList, Crouton, Pestle, Mela, Plan to Eat, and the major open-source apps (Mealie, Tandoor). **None has a known recipe-copyright lawsuit or App Store takedown.**

### The Apple guidelines that actually matter

- **5.2.2** (the real exposure): if your app "uses, accesses, monetizes access to, or displays content from a third-party service," you must be "specifically permitted to do so under the service's terms of use," and "Authorization must be provided upon request." This — **not copyright** — is the most concrete App Store risk for a URL-import app. Mitigate by importing only on explicit per-user action, preferring the site's own published JSON-LD, respecting robots.txt, and being able to show imports are user-initiated to a private collection.
- **5.2.1**: don't use protected third-party copyrighted works without permission.
- **5.2.3**: the media-download prohibition is scoped to **audio/video** stream-ripping from named services (Apple Music, YouTube, SoundCloud, Vimeo). It does **not** reach recipe-text/structured-data extraction — but importing recipes **from video** (TikTok/Instagram/YouTube) edges toward this line and those platforms' ToS.
- **1.2** (UGC): the moment Harbor lets users share imported recipes **beyond a trusted household**, it must provide content filtering, a report/abuse mechanism, user blocking, and published contact info.
- **4.2.2**: disfavors apps that are "primarily… web clippings, content aggregators, or a collection of links."

([Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/))

### Competitor precedent — three models

1. **Private per-user clip (the safe default):** AnyList imports from "any websites that support the schema.org microdata standard"; Paprika "supports downloading recipes from hundreds of different recipe sites"; Mealie uses the `recipe-scrapers` library with JSON-LD + OpenAI fallback; Tandoor supports 500+ sites with JSON-LD fallback. They store to **private** per-user/household collections and shift the copyright warranty to the user. Paprika's terms: "You retain any and all of your rights to any User Content you submit," and it disclaims responsibility for third-party "copyright compliance." ([Paprika terms](https://www.paprikaapp.com/terms/); [AnyList](https://help.anylist.com/articles/recipe-import-sites/); [Mealie source](https://github.com/mealie-recipes/mealie/blob/mealie-next/mealie/services/scraper/scraper_strategies.py))
2. **Own or license a first-party corpus:** **NYT Cooking** charges a standalone subscription (~$4.99/mo, ~$39.99/yr) for **17,000+** recipes its **own staff created and owns** *(verifier correction: NYT publicly states "more than 17,000" — not the 18,000–22,000 some sources claim)*. **Samsung Food** (B2B/commerce platform) deliberately does **not** import instructions and **links back to source** "to honor the investment of the recipe creator who earns revenue through ads on their site," showing full instructions only for creators who opt into its Creator Fund (~$0.15/complete recipe view). ([Samsung Food](https://support.samsungfood.com/hc/en-us/articles/360042249752-Recipe-formatting-best-practices)) **This is the model to adopt if Harbor ever adds social/sharing beyond the household.**
3. **Public aggregator (highest risk, commercially fragile):** **Yummly** built a public searchable index pulling from Allrecipes/Epicurious/Food Network, had to court publishers rather than redistribute, was acquired by Whirlpool (2017), team laid off (April 2024), **fully shut down December 2024.** ([The Spoon](https://thespoon.tech/whirlpool-lays-off-entire-team-for-cooking-and-recipe-app-yummly/)) **Avoid building value on aggregating others' recipes.**

### Takedown reality

Both stores enforce IP via notice-and-takedown and can pull apps; Google Play terminates accounts for "repeated infringement." The realistic risk is a **DMCA/IP complaint from a publisher or cookbook author**, not a proactive store audit. Defense: register a DMCA agent, build in-app report/remove, keep imports private/user-initiated, retain source URLs for traceability. ([Google Play IP policy](https://support.google.com/googleplay/android-developer/answer/9888072?hl=en); [DMCA agent](https://www.copyright.gov/dmca-directory/faq.html))

---

## 4. Third-Party Data & API License Obligations

**Reliability: HIGH.** All license texts, statutes, and Anthropic terms confirmed verbatim. The ODbL share-alike scope — the highest hallucination-risk item — is stated **correctly** here (the recipe-copyright track's broader framing of it was the one **overstatement**, corrected below).

### Open Food Facts — ODbL 1.0 (the key nuance)

OFF uses a **three-license structure**: the **database** under ODbL 1.0, the **contents** under the Database Contents License (DbCL), and product **images** under **CC-BY-SA 3.0**. Commercial use is permitted outright — no separate license or fee. ([OFF terms](https://world.openfoodfacts.org/terms-of-use))

**The load-bearing distinction** (ODbL §4.5): Harbor's app UI, product screens, and per-user allergen/diet outputs are **"Produced Works,"** not a **"Derivative Database."** Per [ODbL §4.5](https://opendatacommons.org/licenses/odbl/1-0/): "Using this Database… to create a Produced Work does not create a Derivative Database for purposes of Section 4.4." Therefore:
- **Share-alike does NOT force Harbor to open-source its app or internal database** merely for *using* OFF data. (§4.5 also expressly says internal use within an organization "is not to the public" and so doesn't trigger §4.4.)
- Share-alike (§4.4) bites **only** if Harbor creates **and Publicly Uses** a genuine **Derivative Database** — then that adapted database must be offered under ODbL, with an obligation to hand over the database or a diff of alterations (§4.6).
- Merely placing OFF data alongside other databases in a **"Collective Database"** does **not** force the other databases open (§4.5(a) safe harbor).
- **Required attribution:** name Open Food Facts + ODbL with a link to openfoodfacts.org, deep-linking to the specific product page when showing a specific product's data. Omitting attribution is the most common ODbL violation.

> **⚠️ VERIFIER CORRECTION (recipe-copyright track overstated ODbL):** An earlier framing claimed that "works produced from an adapted database" or any "combined database" triggers an open-data release. **That is too broad.** Copyleft attaches to a Derivative Database you Publicly Use — **not** to Produced Works (which need only an attribution notice, §4.3/§4.5(b)), and **not** automatically to other databases merely combined in a Collective Database. The architecture question (internal lookups vs. shipping a derived dataset vs. exposing a data feed/API) genuinely determines whether share-alike bites — **a real lawyer should confirm against your actual pipeline.**

### OFF product images — the highest residual IP risk in the data stack

CC-BY-SA covers **only OFF's and contributors' own rights.** OFF expressly warns: "Other rights of third parties may apply" — the **package artwork (copyright)**, **brand logos/trade dress (trademark)**, and **depicted persons (right of publicity)** are rights OFF **cannot** grant you. ([OFF legal](https://world.openfoodfacts.org/legal)) **Re-hosting product-package photos commercially is the single largest IP exposure here.** On top of that, CC-BY-SA is itself copyleft: any *edited* OFF image must be released under CC-BY-SA. **Default policy: do not re-host OFF package photos** — prefer user-captured photos of items the user owns, and brand/product **names as text**. Nominative fair use (*New Kids on the Block v. News America Publishing*, 971 F.2d 302 (9th Cir. 1992)) lets you **name** products; it does **not** license re-hosting their artwork. ([New Kids](https://law.justia.com/cases/federal/appellate-courts/F2/971/302/72076/); [Lanham Act §1051](https://www.law.cornell.edu/uscode/text/15/1051); [Cal. Civ. Code §3344](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=3344))

### USDA FoodData Central — CC0 (the cleanest source)

CC0 1.0 public domain: "No permission is needed for their use," attribution **requested but not required**. ([FDC API guide](https://fdc.nal.usda.gov/api-guide/)) **Prefer USDA over OFF wherever the nutrient data overlaps** to shrink the ODbL/CC-BY-SA compliance surface. (Caveat: FDC is US-centric and lacks barcodes/allergen statements OFF has, so it complements rather than replaces OFF.)

### Anthropic Claude API — favorable, with two guardrails

Build **exclusively on the commercial API / Claude-for-Work tier** (never the consumer Free/Pro/Max apps):
- **You own Outputs.** Commercial Terms §B: "Anthropic agrees that Customer (a) retains all rights to its Inputs, and (b) owns its Outputs," and assigns Anthropic's interest in Outputs to you. So extracted recipes and diet/allergen classifications are yours to ship.
- **No training on your content.** §B: "Anthropic may not train models on Customer Content from Services." (Consumer plans default to training-on, opt-out — another reason to stay on the commercial tier.)
- **Guardrail 1 — competing model.** §D.4 bars using the Services "to build a competing product or service, including to train competing AI models." Harbor (a meal planner) is fine, but **do not** train/distill Harbor's own LLM on Claude outputs.
- **Guardrail 2 — accuracy responsibility + user notice.** §D.3: "It is Customer's responsibility to evaluate whether Outputs are appropriate," and you "must notify… Users that factual assertions in Outputs should not be relied upon without independently checking their accuracy." **For allergen flags (a life-safety claim) this is mandatory.**

([Anthropic Commercial Terms](https://www.anthropic.com/legal/commercial-terms))

**Usage Policy — nutrition is carved out of "high-risk healthcare":** "Wellness advice (e.g., advice on sleep, stress, nutrition, exercise, etc.) does **not** fall under this category" — so Harbor's diet/nutrition flagging does **not** trigger mandatory human-in-the-loop professional review. **But** if Harbor ships an interactive AI chat/agent, it must disclose "you are interacting with AI" at the start of each session, and must **not** stretch the carve-out to cover medical/allergy **diagnosis** (which re-enters high-risk territory). ([Usage Policy](https://www.anthropic.com/aup))

---

## 5. Monetization Models (ranked)

**Reliability: HIGH.** All case law and competitor/market facts confirmed. Three corrections: an Apple guideline mis-cite (3.2.2(i) → 4.2.2 only), NYT recipe count (→17,000+), and **unverified** per-recipe licensing rates.

The cleanest model monetizes **software, not anyone's protected content** — because recipes (ingredients + functional steps) aren't copyrightable, a feature subscription charges for your code.

| Rank | Model | Risk | Viability | Notes |
|---|---|---|---|---|
| **1** | **Charge for software** over user-supplied/clipped content | **Lowest** | High | Harbor = neutral tool. Sell planning, AI coach, scaling, sync, household sharing, allergen/diet flagging. Proven: Paprika (~$5 one-time), AnyList Complete (~$9.99/yr individual / ~$14.99/yr household). Clean under Apple 5.2. **This is the default.** |
| **2** | **Licensed / original / CC recipe packs** as a paid add-on | Low | High (additive) | Only ship recipes Harbor authored/owns (NYT model), licensed, or **CC BY / CC BY-SA** (with attribution). **Never CC BY-NC in a paid app.** Satisfies Apple 5.2.1. |
| **3** | **Affiliate + attribution + link-back-to-source** | Low–moderate | Strong creator goodwill | Surface only functional data + a prominent link back to the creator; avoid copying prose/photos. Sends traffic *to* creators (anti-substitution), can earn affiliate/grocery commissions. Keep user-initiated, not mass-indexed (avoid the Yummly failure mode and Apple 4.2.2). |
| **4** | **Creator rev-share / opt-in marketplace** | Moderate | High build/ops cost | The legitimate way to host others' full content (permissioned + paid). Market platform fees ~10% (Substack, Clubb) up to ~20% (Provecho, Foody); Patreon ~5–12%. Adds payments, contracts, moderation/DMCA, tax (1099). **Defer until core software business is proven.** |
| **✗** | **Mass-scrape + redistribute full recipe text/photos as Harbor's own product** | **Highest** | Fragile | Prose + photos are copyrightable; ToS-breach + (EU) database-right claims attach to bulk extraction; Apple may reject as an aggregator (4.2.2) or unlicensed third-party content (5.2.2). hiQ/Van Buren only addresses the CFAA. **Do not build this.** |

**Verifier corrections to the source research:**
- The aggregator language is in **Apple Guideline 4.2.2 only** — drop any "3.2.2(i)" cite (3.2.2 is about business models). ([Apple guidelines](https://developer.apple.com/app-store/review/guidelines/))
- **NYT Cooking ≈ 17,000+** recipes (not 18,000–22,000).
- Marketplace rev-share fees (Substack/Clubb ~10%, Provecho/Foody ~20%) are **well-sourced** ([Clubb](https://www.theclubb.co/blog/the-best-membership-platforms-for-food-creators); [Foody/TechCrunch](https://techcrunch.com/2021/11/12/foody-cooks-up-marketplace-for-culinary-creators/)). The **per-recipe licensing rates ($35–$250/recipe/yr; ~$10k/100 recipes) are UNVERIFIED market lore** — the cited source does not state them. **Confirm via direct publisher/recipe-network quotes before modeling a licensed-pack business.**

Data-source licenses re-confirm the model: **USDA CC0** (no strings) and **OFF ODbL** (display data as a Produced Work + attribution; never publish a modified OFF-derived database) both support a commercial app — keep proprietary enrichment as a Produced Work output, not a published derivative database.

---

## 6. Health Liability + Privacy / Regulatory

**Reliability: HIGH.** Every statute, dollar figure, license section, and guideline confirmed. One overstatement corrected: what *Winter v. Putnam* actually held about negligence claims.

### Product / tort liability — allergens are the high-severity risk

- **Strict products liability likely does NOT apply to informational content.** *Winter v. G.P. Putnam's Sons*, 938 F.2d 1033 (9th Cir. 1991): readers who ate poisonous mushrooms relying on an *Encyclopedia of Mushrooms* lost — "the content of a book does not constitute a product for purposes of strict liability," and publishers have no general duty to investigate accuracy. ([opinion](https://law.justia.com/cases/federal/appellate-courts/F2/938/1033/294363/))
  > **⚠️ VERIFIER CORRECTION:** The source research said *Winter* "left intact theories of negligent misrepresentation." **That is wrong as to what the case did** — the Ninth Circuit **affirmed** dismissal of the negligence and negligent-misrepresentation claims too (no duty on those facts). The correct takeaway is **doctrinal**: *Winter* makes no-fault **strict** liability an unlikely fit for a nutrition/allergen information display, leaving **negligence** and **negligent misrepresentation** (which require a duty + breach) as the more plausible theories a plaintiff would actually pursue.
- **Disclaimers help but cannot fully bar a personal-injury claim.** In most US jurisdictions, contractual liability caps **cannot** bar claims for **death/personal injury caused by negligence**, or for **gross negligence/willful misconduct**, as a matter of public policy. The economic-loss doctrine bars pure-economic-loss negligence under a contract — but **not** physical-injury claims. ([Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2013/08/limitations-on-liability-exceptions-for-gross-negl)) **So a EULA cap is necessary but insufficient for an anaphylaxis scenario** — pair it with accuracy processes, label-verification framing, and **insurance**.
- **Industry-standard mitigation (the Yuka template):** provide allergen/diet/nutrition info "as is," frame it as a **screening aid, not a safety guarantee**, exclude **trace amounts/cross-contamination**, instruct users to **"always refer to the information on the product label"** for allergy-critical decisions, and state it is **not medical advice**. ([Yuka US Terms](https://help.yuka.io/l/en/article/c1zr4m81g1-yuka-terms-conditions-usa)) *(Verifier note: the trace-amounts limitation lives in Yuka's [help/food-preferences docs](https://help.yuka.io/l/en/article/qzr8gkygvp-food-preferences), not its Terms — but the template is accurate.)* **Surface this at the point of use (on the flag itself), not just buried in the EULA.**

### FDA-regulated terms vs. judgment calls

- **"Gluten-free"** is FDA-regulated (**<20 ppm** under the 2013 Final Rule). **Allergens:** FALCPA's **9 major allergens** — milk, egg, fish, crustacean shellfish, tree nuts, peanuts, wheat, soy, and **sesame** (added by the 2021 FASTER Act, effective Jan 1, 2023). Manufacturers must declare these, so the source data is most reliable here.
- **"Vegan / vegetarian / pescetarian"** are **NOT** FDA-defined — voluntary marketing claims with no legal standard. **Anchor allergen logic to FALCPA's 9 declared allergens; treat vegan/vegetarian as best-effort classification with an explicit "no legal definition" disclaimer; never present "gluten-free" as a guarantee unless sourced from a label bearing the regulated claim.** ([FDA gluten-free](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/questions-and-answers-gluten-free-food-labeling-final-rule); [FDA allergens](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies))

### Stay in the wellness lane

Only **drugs** may claim to "diagnose, treat, cure, mitigate, or prevent any disease" (FDCA). A meal planner claiming to "reverse diabetes," "treat celiac," or "cure IBS" risks being treated as making **unapproved drug/disease claims** and a **deceptive health claim** under **FTC Section 5** (health claims must be truthful and substantiated). **Scrub all marketing copy and AI-coach outputs of disease-treatment language.** ([FDA structure/function](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/structurefunction-claims))

### Privacy / regulatory — the biggest scaling-stage exposure

- **Washington My Health My Data Act (MHMDA)** — effective March 31, 2024 (small business June 30, 2024). Defines "consumer health data" **extremely broadly** to include health, wellness, **nutrition, fitness, and diet**, and **inferred** data. Requires a **standalone Consumer Health Data Privacy Policy** (no marketing language), **separate opt-in consent** to collect and (separately) to share, valid authorization to sell, and bans geofencing within **2,000 feet** of health facilities. **Enforced via Washington's CPA with a PRIVATE RIGHT OF ACTION.** ([Goodwin](https://www.goodwinlaw.com/en/insights/publications/2024/03/alerts-technology-hltc-my-health-my-data-act-mhmda); [Stoel](https://www.stoel.com/insights/publications/faq-washington-states-my-health-my-data-act)) Diet/allergen/nutrition data is squarely covered → **architect a separate consent flow + standalone health-data policy before collecting any WA user's data.** *(The "~$7,500/violation" figure is the AG's per-violation CPA penalty; the private right of action recovers actual damages and fees — both exist.)*
- **CCPA/CPRA:** health info is **Sensitive Personal Information**. Consumers can limit SPI use and opt out of sale/sharing; businesses must offer "Do Not Sell or Share My Personal Information" and "Limit the Use of My Sensitive Personal Information" links. Thresholds (**$25M+ revenue**, or **100k+ consumers**) determine applicability. ([CA OAG](https://oag.ca.gov/privacy/ccpa)) At small scale Harbor may fall below; **plan for it as you scale**, and "we never sell your health data" is both compliance and a marketing asset.
- **FTC Health Breach Notification Rule** (amended final rule published May 30, 2024; effective July 29, 2024): explicitly covers **non-HIPAA health apps** as PHR vendors; requires notifying individuals, the FTC, and sometimes media of breaches of unsecured identifiable health info. **FTC Section 5 enforcement:** **GoodRx ($1.5M, 2023)** and **BetterHelp ($7.8M + banned from sharing health data for advertising, 2023)** — both for sending health data to ad/analytics SDKs. ([HBNR](https://www.federalregister.gov/documents/2024/05/30/2024-10855/health-breach-notification-rule); [BetterHelp](https://www.ftc.gov/news-events/news/press-releases/2023/07/ftc-gives-final-approval-order-banning-betterhelp-sharing-sensitive-health-data-advertising)) **Never send health/diet data (or identifiers tied to it) to Meta/Google/ad-broker SDKs; build a breach-notification plan.**
- **Apple Guideline 5.1.3** (if Harbor integrates HealthKit): prohibits using/disclosing health data for **advertising/marketing/data-mining** or selling to data brokers; must disclose specific health data collected; no PHI in iCloud; no false writes to HealthKit. **1.4.1**: medical apps face greater scrutiny, must disclose methodology, and should remind users to check with a doctor. **5.1.1**: in-app privacy policy detailing data collected/used/retained and consent revocation. ([Apple guidelines](https://developer.apple.com/app-store/review/guidelines/))
- **EU/UK GDPR** (if Harbor expands there): dietary/allergen/health data is **Article 9 "special category"** data requiring **EXPLICIT consent**; diet attributes (halal/kosher/vegetarian) can **reveal religious/philosophical belief** by inference — doubly sensitive. ([GDPR Art. 9](https://gdpr.eu.org/art/9/)) **Geofence out the EU/UK until an explicit-consent flow and DPA posture exist.**

---

## RISK REGISTER

| # | Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|---|
| R1 | **Allergen/diet mislabeling → personal injury** (anaphylaxis); negligence/negligent-misrepresentation claim (disclaimers can't fully bar it) | Low–Med | **Critical** | Anchor to FALCPA's 9 declared allergens; Yuka-style "screening aid, not a guarantee — verify the physical label" at point of use; exclude trace/cross-contamination; product-liability + tech E&O insurance; accuracy QA |
| R2 | **Re-hosting recipe photos / OFF package images** (copyright + trademark/trade dress + right of publicity) | Med (if built) | **High** | **Don't re-host** source/OFF photos; use generated/commissioned or user-captured imagery; brand names as text only; nominative use names products, doesn't license artwork |
| R3 | **Copying headnote/narrative prose verbatim** (thin copyright; *Barbour* fact-question) | Med (if not stripped) | High | "Facts in, expression out": discard headnotes at ingest; LLM-**regenerate** steps in Harbor's words; store transformed version only |
| R4 | **Washington MHMDA / health-data privacy** (private right of action; CCPA SPI; FTC HBNR) | Med (rises with scale) | **High** | Standalone Consumer Health Data Privacy Policy; separate opt-in collect/share consent; no health data to ad/analytics SDKs; "never sell health data"; breach-notification plan |
| R5 | **Site ToS / breach-of-contract from import** (hiQ contract theory; EU Ryanair) | Low | Med | Strictly user-initiated single-URL fetch; logged-out; no paywall/anti-bot circumvention; respect robots.txt; identifiable User-Agent; per-site ToS awareness; own clickwrap shifting duty to user |
| R6 | **App Store rejection/removal** (5.2.2 third-party terms; 4.2.2 aggregator; 5.1.3 HealthKit) | Low–Med | High (existential for distribution) | Private per-user clip model; JSON-LD over scraping; no public all-users corpus; DMCA agent + in-app report/remove; HealthKit 5.1.3 compliance |
| R7 | **DMCA / IP takedown from a publisher or cookbook author** | Low–Med | Med | Register DMCA designated agent (17 U.S.C. §512); in-app takedown flow; repeat-infringer policy; retain provenance (source URL, method, timestamp) |
| R8 | **ODbL share-alike forces opening a derived database** (if Harbor ships a data feed/export) | Low | Med | Keep enriched OFF copy private/server-side as a Produced Work; never publish a modified OFF-derived database or bulk data API; prefer USDA CC0; OFF attribution UI; counsel review of pipeline |
| R9 | **Disease-treatment / medical claims** (FDCA unapproved-drug claim; FTC §5; SaMD reclassification; Anthropic high-risk) | Low | High | Stay in "wellness/nutrition" lane; hard-block AI coach from diagnosis/therapy/dosing; "AI-generated, not medical advice — consult a professional" disclosure |
| R10 | **EU/UK expansion** (sui generis database right; GDPR Art. 9 explicit consent; AI Act transparency) | Low (US-first) | Med | Geofence EU/UK until explicit-consent + DPA posture and local IP review are in place; rely on per-user clipping + licensed/CC content there |
| R11 | **LLM-fallback intermediate-copying / training exposure** (reads full page incl. protected prose) | Low | Low–Med | Scope LLM parse to facts from the single fetched page; never retain page content to train/fine-tune or reuse across users as a dataset; commercial API tier (no Anthropic training on your content) |

---

## DE-RISKED COMMERCIALIZATION POSTURE (recommended)

Position Harbor as a **neutral, private, household-scoped recipe-organizer-plus-planner that charges for software**, built on these pillars:

1. **Facts-in-expression-out pipeline.** On every import (URL JSON-LD, LLM fallback, cookbook photo), persist **only** ingredient names, quantities/proportions, yield, times, temperatures, nutrition. **Discard** headnotes/narrative/prose at ingest. **Regenerate** cooking steps in Harbor's own words. **Never** store/display source photos.
2. **Private, per-user collection — no public corpus.** Imports are explicit, user-initiated, single-URL, logged-out, into a private household collection. No bulk crawler, no server-side recipe catalog, no public all-users searchable index.
3. **Link back + attribute.** Show a link to the source recipe (anti-substitution; eases takedown). Attribute Open Food Facts + ODbL; credit USDA FDC.
4. **Allergen safety as advisory, never authoritative.** FALCPA-anchored; "verify the physical label" at point of use; not a guarantee; insured.
5. **Wellness lane only.** No disease-treatment claims; AI-coach guardrailed away from medical/diagnostic output; "AI-generated, not medical advice" disclosure.
6. **Privacy-by-design for health data.** Standalone health-data policy; separate consent; zero health data to ad/analytics SDKs; commercial Claude API tier (you own outputs, no training on your content).
7. **Takedown infrastructure.** DMCA agent registered; in-app report/remove; repeat-infringer policy; per-recipe provenance retained.
8. **Own clickwrap Terms** shifting the "you have rights in what you import" warranty and an indemnity to the user; prohibiting use to circumvent paywalls.

### Recommended business model(s), ranked

1. **Feature subscription / one-time software purchase over user-clipped content** (lowest risk, proven — Paprika, AnyList). **Default.**
2. **Optional first-party recipe packs** that are Harbor-original, licensed, or **CC BY / CC BY-SA** (never CC BY-NC in a paid app). Premium upsell, no aggregation risk.
3. **Affiliate + link-back-to-source** for any third-party recipe surfaced (functional data only + prominent link). Creator-goodwill, grocery/affiliate commissions.
4. **Creator rev-share / opt-in marketplace** (~10–20% platform fee) — **defer** until the core software business is proven (adds payments, contracts, moderation/DMCA, tax).

**Avoid entirely:** a public, all-users searchable corpus built by mass-scraping and redistributing full recipe text/photos.

---

## CHECKLISTS

### ✅ Do NOW (while personal) to keep the commercial door open

- [ ] **Build the pipeline to store facts only.** Parser captures `name`, `recipeIngredient`, `recipeInstructions` (then **regenerated**), `prepTime`/`cookTime`/`totalTime`, `recipeYield`, `nutrition`. Explicitly **drop** the JSON-LD `description`/headnote and **`image`** fields from storage. *(Cheap now; expensive to retrofit later.)*
- [ ] **Never persist source photos.** No caching, no thumbnails, no share-card rendering of source/OFF package images. Decide the image strategy (generated / user-captured / none) before building any image feature.
- [ ] **Make import explicitly user-initiated, single-URL, logged-out.** No bulk pre-crawl, no server-side catalog. Respect robots.txt; send an identifiable User-Agent.
- [ ] **Capture provenance per recipe** (source URL, import method, timestamp) for future traceability/takedown.
- [ ] **Scope the LLM-fallback** to extracting facts from the one fetched page; do not retain page content across users or for training.
- [ ] **Use the commercial Claude API tier from day one** (you own outputs; Anthropic doesn't train on your content). Never the consumer app.
- [ ] **Anchor allergen logic to FALCPA's 9 declared allergens**; treat vegan/vegetarian as best-effort. Build the data model so "gluten-free" is only asserted when sourced from a regulated label claim.
- [ ] **Keep any enriched OFF copy private/server-side** (Produced Work), structurally separate from anything you'd ever distribute as data.
- [ ] **Prefer USDA FDC (CC0)** over OFF where nutrient data overlaps.
- [ ] **Tag data sources internally** (OFF / USDA / user / LLM) so attribution and license handling are mechanical later.

### 🔁 MUST change BEFORE selling

- [ ] **Add OFF/ODbL attribution UI** ("Contains information from Open Food Facts, available under the ODbL," linking to openfoodfacts.org and the product page) + USDA credit on a Data & Credits screen.
- [ ] **Register a DMCA designated agent** (17 U.S.C. §512, ~$6) and build an **in-app report/remove flow** + repeat-infringer policy.
- [ ] **Publish Terms of Service** (user warrants rights in imported content; Harbor is a neutral tool; content is private to the household; indemnity; no paywall circumvention; arbitration/class-action waiver; warranty disclaimer + liability cap) with **affirmative acceptance** at signup.
- [ ] **Surface allergen disclaimers at the point of use** — "screening aid, not a safety guarantee; verify the physical product label; does not account for trace amounts/cross-contamination; not medical advice."
- [ ] **Add the "AI-generated" disclosure** on AI outputs; if an interactive AI coach ships, disclose "you are interacting with AI" at the start of each session, and **hard-block** medical diagnosis/therapy/dosing.
- [ ] **Implement Washington MHMDA compliance** *before* taking any WA user: standalone Consumer Health Data Privacy Policy + separate opt-in consent to collect and to share.
- [ ] **Ensure zero health/diet data flows to ad/analytics SDKs;** publish "we never sell your health data."
- [ ] **Publish an in-app + App Store privacy policy** (Apple 5.1.1) and complete accurate App Store privacy labels / Data Safety forms.
- [ ] **If integrating HealthKit:** comply strictly with Apple 5.1.3 (no ads/broker use, disclose specific health data, no PHI in iCloud, no false writes).
- [ ] **Scrub all marketing copy and AI-coach outputs** of disease-treatment language (FDCA/FTC §5).
- [ ] **Obtain product-liability + technology E&O insurance.**
- [ ] **Build a breach-notification procedure** (FTC HBNR — notify individuals/FTC/media within required timeframes).
- [ ] **For video-source import (if offered):** do on-device extraction, keep results private (Apple 5.2.3 edge).
- [ ] **CCPA/CPRA readiness** as you approach thresholds: "Do Not Sell or Share" + "Limit the Use of My SPI" links, SPI inventory, access/deletion handling.
- [ ] **Geofence out EU/UK** until GDPR Article 9 explicit-consent flow + DPA + local IP review (sui generis database right) are in place.
- [ ] **Version-pin and re-check** ODbL, OFF terms, USDA license, Anthropic Commercial Terms + Usage Policy, and both app-store guidelines on the submission date.

---

## GET A REAL LAWYER FOR…

1. **The ODbL "Derivative Database" question** — whether Harbor's specific architecture (caching/enriching OFF, possibly merged with USDA + LLM data) ever creates a **publicly-used Derivative Database** that triggers share-alike, and how to architect a clean Produced-Work / Collective-Database separation if a data-sharing or export feature is ever desired.
2. **Allergen-liability + EULA enforceability** — whether your liability cap, assumption-of-risk, and arbitration/class-action waiver hold against a **personal-injury (anaphylaxis)** plaintiff in your target states; products-liability/consumer-law calibration of the disclaimer and the "verify the label" framing.
3. **Privacy-consent architecture** — Washington MHMDA (standalone policy + separate consents + the private right of action), CCPA/CPRA applicability and SPI mechanics, the FTC HBNR breach plan, and which other state health-data laws (e.g., Connecticut/Nevada health amendments, Colorado, Texas, Oregon) apply at scale.
4. **The "wellness vs. medical" line for the AI coach** — whether tailoring to a user's medical condition, diagnosis-linked weight goals, or pregnancy crosses into **medical guidance**, triggering Anthropic's High-Risk human-in-the-loop requirement and a possible **FDA Software-as-a-Medical-Device / Clinical Decision Support** analysis.
5. **The import pipeline + per-site ToS** — counsel review of the parser's actual handling of narrative text and photos (including whether LLM paraphrase creates a derivative-work argument), and which specific recipe sites' Terms contain enforceable clickwrap/anti-scraping clauses (hiQ-style contract risk survives the CFAA).
6. **Marketplace/creator contracts** (if pursued) — license scope, creator indemnity for their own potential infringement, takedown/DMCA process, revenue split, and 1099/tax mechanics; and **confirm real per-recipe licensing rates** via direct publisher quotes (the $35–$250/recipe figures circulating online are unverified).
7. **EU/UK launch** — the sui generis database right, GDPR Article 9 explicit consent (diet data can reveal religious belief), and EU AI Act transparency obligations.
8. **Anthropic IP indemnification** — whether to obtain enterprise-level IP indemnity for Claude Outputs, given Harbor relies on outputs derived from third-party source pages.

*Trademark/right-of-publicity for using brand or chef names "as seen in" commercially is a further adjacent issue worth flagging to counsel.*
