# Harbor — Nutrition & Health Knowledge Base

> The single source of truth the in-app nutrition/health agent (the "Nutritionist"/"Coach") stands on. Synthesized 2026-06-20 from eight verified, evidence-graded research domains (DRIs energy/macros; DRIs vitamins/minerals; vegan adequacy; cancer prevention; cardiometabolic/longevity patterns; endurance/running nutrition; weight management; Parkinson's risk; skin cancer; hydration; sleep; physical activity & aging). Every numeric target and source below has been cross-checked against the cited guideline document.
>
> **House model reminders this KB is wired to:**
> - **Targets are minimums** (floors to hit), not caps. The ONE exception is a small set of explicit *ceilings* (sodium, added sugar, saturated fat, red/processed meat, alcohol). Do not generate "over-target" warnings on calories/protein/fiber. See [§5](#5-what-becomes-a-machine-constraint-vs-human-advice).
> - **Household → prototype mapping:** Spencer ⇒ `Jordan` (omnivore, runs Tue/Thu/Sat per `RUN_WEEKDAYS`), Jacq ⇒ `Mara` (vegan). The planner already models `run_day` / `rest_day` / `maintenance` targets per member.
> - **Shopping is deferred behind the product engine; this KB is diet/coaching logic only.**

---

## 1. How to read this

**This is general wellness guidance grounded in public guidelines and peer-reviewed evidence — it is NOT personalized medical advice.** The app must say so. Anything touching disease (the household's family histories of colon cancer, Parkinson's, and skin cancer; Jacq's sleep-maintenance difficulty) is a prompt to **see a clinician**, not a claim the app can treat or prevent it. Several recommendations explicitly point AWAY from food toward a bigger lever (screening, UV protection, exercise, CBT-I) — see [§4](#4-evidence-honesty-callouts).

**Evidence-strength grades** (used in every table row). They tell the agent how hard to push and what NOT to overclaim:

| Grade | Meaning | How the agent should speak |
|---|---|---|
| **strong** | Guideline-grade / RCT-grade / IARC-or-WCRF "convincing" / DRI RDA-AI set by NASEM. | State plainly as a recommendation. |
| **moderate** | Expert-consensus, "probable" (WCRF), DRI Adequate Intake, or RCT on a surrogate marker. | Recommend, but note it's not the highest tier. |
| **associational** | Observational cohorts; confounding/reverse-causation plausible. | "Associated with," never "prevents/causes." |
| **limited** | Small/short trials, mechanistic, or mixed. | "May help, evidence is weak — low-risk to try." |
| **expert_opinion** | Synthesis of guideline emphasis, no single trial. | Frame as sensible context, not a finding. |

**Two failure modes the app must avoid:** (1) presenting a food/tea/supplement as preventing melanoma, colon cancer, or Parkinson's when the evidence doesn't support it; (2) treating a *floor* (protein, fiber, calories, water) as a *cap* and nagging the user for exceeding it.

---

## 2. Cited recommendation tables (grouped by domain, de-duplicated)

> De-duplication note: fiber, the red/processed-meat limit, sodium, added sugar, EPA/DHA, and the Mediterranean/whole-grain pattern recur across cancer, cardiometabolic, weight, and running domains. Each appears **once** as a canonical row here; the per-person drafts in [§3](#3-per-person-prescription-drafts) reference these rows rather than restating numbers.

### 2A. Energy & macronutrients (NASEM DRIs + DGA 2025-2030 + ACSM/ISSN overlays)

| Topic | Recommendation | Target | Evidence | Source | Planner / coach constraint |
|---|---|---|---|---|---|
| Protein floor (both) | RDA is a deficiency floor, not an optimum | ≥ 0.8 g/kg/day (EAR 0.66) | strong | NASEM DRI (2002/05) [NBK208874](https://www.ncbi.nlm.nih.gov/books/NBK208874/) | `protein_min = 0.8 × ref_weight_kg`; flag any day below. Use **reference weight**, not current, when in a deficit |
| Protein — Spencer (athlete + deficit) | Endurance + weight-loss raise needs | **1.6–2.0 g/kg/day** (≈120–160 g at ~80 kg) | strong | ISSN 2017 [PMC5477153](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5477153/); AND/DC/ACSM 2016 [26920240](https://pubmed.ncbi.nlm.nih.gov/26920240/) | `spencer_protein_floor = 1.6 g/kg` (stretch 2.0); 25–40 g/meal across 3–4 meals |
| Protein — healthy aging | Precautionary midlife floor (extrapolated from >65 data) | 1.0–1.2 g/kg/day | moderate | PROT-AGE 2013 (JAMDA); ESPEN 2014 | `aging_protein_floor = 1.0 g/kg` both; **use the higher of this and the athlete target.** Pair with resistance training or it does little |
| Protein — Jacq (vegan) | Varied plant protein over the day; modest bump for digestibility | ~0.9–1.0 g/kg/day | moderate | AND vegetarian position 2025 [S2212267225000425](https://www.sciencedirect.com/science/article/pii/S2212267225000425) | Legume/soy/seitan anchor in ≥2 meals/day; no need to "combine" proteins per meal (retired myth) |
| Fiber AI (both) | CHD-based AI = 14 g per 1000 kcal | **Spencer ≥38 g; Jacq ≥25 g/day** | strong | NASEM DRI [NBK208874](https://www.ncbi.nlm.nih.gov/books/NBK208874/) | `fiber_floor = {spencer:38, jacq:25}`; flag below. Ramp gradually w/ fluids; keep low in pre-run meal |
| Carbohydrate AMDR/RDA | Quality (whole) over exact % | 45–65% energy; **≥130 g/day** absolute | strong | NASEM DRI [NBK208874](https://www.ncbi.nlm.nih.gov/books/NBK208874/) | `carb_min = 130 g`; prefer whole grains/fruit/veg/legumes |
| Carb fueling — Spencer | Periodize to training load | 3–5 (rest) / 5–7 (moderate) / 6–10 (long/hard) g/kg/day | strong | AND/DC/ACSM 2016 [26920240](https://pubmed.ncbi.nlm.nih.gov/26920240/) | Tag days by load. Top tier ONLY on his hardest/longest session |
| Fat AMDR + EFAs | Favor unsaturated; don't drop below ~20% | 20–35% energy; LA ≥17/12 g, ALA ≥1.6/1.1 g (M/F) | strong | NASEM DRI [NBK208874](https://www.ncbi.nlm.nih.gov/books/NBK208874/) | `fat_pct in [20,35]`; daily ALA source for Jacq (flax/chia/walnut) |
| **Saturated fat (CEILING)** | Replace with unsaturated, not refined carbs | **<10% energy** (DGA); aim ~5–6% (AHA) for Spencer | strong | DGA 2025-2030 [dietaryguidelines.gov](https://www.dietaryguidelines.gov/); [AHA](https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/saturated-fats) | `satfat_pct < 10` (hard); Spencer stretch ≤6 |
| **Added sugar (CEILING)** | DGA restructured to per-meal grams | **≤10 g added sugar/meal** (DGA 2025-2030); daily AHA: Spencer ≤36 g, Jacq ≤25 g | strong | DGA 2025-2030 [dietaryguidelines.gov](https://www.dietaryguidelines.gov/); [AHA](https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/sugar/how-much-sugar-is-too-much) | `added_sugar_per_meal ≤ 10 g`; daily caps as above. **Exclude intra-run sport carbs.** Intrinsic fruit/dairy sugar is NOT counted |
| **Sodium (CEILING)** | Most comes from packaged/restaurant food | **<2,300 mg/day**; ideal ~1,500 (AHA) | strong | NASEM 2019 [CDRR](https://www.nationalacademies.org/read/25353/chapter/28); DGA 2025-2030 | `sodium ≤ 2300` (hard), stretch 1500. Sweat replacement on Spencer's long runs handled separately |
| Energy / deficit framing | Anchor energy first, then macros | Spencer −300 to −500 kcal/day; Jacq at maintenance | expert_opinion | NASEM EER; AND/DC/ACSM 2016 | `energy = EER ± goal`; hold protein, cut fat + discretionary carbs; never below low-energy-availability on training days |

### 2B. Vitamins & minerals (NASEM DRIs / NIH ODS) — vegan adjustments flagged

| Nutrient | Target (Spencer M / Jacq F) | UL | Evidence | Vegan / household note | Planner constraint |
|---|---|---|---|---|---|
| **Vitamin B12** | 2.4 mcg/day RDA | none | strong | **Mandatory supplement for Jacq** — plant foods have no reliable B12. Spencer covered by animal foods | Vegan plan: REQUIRE supplement (50–100 mcg/day, or 1000 mcg 2×/wk cyanocobalamin). Hard completeness rule |
| Vitamin D | 600 IU (15 mcg) | 4,000 IU | strong | Few foods supply it; Jacq use **lichen D3** (vegan); winter emphasis | `vit_d = 600 IU`; flag vegan menus < target → supplement. Never design > 4000 IU |
| Folate | 400 mcg DFE | 1,000 mcg (folic acid only) | strong | Abundant in Jacq's plants. B12 must accompany (high folate masks B12 anemia) | Flag only if supplemental folic acid > 1000 mcg |
| Iron | 8 / 18 mg; **vegan ×1.8 ⇒ Jacq ~32 mg dietary** | 45 mg (food + supps) | strong | Jacq at-risk (female+vegan). **Pair w/ vitamin C; separate from coffee/tea.** Spencer (male) should NOT supplement without testing (high iron stores undesirable for aging men) | Jacq ≥18 (prefer ~32 from FOOD); pair vit-C with iron meals; cap 45 |
| Calcium | 1,000 mg (Jacq→1,200 at 51+) | 2,500 mg | strong | Jacq: calcium-set tofu, fortified plant milk, **low-oxalate** greens (kale/bok choy — NOT spinach) | ≥1000; vegan prefers fortified/calcium-set sources; don't exceed ~2,000 total from supps (CV/prostate signal) |
| Magnesium | 420 / 320 mg from food | **350 mg (supplements only)** | strong | Plant-rich diet naturally high. **Do NOT frame a Mg supplement as a sleep treatment** (weak evidence) | Food has no upper flag; flag only supplements > 350 mg |
| Zinc | 11 / 8 mg; **vegan +50% ⇒ Jacq ~12 mg** | 40 mg | strong | Jacq: phytate binds zinc → **soak/sprout/ferment** (tempeh, sourdough) | Jacq ≥12; prefer phytate-reduced prep; cap 40 |
| Iodine | 150 mcg | 1,100 mcg | strong | Jacq at-risk (no seafood/dairy/egg). **Iodized salt or measured supplement — NOT unmeasured kelp** (over-UL risk) | Vegan: REQUIRE controlled iodine source; flag kelp recipes; cap 1100 |
| Potassium | 3,400 / 2,600 mg AI | none (healthy kidneys) | moderate | Jacq's produce exceeds easily; pairs with low-sodium (DASH) for Spencer's BP/longevity | ≥ AI; emphasize produce/legumes; no upper flag |
| Vitamin C | 90 / 75 mg | 2,000 mg | strong | Use as the **iron-absorption pairing** lever for Jacq | Co-locate vit-C with Jacq's iron meals |
| Vitamin A | 900 / 700 mcg RAE | **3,000 mcg (preformed retinol only)** | strong | Jacq's beta-carotene produce = no UL risk; pair w/ fat. **Do NOT tag vitamin A / beta-carotene as skin-cancer-preventive** (high-dose β-carotene raised lung cancer in smokers) | UL flag only vs preformed retinol supplements/liver |
| Omega-3 ALA | 1.6 / 1.1 g | none | strong→moderate | Both: flax/chia/walnut/hemp daily | ALA floor as listed |
| Omega-3 EPA/DHA | ~250–500 mg/day (consensus, NOT IOM-grade) | label ≤2 g | moderate | Spencer via **fatty fish ≥2/wk**; Jacq via **algae-oil supplement** (poor ALA→EPA/DHA conversion). The AHA 1 g/day figure is for established CHD only | Vegan: REQUIRE algae EPA/DHA flag. Primary-prevention omega-3 supplement RCTs largely null — don't overclaim CVD prevention |
| Selenium (vegan) | 55 mcg | 400 mcg | moderate | Jacq: **1 Brazil nut/day** (hard-cap 2 — selenosis risk) | Cap Brazil nuts at 2/day |

### 2C. Cancer prevention — colorectal focus (WCRF/AICR; relevant to Spencer's uncle)

| Topic | Recommendation | Target | Evidence | Source | Constraint |
|---|---|---|---|---|---|
| **Processed meat (CEILING)** | "Very little, if any" — no safe threshold | ~0 g/day; +18% CRC per 50 g/day | **strong** (IARC Group 1 / WCRF convincing) | [WCRF](https://www.wcrf.org/research-policy/evidence-for-our-recommendations/limit-red-processed-meat/); IARC Vol.114 | `processed_meat ≤ 1 serving/wk` (target 0); flag bacon/ham/deli/sausage/salami recipes for Spencer |
| **Red meat (CEILING)** | Limit; favor poultry/fish/legumes | ≤~500 g (18 oz) cooked/wk (~3 portions); +17% CRC per 100 g/day | moderate (WCRF probable) | [WCRF](https://www.wcrf.org/research-policy/evidence-for-our-recommendations/limit-red-processed-meat/) | `red_meat_cooked ≤ 500 g/wk`; avoid heavy charring (HCA/PAH) |
| Whole grains | Default grain to whole | ~90 g/day (~3 servings); −17% CRC per 90 g/day | moderate (WCRF probable) | WCRF CUP / [Vieira 2017](https://www.annalsofoncology.org/article/S0923-7534(19)32133-7/fulltext) | `whole_grain ≥ 3 servings/day`; minimize refined |
| Dairy/calcium | Modest dairy / hit calcium RDA protective | ~1,000 mg/day; −13% CRC per 400 g/day dairy | moderate | WCRF; EPIC | Spencer 1–2 dairy/day OR equiv; Jacq fortified/calcium-set. **Don't exceed ~2,000 mg total** |
| **Alcohol (CEILING)** | For cancer, none is best | 0; +7% CRC per 10 g; convincing in MEN ≥~30 g/day | **strong** (convincing in men) | [WCRF](https://www.wcrf.org/wp-content/uploads/2024/10/Alcoholic-Drinks.pdf) | No positive target; if tracked, target 0; don't present as beneficial |
| Healthy body weight | Avoid adult weight gain | BMI ~18.5–24.9; limit waist | **strong** (convincing) | [WCRF 3rd report](https://www.wcrf.org/wp-content/uploads/2024/11/Summary-of-Third-Expert-Report-2018.pdf) | Support modest deficit via high-satiety meals (Spencer) |
| Physical activity | Convincing protective for COLON cancer | ≥150–300 min/wk mod (or 75–150 vig) + strength 2+ days | **strong** (convincing, colon — weaker for rectal) | WCRF; [WHO 2020](https://www.who.int/publications/i/item/9789240015128) | Behavioral; fuel training w/ protein + whole-grain carbs |
| **Screening (NOT diet)** | Diet does not replace it | Begin CRC screening at 45 (ACS, reaffirmed 2026); personalize for family history | strong | [ACS 2026](https://pressroom.cancer.org/colorectal-cancer-screening-guideline-update-2026) | Surface as clinical prompt; **do NOT surface supplements for cancer prevention** |

### 2D. Cardiometabolic & longevity dietary patterns

| Topic | Recommendation | Target | Evidence | Source | Constraint |
|---|---|---|---|---|---|
| Mediterranean base | Make it the household default pattern | Veg/fruit most meals; legumes most days; EVOO main fat; nuts ~30 g; fish 2+/wk (omni) | strong | PREDIMED [NEJM 2018](https://www.nejm.org/doi/full/10.1056/NEJMoa1800389); AHA 2021/2023 | Tag `mediterranean_aligned`; aim ≥70% of dinners |
| Extra-virgin olive oil | Default added fat; displace butter/tropical | ~1–4 tbsp/day (replacement, not extra) | moderate | [Guasch-Ferré JACC 2022](https://doi.org/10.1016/j.jacc.2021.10.041) | `default_added_fat = EVOO`; flag butter/margarine/coconut/palm for swap |
| DASH + sodium | Layer onto Mediterranean | sodium <2,300 (see 2A); 8–10 veg+fruit/day | strong (for BP) | [DASH-Sodium NEJM 2001](https://www.ncbi.nlm.nih.gov/) | Sodium ceiling only; surface daily total |
| Fish 2×/wk (omni) / algae (vegan) | Oily fish for EPA/DHA | Spencer ≥2 servings/wk; Jacq algae ~250 mg/day + ALA daily | moderate | AHA 2021; FDA/EPA mercury advice | `fatty_fish ≥ 2/wk` (Spencer); vegan algae flag. Low-mercury species |
| Ultra-processed foods | Minimize NOVA-4 | "Minimize" — no numeric cap | associational | [Lane BMJ 2024](https://www.bmj.com/) | Prefer whole/minimally-processed; flag mock-meat-heavy / instant-mix recipes. (Canned beans, frozen veg, fortified plant milk are FINE) |
| Nuts / seeds / legumes | Core protein + fat, most days | Nuts ~30 g/day; legumes ≥3–4/wk (daily on vegan days) | moderate | PREDIMED nut arm; AHA 2021/23 | Count legumes/soy toward protein floor |
| **MIND (brain aging)** | Sensible emphasis, **do NOT claim dementia prevention** | Leafy greens ≥6/wk; berries ≥2/wk | **limited** (null confirmatory RCT) | [MIND RCT NEJM 2023](https://www.nejm.org/doi/full/10.1056/NEJMoa2302368) | Additive emphasis on the Med/DASH base; bigger brain levers = activity, sleep, BP, not smoking |

### 2E. Endurance / running nutrition (Spencer; reconciled with weight-loss deficit)

| Topic | Target | Evidence | Source | Constraint |
|---|---|---|---|---|
| Daily carb periodization | rest 3–5 / easy 5–7 / moderate-hard 6–10 g/kg | strong | AND/DC/ACSM 2016 [26920240](https://pubmed.ncbi.nlm.nih.gov/26920240/); Impey 2018 | `run_day carb ≈ 6 g/kg (~480 g @80 kg)`; `rest_day ≈ 4 g/kg (~320 g)`. Floor on run days |
| Daily protein | 1.6–1.8 g/kg baseline; **1.8–2.2 in deficit** | strong | [ISSN 2017](https://pubmed.ncbi.nlm.nih.gov/28642676/) | Protein ≥1.8 g/kg/day while in weight-loss phase (floor) |
| Per-meal protein | ~0.4 g/kg (30–40 g), every 3–4 h, 3–4×/day | moderate | ISSN 2017; Kerksick [PMC5596471](https://pmc.ncbi.nlm.nih.gov/articles/PMC5596471/) | Each main meal ≥30 g; flag meals <25 g |
| Pre-run fueling | 1–4 g/kg carb, 1–4 h pre (smaller/shorter for easy runs) | strong | AND/DC/ACSM 2016; Kerksick 2017 | Run-day pre-run-window meal ≥1 g/kg carb; lower-fiber/fat in that slot |
| During-run carb | 0 g/h if <~75 min; 30–60 g/h only if >75–90 min | strong | AND/DC/ACSM 2016 | Do NOT auto-add fuel for runs <75 min |
| Post-run recovery | ~20–40 g protein + carb; no aggressive same-day refuel (runs ≥48 h apart) | moderate | Kerksick 2017 | First meal after run ≥30 g protein + carb |
| Deficit reconciliation | −300–500 kcal/day; 0.5–1.0%/wk; energy availability ≥30 (ideally ~45) kcal/kg FFM | moderate | [Aragon ISSN 2017](https://doi.org/10.1186/s12970-017-0174-y); IOC RED-S 2018/2023 | Cut on rest days (carb/fat), protect run-day carbs + protein floor. Never below LEA threshold |
| Dietary fat floor | 20–35% energy; not below ~20% | moderate | AND/DC/ACSM 2016 | Fat fills remaining kcal after carb/protein; keep ≥20% |

### 2F. Weight management (Spencer)

| Topic | Target | Evidence | Source | Constraint |
|---|---|---|---|---|
| Rate of loss | 0.5–1 kg/wk; initial goal up to 5–10% body weight | strong | [NHLBI 1998](https://www.ncbi.nlm.nih.gov/books/NBK2004/) | `weight_loss_rate 0.5–1 kg/wk` (Spencer only; NOT Jacq) |
| Deficit size | ~500 kcal/day (300–750); avoid >750–1000 in a runner | strong | NHLBI; ACSM 2009 | `floor = maintenance − ~500`; floor-to-hit, not hard cap |
| Protein in deficit | 1.6–2.2 g/kg total body weight | strong | [Morton 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5867436/) | (Note: the 2.3–3.1 g/kg figure is per **fat-free mass** for lean lifters — do NOT apply to a runner) |
| Fiber for satiety | 14 g/1000 kcal (Spencer ~38, Jacq ~25) | moderate | Howarth 2001 | See fiber row 2A |
| Energy availability / REDs | Don't crash-diet; deficit on rest/easy days | moderate | [IOC REDs 2023](https://bjsm.bmj.com/content/57/17/1073) | No deficit on hard/long-run days |
| Resistance training | 2–3 sessions/wk | strong | ACSM; WHO | Habit target, not a meal rule (Spencer) |
| Activity volume | ~250–300 min/wk MVPA for loss + maintenance | strong | [ACSM 2009](https://journals.lww.com/acsm-msse/fulltext/2009/02000/appropriate_physical_activity_intervention.26.aspx) | Weekly active-minutes target |
| Adherence | Sustainable high-protein/high-fiber pattern; weekly trend not daily noise | moderate | AND; ISSN 2017 | Frame targets as floors; no over-target/red warnings |

### 2G. Hydration

| Topic | Target | Evidence | Source | Constraint |
|---|---|---|---|---|
| Baseline total water | Spencer 3.7 L/day (~3.0 from drinks); Jacq 2.7 L (~2.2 from drinks) | strong | [NASEM 2005 DRI](https://www.nationalacademies.org/our-work/dietary-reference-intakes-for-electrolytes-and-water/); [CDC](https://www.cdc.gov/nchs/products/databriefs/db242.htm) | Credit food moisture + all beverages; floor/goal, **do not warn on exceeding**. ~20% from food (approx) |
| Day-to-day guide | Thirst + pale-yellow urine, not a fixed cup count | moderate | NASEM 2005; WUT/Armstrong | AM prompt; don't nag if thirst + urine normal. (Riboflavin/B12 brightens urine — note for Jacq) |
| "8×8" myth / what counts | No fixed glass count; coffee/tea count; food counts | moderate | Valtin 2002; NASEM 2005 | Credit water/coffee/tea/milk/broth/high-water food; **exclude alcohol**; flag SSBs vs Spencer's sugar/weight goal |
| Runner pre/during/post (Spencer) | Pre ~400–600 mL (2 h); during 0.4–0.8 L/h only if >60 min; post ~1.25–1.5 L per kg lost + sodium | moderate | [ACSM 2007](https://www.researchgate.net/publication/6526394) | Gate by run duration; **never plan intake exceeding sweat losses** (hyponatremia risk). Drink to thirst toward target |
| Electrolytes | Plain water <60–75 min; sports drink (Na ~300–600 mg/h, 6–8% CHO) only on long/hot | moderate | ACSM 2007; ISSN | Gate sugary drinks behind duration/heat so they never appear on short/easy runs |

### 2H. Sleep (Jacq's sleep-maintenance difficulty; both for duration)

| Topic | Target | Evidence | Source | Constraint |
|---|---|---|---|---|
| Adult duration | 7–9 h/night (≥7 floor) | strong | [AASM/SRS 2015](https://jcsm.aasm.org/) | Informational target, both |
| Short sleep & appetite (Spencer) | ≥7 h supports the deficit (~+385 kcal next-day intake when restricted) | moderate | Al Khatib 2017 | Flag short-sleep nights as higher snack-risk |
| **CBT-I (first-line for Jacq)** | Multicomponent CBT-I, 4–8 sessions; chronic = ≥3 nights/wk for ≥3 mo | **strong** (only strong rec) | [AASM 2021](https://jcsm.aasm.org/) | Clinical referral — NOT a pill or tea |
| Stimulus control | "Quarter-hour rule"; bed for sleep/sex only; no clock/phone | strong | AASM 2021 | Behavioral; most specific to night waking |
| Consistent wake + AM light | Fixed wake 7 days/wk; 15–30 min morning light | moderate | AASM/NSF | Habit; anchor by wake time |
| Cool/dark/quiet room | ~60–67 °F comfort range, dark, quiet | limited | NSF | If night sweats prominent → clinician (hormonal cause) |
| **Alcohol timing** | No alcohol within ~3–4 h of bed (high-yield for Jacq's 2–4am waking) | **strong** | [Colrain 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC5821259/) | Evening-beverage flag; the "nightcap" worsens maintenance |
| Caffeine timing | Last caffeine ~9 h before bed (~13 h for ~200 mg pre-workout) | moderate | [Gardiner 2023](https://www.sciencedirect.com/) | Flag caffeinated items after ~14:00; pre-workout AM only |
| Sleep hygiene alone | Adjunct only — escalate to CBT-I if waking persists | strong | AASM 2021 (recommends against standalone) | Don't let Jacq cycle tips for months |
| Wind-down / screens | 30–60 min dim, low-stim; warm bath ~1–2 h pre | limited | NSF; Haghayegh 2019 | Pairs with stimulus control |
| Magnesium | Food first (RDA 320 mg Jacq); supplement ≤350 mg if used | limited | NIH ODS; Mah 2021 | **Not a proven sleep fix; don't oversell.** Kidney caution |
| Tart cherry / chamomile / valerian / L-theanine | Low-risk evening trials; modest-at-best, target onset not WASO | limited | small RCTs | Optional; account for sugar (cherry). Chamomile: ragweed allergy + anticoagulant caution. Valerian: not with alcohol/sedatives |
| **Melatonin** | Wrong tool for maintenance — for onset/circadian; low dose 0.5–3 mg early evening | moderate | [AASM 2017](https://jcsm.aasm.org/) (weak rec against) | Tell Jacq it likely won't help her staying-asleep problem |
| Doctor / red flags (Jacq) | Review if ≥3 nights/wk for ≥3 mo, or night sweats/snoring/leg restlessness. **~40 → possible perimenopause** (clinician-confirmed) | expert_opinion | AASM; menopause-sleep lit | Clinical |

### 2I. Physical activity & healthy aging (both; biggest non-diet lever)

| Topic | Target | Evidence | Source | Constraint |
|---|---|---|---|---|
| Core aerobic | 150–300 min/wk moderate (or 75–150 vig); aim upper half | strong | [WHO 2020](https://www.ncbi.nlm.nih.gov/books/NBK566046/) | Spencer already meets via runs |
| **Resistance training** | ≥2 days/wk, all major muscle groups | strong | WHO; [NSCA 2019](https://journals.lww.com/nsca-jscr/fulltext/2019/08000/resistance_training_for_older_adults__position.1.aspx) | **Spencer's key gap**; ≥2 sessions/wk |
| Combined aero+strength | Do both in the same week | moderate | [Momma 2022](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9209691/) | `compliant = aerobic≥150 AND strength≥2` |
| Cardiorespiratory fitness | ~1 vigorous/interval session/wk | moderate | [Mandsager 2018](https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2707428) | Serves Spencer's performance + longevity |
| Exercise + Parkinson's | Sustain MVPA, aerobic 3+ days/wk | **associational** | [J Neurol 2024](https://link.springer.com/article/10.1007/s00415-024-12672-y) | "May help, won't hurt" — do NOT claim prevention |
| Strength for running | 2×/wk lower-body + 1 explosive; separate from hard runs | moderate | concurrent-training reviews | Don't schedule heavy legs same day as hard/long run |
| Balance/functional | ≥3 days/wk (grows with age) | moderate | WHO 2020 | ≥1 balance element in strength sessions |
| Sedentary breaks | Break up sitting hourly | moderate | WHO 2020 | Scheduling reminder (Spencer's desk days) |
| Bone loading | Impact (running) + resistance (spine/upper body) | moderate | NSCA; PAG | Covered by strength + running |
| Evening exercise (Jacq) | Only avoid VIGOROUS within ~1–2 h of bed; moderate is fine | limited | Nat Commun 2025 | Activity-timing note for Jacq |

---

## 3. Per-person prescription DRAFTS

> Drafts, grounded in §2. Numbers below assume an ~80 kg reference for Spencer; the app should recompute from each member's actual `reference_weight_kg`. Where a body-weight target is used during weight loss, anchor to **reference weight**, not current.

### 3A. Spencer (42M, omnivore, runner — weight-loss + running + longevity + family history of colon cancer, Parkinson's, skin cancer)

**Calorie / macro / fiber frame (per day):**
- **Energy:** maintenance (EER) **−300 to −500 kcal**, concentrated on the 4 rest days (Mon/Wed/Fri/Sun). Run days (Tue/Thu/Sat) sit near maintenance with carbs protected. Never push a training day below energy availability ~30 kcal/kg FFM. *(2A, 2E, 2F)*
- **Protein:** floor **1.6 g/kg (~128 g)**, stretch 2.0 (~160 g) while dieting; 30–40 g across 3–4 meals; flag any main meal <25 g. This single lever both preserves lean mass in the deficit and clears the aging floor. *(2A, 2E, 2F)*
- **Carbs (periodized):** run-day **~6 g/kg (~480 g)**, rest-day **~4 g/kg (~320 g)**; ≥130 g floor always; the 6–10 g/kg top band only on his longest/hardest single session. *(2A, 2E)*
- **Fat:** fills the remaining kcal at **20–35%**, never <20%; bias unsaturated (EVOO, nuts, fish). Saturated fat **<10%, stretch ≤6%** for longevity. *(2A, 2D)*
- **Fiber:** **≥38 g/day** (the harder target on an omnivore + calorie-restricted day — lean on legumes, whole grains, fruit, veg). Back off fiber in the pre-run meal. *(2A, 2C, 2F)*

**Weekly food-pattern rules (machine-enforceable):**
- Fatty fish **≥2×/week** (EPA/DHA; longevity). *(2B, 2D)*
- Whole grains **≥3 servings/day**, default grain = whole. *(2C, 2D)*
- Cruciferous / leafy greens near-daily (≥6 leafy servings/wk), berries **≥2/wk**. *(2D)*
- Legumes most days; nuts ~30 g/day. *(2D)*
- **Processed meat ~0** (hard limit, ≤1 serving/wk); **red meat ≤~500 g cooked/wk** (~3 portions); favor poultry/fish/legumes. *(2C)* ← highest-leverage dietary lever for his colon-cancer history.
- **Added sugar ≤36 g/day** and ≤10 g/meal (excluding intra-run fuel); **sodium <2,300 mg/day**; **alcohol → as low as possible** (best 0 for cancer). *(2A, 2C)*

**Run-day vs rest-day note:** the planner already splits `run_day`/`rest_day` targets. The reconciliation rule is structural — **carbs and protein stay high on run days; the calorie cut lands on rest days via fat + discretionary carbs.** Pre-run-window meal ≥1 g/kg carb (low-fiber/fat); no in-run fuel under 75 min; first post-run meal ≥30 g protein + carb. Hydration: pre ~400–600 mL; on long/hot runs only, electrolytes + sweat-loss replacement. *(2E, 2G)*

**Non-nutrition levers that matter MORE than diet for his specific goals (surface as coaching, not meal rules):**
1. **Strength training 2–3×/week** — his single biggest *missing* lever: protects lean mass in the deficit, supports running economy/durability, and is the aging/bone insurance guidelines call for. Separate heavy legs from hard runs. *(2F, 2I)*
2. **Colon cancer:** **on-schedule screening** dominates — discuss timing with his doctor at/before 45 given the uncle (a single 2nd-degree relative usually doesn't mandate earlier screening, but specifics can). Diet (fiber, less red/processed meat) and activity are real but secondary. *(2C, 2I)*
3. **Skin cancer (maternal side):** **UV protection is the whole game** — sunscreen SPF 30+ before outdoor runs (reapply on long ones), hat/sleeves/sunglasses, run early/evening to dodge peak UV, never tanning beds, periodic skin self-exams. **No food prevents melanoma.** *(see §4)*
4. **Parkinson's:** **regular moderate-to-vigorous aerobic exercise** is the best-supported modifiable signal (and male-skewed, favoring him). His running already does this — keep MVPA up rather than drifting to only light activity. Coffee, berries, a Mediterranean pattern are low-regret "keeps," not proven prevention. Garden-pesticide safety is actually Jacq's lever (below). *(see §4)*

**Strong vs speculative for Spencer:** *Strong* = protein floor, carb periodization, fiber/whole-grain target, processed-meat limit, alcohol limit, weight-loss rate/deficit, strength training, UV protection, CRC screening. *Speculative/associational* = any specific food's effect on Parkinson's or melanoma, MIND-diet brain benefit, omega-3 *supplements* for CVD events.

### 3B. Jacq (~40F, vegan, avid gardener — maintenance energy; sleep-maintenance difficulty)

**Vegan nutrient-adequacy MUSTS (the non-negotiables a vegan plan must cover):**
- **Vitamin B12 — mandatory supplement** (50–100 mcg/day or 1000 mcg 2×/wk cyanocobalamin). The single most important rule; plant foods don't supply it. *(2B)*
- **Iodine** — iodized salt or a measured 150 mcg supplement (NOT unmeasured kelp). *(2B)*
- **Vitamin D** — lichen-derived vegan D3 to 600–800 IU, emphasized in winter. *(2B)*
- **Algae-oil EPA/DHA** ~250–500 mg/day + daily ALA (flax/chia/walnut/hemp). *(2B, 2D)*
- **Iron** — aim ~32 mg dietary from legumes/tofu/fortified grains/greens; **pair with vitamin C, keep coffee/tea away from iron meals**; test ferritin before any supplement. *(2B)*
- **Zinc** ~12 mg via soaked/sprouted/fermented legumes & grains + seeds. *(2B)*
- **Calcium** 1,000 mg from calcium-set tofu, fortified plant milk, low-oxalate greens (kale/bok choy — not spinach). *(2B, 2C)*
- **Selenium** — 1 Brazil nut/day (cap 2). *(2B)*

**Macro / fiber / calorie frame:**
- **Energy: maintenance, NO deficit.** Do not impose Spencer's weight-loss logic on her plan. *(2F)*
- **Protein:** ~0.9–1.0 g/kg/day; legume/soy/seitan anchor in ≥2 meals/day (varied over the day — no per-meal "combining" needed). Her garden over-indexes on low-protein produce, so the planner must keep a protein anchor each day. *(2A)*
- **Fiber:** ≥25 g/day — easily exceeded on her vegan, garden-heavy diet; her produce gluts are an asset. *(2A)*
- **Fat:** 20–35%, daily ALA source; watch coconut oil (saturated). *(2A)*
- **Sodium <2,300 mg** (watch high-sodium vegan convenience items, soy sauce, miso, mock meats); **added sugar ≤25 g/day** (sweetened plant milks/yogurts/granola). *(2A)*
- Pattern: a plant-only Mediterranean/MIND fit — legumes/beans/EVOO/vegetables-forward, naturally vegan; keep helpful processed staples (fortified plant milk, tofu, canned beans) but limit ultra-processed mock meats. *(2D)*

**Sleep section (whole-health, not just food):** Her problem is **staying asleep**, which changes the toolkit — most "sleep" supplements/teas target *onset*, not maintenance.

*Routine / behavioral (highest yield, start now):*
1. **No alcohol within ~3–4 h of bed** — likely the single biggest dietary contributor to her 2–4am waking; trial alcohol-free evenings as both test and treatment. *(2H)*
2. **Stimulus control** ("quarter-hour rule": out of bed if awake >15–20 min, dim/quiet activity, back when sleepy; bed for sleep/sex only; clock turned away). *(2H)*
3. **Fixed wake time 7 days/wk + 15–30 min morning light.** *(2H)*
4. **Caffeine cutoff early-to-mid afternoon** (~9 h before bed; includes caffeinated teas). *(2H)*
5. **Cool, dark, quiet room**; rule out overheating (layered bedding). *(2H)*
6. **Front-load fluids earlier**; taper beverages 2–3 h pre-bed to limit nocturia. *(2G)*
7. **CBT-I is the first-line, guideline-strong treatment** for chronic night waking (≥3 nights/wk for ≥3 mo) — pursue a CBT-I clinician or validated digital program. Sleep hygiene alone is adjunct, not a cure. *(2H)*

*Evidence-graded tea/supplement options (all LOW-evidence, low-risk — adjuncts to the above, never substitutes, and they target onset more than maintenance):*

| Option | Evening dose | Evidence | Safety flag |
|---|---|---|---|
| Magnesium (food first) | Food RDA 320 mg; supplement ≤350 mg (glycinate) | limited | **Kidney impairment → no supplement without a doctor.** Not a proven sleep fix |
| Tart (Montmorency) cherry | juice/concentrate, evening | limited | Sugar/calories — use diluted concentrate |
| Chamomile tea | 1 cup | limited | Ragweed/daisy allergy cross-react; mild anticoagulant interaction |
| L-theanine | 100–400 mg | limited | Generally very safe; theoretical BP-med additive lowering |
| Valerian | 300–600 mg | limited | Rare hepatotoxicity; **never with alcohol/sedatives** |
| **Melatonin** | 0.5–3 mg early evening | moderate (weak rec against for insomnia) | **Wrong tool for her** — targets onset/circadian, not staying asleep; unregulated potency |

*Clinical:* at ~40, **discuss possible perimenopausal sleep changes** and CBT-I access with a clinician; rule out apnea/RLS/thyroid. This is likely her single most valuable next step. *(2H)*

**Garden safety (Jacq-specific, highest-leverage household environmental item):** as an avid gardener she should **avoid rotenone- and paraquat-class pesticides** (strongest, most causal-leaning Parkinson's associations), use gloves/ventilation, follow label safety. Note "organic" does not guarantee rotenone-free. *(see §4)*

---

## 4. Evidence-honesty callouts (where the app must NOT overclaim)

The app must point to the bigger lever and refuse to imply diet does what it doesn't:

1. **Skin cancer / diet — DO NOT imply any food, tea, or supplement prevents melanoma.** UV exposure (sun + tanning beds, IARC Group 1) is the dominant, established cause; WCRF found no dietary factor reaching a causal grade. The levers are **sunscreen, clothing/shade, avoiding tanning beds, and skin surveillance** — more important for Spencer given maternal-side history, not less. Specifically: do NOT tag vitamin A / beta-carotene as skin-protective (high-dose β-carotene *increased* lung cancer in smokers); do NOT recommend antioxidant/retinol supplements for skin cancer (RCTs show no benefit). Nicotinamide 500 mg 2×/day is a *clinician-directed secondary* measure only if he later develops non-melanoma skin cancers — not primary prevention. Frame fatty fish under cardiovascular/longevity goals, never skin cancer.

2. **Parkinson's / diet — DO NOT claim diet prevents Parkinson's.** The best-supported modifiable lever is **regular moderate-to-vigorous exercise** (associational for prevention, with reverse-causation caveats; RCT-grade only for slowing progression in people who already have PD). Coffee/caffeine, berries/flavonoids, and the Mediterranean pattern are low-regret "associated with lower risk" items — never "prevents." The strongest, most causal-leaning environmental signal is **pesticide exposure** (paraquat/rotenone) — Jacq's gardening is the actionable point. Note most PD dietary signals are male-skewed (Spencer carries the family history). Don't push caffeine on Jacq — it harms her sleep.

3. **Colon cancer / diet vs screening — diet complements but never replaces SCREENING.** Whole grains/fiber and less red/processed meat are real WCRF levers, but on-schedule colonoscopy (per his clinician, given the uncle), healthy weight, activity, and limiting alcohol are at least as important. Do not surface supplements for cancer prevention.

4. **The fiber AI is CHD-based, not a cancer threshold.** The 38/25 g numbers were set on coronary-heart-disease grounds; the colorectal benefit is a separate WCRF "probable" stream. Don't present the cancer benefit as established on the strength of the IOM number.

5. **Supplements are not a sleep cure, and magnesium is not a sleep treatment.** For Jacq's *maintenance* insomnia, CBT-I + behavior (alcohol/caffeine/stimulus control) are the levers; teas/supplements are low-evidence adjuncts that mostly target onset. Melatonin is the wrong tool for staying asleep.

6. **Omega-3 *supplements* don't have proven hard-outcome CVD benefit** (primary-prevention RCTs largely null). Frame fish/algae as nutrient-adequacy (EPA/DHA status), not event prevention. The AHA 1 g/day figure is for established CHD under medical care only.

7. **Hydration is not a sleep remedy** and not a disease preventive. Don't surface water intake as a fix for Jacq's sleep; late large fluid loads can worsen nocturia.

8. **MIND diet ≠ proven dementia prevention** (confirmatory RCT null). Sensible, low-risk emphasis only.

---

## 5. What becomes a machine constraint vs human advice

### 5A. PLANNER-ENFORCEABLE (numeric targets + weekly food-pattern frequencies the meal engine can compute and gate on)

**Floors-to-hit** (flag UNDER, never warn on over):
- Calories (per member, run/rest/maintenance), protein (g/kg → g), fiber (g), carbs (≥130 g + periodized g/kg by run/rest day), fat ≥20% energy.
- Micronutrient adequacy targets (B12, D, iron, calcium, zinc, iodine, ALA, etc.), with **vegan completeness rules** (require B12 / iodine / algae-EPA-DHA / D supplement flags on Jacq's plan; iron-meal vitamin-C pairing).

**Ceilings** (the only places an over-limit warning is correct):
- Sodium <2,300 mg/day; saturated fat <10% (Spencer ≤6%); added sugar ≤10 g/meal + daily cap (Spencer 36, Jacq 25, excluding intra-run fuel); processed meat ~0 / ≤1 serving/wk; red meat ≤~500 g cooked/wk (Spencer); alcohol → 0/track. Micronutrient ULs (don't design menus/supplements above them).

**Weekly food-pattern frequencies** (recipe-tag gating):
- Fatty fish ≥2/wk (Spencer); whole grains ≥3 servings/day; legumes most days; nuts ~30 g/day; leafy greens ≥6/wk; berries ≥2/wk; `mediterranean_aligned` ≥~70% of dinners; default added fat = EVOO (flag butter/tropical for swap); flag ultra-processed/mock-meat-heavy recipes.

**Conditional / contextual logic:**
- Run-day vs rest-day target swap (already in the model); pre-run-window meal carb ≥1 g/kg + low-fiber/fat; no in-run fuel <75 min; post-run meal ≥30 g protein; sweat-loss-based hydration only on long/hot runs; caffeine-after-14:00 flag; evening-alcohol flag.

### 5B. COACH-STYLE NUDGES (human advice the app surfaces but cannot enforce as a meal rule)

- **Hydration day-to-day** (thirst + urine color over a hard cup count; AM prompt, no nagging).
- **Sleep routine** (CBT-I referral, stimulus control, fixed wake time, morning light, cool room, wind-down) — clinical/behavioral, outside the meal planner.
- **Sun protection** (sunscreen before outdoor runs, clothing/shade, no tanning beds, skin checks).
- **Exercise** (strength 2×/wk — Spencer's key gap; ~250–300 min/wk MVPA; ~1 vigorous session; balance work; separate heavy legs from hard runs; break up sitting).
- **Screening / clinical** (CRC screening timing; perimenopause + CBT-I conversation for Jacq; ferritin/B12/25-OH-D testing before supplementing; review supplements/herbs for interactions).
- **Garden pesticide safety** (avoid rotenone/paraquat-class — Jacq).
- **Behavioral framing** (weekly weight trend not daily scale; alcohol-light evenings; "keep your coffee" for Spencer but not for Jacq).

> **Rule of thumb for the agent:** if it's a number the recipe/nutrition engine can sum or a recipe tag it can count, it's a constraint (§5A). If it's a behavior, a clinical action, or a "see your doctor," it's a nudge (§5B) — surfaced as context, never converted into an over-target warning.
