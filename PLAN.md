# Harbor — Project Plan

**A personal health tracker. The meal planner is Module 1.**

The Claude design handoff (`extracted/design_handoff_harbor_meal_planner/`) gives us a high-fidelity meal-planning module. We build that first, but we lay the foundation — schema, app shell, and agents — so the running coach, weight management, sleep, and Apple Health modules slot in later without a rewrite.

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| App | **Expo (React Native + TypeScript)** | Real installable iPhone app; only a native app can read Apple Health; one codebase (also Android/web); the prototype's JS logic ports over directly |
| Navigation | **Expo Router** | File-based; a home shell that can grow new modules as tabs/sections |
| Backend | **Supabase** (Postgres + Auth + Realtime + Row-Level Security) | Accounts, the relational data model, and live sync between the two phones |
| AI | **Anthropic API, `claude-opus-4-8`** for Coach + Nutritionist | Cross-domain reasoning quality; ~a few $/month at 2 users |
| AI hosting | **Supabase Edge Functions** (Deno/TS) | The Anthropic key lives here — **never in the app** |

```
 Expo app (iOS) ──HTTPS──> Supabase
   │  UI, navigation         ├─ Postgres (data, RLS)
   │  HealthKit reads ──────▶├─ Auth (2 accounts, 1 household)
   │  (later)                ├─ Realtime (shopping checkoffs sync)
   └─ Coach/Nutritionist ───▶└─ Edge Functions ──> Anthropic API (Opus 4.8)
```

---

## 2. Data model

### 2a. The food spine (core of the meal module)

The deliberate three-layer model from the handoff — keep it intact:

> **Recipe** → **Ingredient line** (abstract component) → **Product** (real purchasable item with a nutrition label)

| Table | Key fields | Notes |
|---|---|---|
| `ingredient` | id, key, label, pantry (bool) | Abstract catalog component ("cooked green lentils") |
| `product` | id, ingredient_id, store, brand, size, price, **serving_size + unit**, **nutrition (per serving)**, note | Where real labels live; price `null` = pantry/on-hand |
| `recipe` | id, name, slot, time, servings, img, vegan, tags[], note | |
| `recipe_line` | id, recipe_id, ingredient_id, **quantity, unit**, position | Ordered lines; quantity lives here, not on the ingredient |
| `product_selection` | household_id, ingredient_id, product_id | Which product fills a line; drives nutrition **and** shopping |

> **Production refinement (the handoff's #1):** store nutrition **per the product's own serving**, store the recipe line's **quantity + unit**, and **compute** scaled nutrition. The prototype pre-scales nutrition to the line amount — we don't.

Per-serving recipe nutrition = Σ over lines ( selected product's nutrition × line quantity ÷ serving size ) ÷ recipe.servings.

### 2b. Household, members, targets

| Table | Key fields | Notes |
|---|---|---|
| `household` | id, name | |
| `member` | id, household_id, auth_user_id, name, diet, accent_color, role | `auth_user_id` links to Supabase auth — **login drives who you see** |
| `target` | id, member_id, kind (run_day / rest_day / maintenance), kcal, protein, carbs, fat, fiber | Editable per member; run-day vs rest-day overrides |

### 2c. The meal plan ("moment" model, generalized)

The handoff's per-person day model, but as a clean join table that scales past 2 people:

| Table | Key fields | Notes |
|---|---|---|
| `moment` | id, household_id, date, label, position, mode (shared / separate), **cooked_servings (nullable, reserved)** | One eating occasion; `cooked_servings` stays null/derived in v1 — set higher later to cook extra |
| `moment_assignment` | moment_id, member_id, recipe_id (nullable), **servings (eaten, default 1)**, **leftover_source (nullable, reserved)** | One row per participant; shared = same recipe for all; no row = skips. `servings` drives that person's nutrition |

Derived helpers (port the prototype's logic exactly): `participates`, `recipe for (moment, member)`, `meals for (member, day)`, `sum nutrition (member, day)`, meal count. Mutations: set recipe, toggle together/just-me, add meal, remove meal.

> **Leftover-ready, shipping simple (decided):** `servings` (eaten) is live in v1; `cooked_servings` / `leftover_source` are reserved nullable fields that stay empty in v1 (every meal is a fresh cook). Turning leftovers on later is additive — set `cooked_servings` above what's eaten to create a surplus, then point a future assignment's `leftover_source` at that cook so it counts for nutrition but is **skipped by the shopping list**. No breaking migration.

### 2d. Shopping

Generated, not stored: walk every planned meal → its recipe lines → each line's selected product → dedup + sum by product → group by store → tag by who eats it. Only checkoff state persists:

| Table | Key fields | Notes |
|---|---|---|
| `shopping_check` | household_id, week, product_id, checked | **Realtime** — check at the store, it updates on the other phone |

### 2e. Reserved seats for the other modules (not built in M1, schema-ready)

| Table | For | Source |
|---|---|---|
| `activity_log` | Running coach | manual now, HealthKit later |
| `weight_log` | Weight management | manual now, HealthKit later |
| `sleep_log` | Sleep | HealthKit later |
| `biometric` | resting HR, etc. | HealthKit later |

All hang off `member`. The Coach's "read my day" snapshot is shaped to include these from the start — empty today, populated later.

---

## 3. App shell & screens

A home shell (Expo Router) that holds modules. **Module 1 lights up the meal screens; the rest are reserved nav slots.**

- **Now (meal module):** Plan · Recipes (library) · Recipe detail · Shopping · Coach · Nutritionist
- **Reserved:** Running · Weight · Sleep (added in later milestones)

Login drives identity: when you log in you see your run-day targets and meals; your girlfriend sees her vegan-maintenance plan. The household pieces (shared meals, combined shopping) are shared; the health-tracker pieces (running/weight/sleep) are personal.

**Design tokens** (from the handoff): default to **Look A · Coastal** (teal, 18px radius). Member colors: you = theme accent, girlfriend = coral. Fonts: Hanken Grotesk (UI) + Spline Sans Mono (numerics/labels).

---

## 4. Agents (Coach + Nutritionist)

Each runs as an Edge Function on `claude-opus-4-8`, replacing the prototype's pattern-matched stubs.

- **Shared context builder** — assembles a structured snapshot: the viewed person's day (meals + computed per-serving nutrition), their targets, and health profile. Shaped to also carry activity/weight/sleep once those exist.
- **Coach** — conversational, science-forward; given **tools** to actually act: read the plan, swap/add/remove a meal, clear a day (travel), read/update weigh-ins & runs, read/update goals (and later, read HealthKit). This is the cross-domain through-line of the whole app.
- **Nutritionist** — analytical review of the *live* plan → findings with severity + citation; "Bring into Coach chat" handoff (the agents are connected).
- **Cost/latency** — prompt-cache the system prompt + recipe/ingredient catalog + health profile. Key stays server-side.

---

## 5. Recipe input & serving scaling

### Getting recipes in (the prototype hardcodes ~8 — we need real input)

1. **Manual recipe editor** — a form: name, slot, **base servings**, tags; add ingredient lines (ingredient + quantity + unit). The always-there baseline.
2. **AI-assisted import (the convenience win, reuses Opus 4.8)** — paste a recipe URL or raw text; an extraction step parses it into recipe + ordered ingredient lines (qty, unit, ingredient) + base servings. Unknown ingredients get created and mapped to a default product; that product's nutrition comes from a **food database** (USDA FoodData Central / Open Food Facts), with an LLM estimate as fallback.
3. **Seed catalog** — import the prototype's recipes + a curated starter set so day one isn't empty.

Recurring hard part for all three: mapping each line's abstract ingredient to a **product with a real label** (nutrition + price). LLM normalizes the text; the food database supplies the numbers.

### Scaling for 1 or 2 people

Store every recipe at its **natural yield** (`recipe.servings`) and scale at **plan time** — never rewrite the recipe. Two distinct scalings:

- **Consumption → nutrition:** servings a person *eats* (on `moment_assignment`, default 1). Their nutrition = recipe total ÷ base servings × servings eaten.
- **Batch → shopping:** servings actually *cooked*. Buy quantity = line qty × (cooked servings ÷ base servings), summed across the plan.

Nuance to bake in: **nutrition scales exactly (fractional ok); shopping rounds up to purchasable units.** You can eat half a can's worth (nutrition = 0.5 can) but you buy a whole can.

---

## 6. Milestones

- **M0 — Foundations.** Repo; Expo app + Expo Router shell; Supabase project; auth (two accounts, one household); theme/design tokens; member-switch driven by login.
- **M1 — Data model + seed.** Implement the schema above; migrate the prototype's sample recipes/ingredients/products/day as seed data; RLS so household members see shared data.
- **M2 — Meal module UI.** The five screens on real data: Plan (targets + day), Recipes library, Recipe detail (product picker → live computed nutrition), Shopping (generated, grouped, realtime checkoff). Plus a **manual recipe editor** and **plan-time serving scaling**. Manual weigh-in/run entry stub in Coach.
- **M2.5 — AI-assisted recipe import.** Paste URL/text → Opus 4.8 extracts a structured recipe; ingredient→product mapping + nutrition lookup from a food database.
- **M3 — Agents.** Coach + Nutritionist via Edge Functions on Opus 4.8 with real tools (read/mutate plan, measurements, goals); live Nutritionist review; agent handoff.
- **M4 — Apple Health backbone.** HealthKit reads (steps, active energy, weight, resting HR, workouts) via Expo native module → sync to Supabase; auto-fill run days + weight trend; Coach reads it.
- **M5+ — Running / Weight / Sleep modules.** Dedicated screens on top of the now-populated health data; Coach reasons across domains.

---

## 7. Product decisions to confirm (not blocking)

- ✓ **Leftovers / batch cooking — decided:** build leftover-ready, ship simple first (see §2c). `servings` live in v1; `cooked_servings` / `leftover_source` reserved as nullable, off in v1.
- **Recipe-import nutrition source:** food database (USDA FoodData Central / Open Food Facts) vs LLM estimate as the default label for a newly imported ingredient.
- **"Together" semantics:** soft flag (split = independent copies, the prototype's behavior) vs hard link (edit once, updates for both). The handoff flags this as a user decision.
- **Theme:** ship one look (recommend Look A · Coastal) or keep the A/B toggle.
- **Targets source:** how run days are determined long-term (manual vs driven by HealthKit activity).
