# Handoff: Harbor — Personal Health & Meal Planner

## Overview
Harbor is an all-in-one personal health web app for a 42-year-old runner who is losing weight, training for runs, and managing long-term preventative health (colon cancer family history, Alzheimer's/Parkinson's risk, healthy aging). It is also a **household** planner: the primary user (Jordan) plans alongside a partner (Mara) who does the cooking and shopping and eats vegan. Each person keeps their own goals and their own daily meal structure, while the grocery list combines into one shopping run.

The centerpiece is the meal planner, built on a deliberate **three-layer food model**:

> **Recipe** (e.g. "1 cup cooked green lentils") → **Ingredient line** (the abstract component) → **Product** (the specific purchasable item with a real nutrition label, e.g. "365 Organic Green Lentils, 16 oz, $2.49").

A recipe specifies *what* (an ingredient line and a quantity). The product layer decides *which actual item* fills that line — chosen from a default or from products available at the user's local stores (Whole Foods, Target, King Soopers/Kroger, Trader Joe's, or online). Nutrition and price are computed from the **selected product**, not the abstract ingredient, so calories/macros/fiber are only as accurate as the product chosen.

The app also includes two AI agents: a **Coach** (conversational, science-forward) and a **Nutritionist** (analytical plan reviewer).

## About the Design Files
The files in this bundle — `Harbor Meal Planner.dc.html` and its runtime `support.js` — are a **design reference created in HTML**. They are an interactive prototype demonstrating the intended look, structure, data model, and behavior. **They are not production code to copy directly.**

`Harbor Meal Planner.dc.html` is a "Design Component" — a single-file format where a template (markup with `{{ }}` holes and `<sc-for>`/`<sc-if>` control flow) is paired with a logic class (`class Component extends DCLogic`). `support.js` is the runtime that renders it. You do **not** need to reuse this format. Treat the file as a spec: the **logic class is the most valuable artifact** — it contains the complete data model, the sample data, and every state transition, written in plain JavaScript you can read directly.

Your task: **recreate these designs in a real, production stack of your choosing.** There is no existing codebase yet, so pick an appropriate environment. A suggested stack is at the end of this document. Wire it to a real database (the data model below maps cleanly to relational tables) and replace the rules-based agents with real LLM calls.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions are all specified and implemented in the prototype. Recreate the UI faithfully using your stack's component library, then connect it to real data and services. The exact design tokens are listed near the end.

---

## The Data Model (most important section)

Implement this first; everything else hangs off it. Types below are TypeScript-ish pseudocode.

### Nutrition
A nutrition value object, expressed **per the ingredient-line quantity** (i.e. per the amount the recipe calls for), or per a product's defined serving. In the prototype every nutrition object is per ingredient-line amount.
```
Nutrition { kcal, protein, carbs, fat, fiber, sodium }   // grams except kcal & sodium(mg)
```

### Product
A specific, purchasable item that can fill an ingredient line. This is where real-world nutrition labels live.
```
Product {
  id: string,            // e.g. "lentils.wf"
  store: "Default" | "Whole Foods" | "Target" | "King Soopers" | "Trader Joe's" | "Online" | "Garden",
  brand: string,         // "365 Organic Green Lentils"
  size: string,          // "16 oz dry"   (human label)
  price: number | null,  // null = pantry/have-on-hand (e.g. spices, garden produce)
  nutrition: Nutrition,  // the label, scaled to the ingredient-line amount
  note?: string          // "Wild · leaner", "Lower sodium", "Using your surplus"
}
```
- **"Default"** is the generic recipe-book assumption ("whenever you see 'flour', assume this") — has nutrition but no store/price.
- **"Garden"** / price 0 represents home-grown or already-owned items.
- A real implementation should source product data + labels from a nutrition database/API (USDA FoodData Central, Open Food Facts, or retailer APIs) rather than hand-entry.

### Ingredient (catalog entry)
The abstract component a recipe references, plus the list of products that can fill it.
```
Ingredient {
  key: string,           // "lentils"
  qty: string,           // "1 cup"  (the recipe-facing quantity label)
  label: string,         // "cooked green lentils"
  pantry?: boolean,      // staple (oil, spices) — assumed on hand
  options: Product[]     // candidate products, first is usually the Default
}
```
> **Note on quantity:** in the prototype, `qty` lives on the ingredient and each product's `nutrition` is pre-scaled to that quantity. In production, separate these: store a product's label per its own serving size, store the recipe line's quantity + unit, and **compute** scaled nutrition. This is the single most important production refinement.

### Recipe
```
Recipe {
  id: string,
  name: string,
  slot: "Breakfast" | "Lunch" | "Dinner" | "Snack",  // natural meal type
  time: string,          // "25 min"
  servings: number,
  img: string,           // placeholder description in prototype; real = photo URL
  vegan?: boolean,
  tags: string[],        // ["High fiber", "Plant protein", "Folate"]
  note: string,          // 1-sentence health rationale
  lines: string[]        // ordered Ingredient.key references
}
```
Per-serving nutrition is **derived**: for each line, take the *selected* product's nutrition, sum across lines, divide by `servings`. See `recNutr()` in the logic class.

### Product selection (the join that makes nutrition real)
A per-ingredient choice of which product fills it. In the prototype this is global state `selected: { [ingredientKey]: productId }`. In production this is likely per-household or per-user, and could be per-recipe-instance. The selection drives **both** the recipe's computed nutrition **and** the shopping list.

### Household & Members
```
Member {
  id: "j" | "m",
  name: string,          // "Jordan", "Mara"
  diet: "Omnivore" | "Vegan",
  // goals/targets — see personTargets()
}
```
Two members in the prototype. Production: a Household has N members, each with auth, profile, diet, and goal config.

### Meal "Moment" — the per-person day model
This replaced a naive fixed Breakfast/Lunch/Dinner/Snack because **the two people eat a different number of meals** (Jordan 4, Mara 6 small meals). A day is an ordered list of **moments**; each moment is either **shared** (both eat the same dish) or **separate** (each person has their own dish, or one person skips it via `null`).
```
Moment {
  id: string,
  label: string,         // "Breakfast", "Morning snack", "Lunch", ...
  mode: "shared" | "separate",
  shared: RecipeId,      // dish when shared
  j: RecipeId | null,    // Jordan's dish (null = he skips this moment)
  m: RecipeId | null     // Mara's dish (null = she skips)
}
Day = Moment[]           // stored per calendar day
```
Key derived helpers (see logic class — copy this logic exactly):
- `participates(moment, person)` → `mode==='shared' || moment[person] != null`
- `ridIn(moment, person)` → `mode==='shared' ? shared : moment[person]`
- `mealsFor(person, day)` → moments where they participate, mapped to `{label, recipeId, shared}`
- `sumNutr(person, day)` → sum of per-serving recipe nutrition across that person's meals
- A person's **meal count** = number of moments they participate in (Jordan 4, Mara 6)

Mutations (all in the logic class, ready to port): `setMomentRecipe`, `toggleTogether` (share↔separate; when un-sharing, both keep the dish as their own editable copy), `removeMeal` (drops a person from a moment; deletes the moment if nobody eats it), `addMeal` (appends a separate moment for one person).

> **"Together" semantics (a product decision to confirm):** in the prototype "Together" is a soft flag — marking a meal shared, then splitting it, gives each person an independent copy. The user explicitly asked whether it should instead be a **hard link** (edit once, updates for both). Decide this with the user; the model supports either.

### Targets (per person, per day)
See `personTargets(person, day)`:
- **Jordan** has run-day vs rest-day targets. Run days are `[1,3,5]` (Tue/Thu/Sat in the demo week). Run day: `{kcal:2200, protein:145, carbs:250, fat:62, fiber:30}`. Rest day: `{kcal:1850, protein:140, carbs:165, fat:60, fiber:30}` — carbs flex ~85g for runs.
- **Mara** (vegan maintenance): `{kcal:1850, protein:95, carbs:230, fat:55, fiber:38}`.
- Targets are set in conversation with the agents (e.g. "30g fiber/day"); production should make these editable per member and allow run-day overrides driven by real activity data.

---

## Screens / Views

The app is a responsive two-pane layout: a fixed **236px left sidebar** (logo, nav, A/B look toggle, household roster) and a scrolling **main column** with a sticky header (page title + subtitle + date + current-look badge). Five nav destinations: **Plan, Recipes, Shopping, Coach, Nutritionist** (plus a Recipe detail view reached from Recipes/Plan).

> **A/B look toggle:** the prototype ships two visual themes — **A · Coastal** (teal, soft, 18px radius) and **B · Clinic** (blue, crisp, 6px radius) — switchable in the sidebar so the user can compare directions. Pick ONE for production unless the user wants the toggle kept. Tokens for both are below.

### 1. Plan (`screen='plan'`)
**Purpose:** see and tune one person's day against their targets; chat to adjust.
**Layout:** a horizontal **week selector** (7 day buttons, run days marked "RUN"), then a 2-column grid (`minmax(0,1.15fr) minmax(0,1fr)`):
- **Left — Targets card:** a **person switcher** (You / Mara pills, each with avatar + diet), then `<Person>'s targets` with a mode badge (Run day / Rest day / Vegan maintenance) and a note. Five horizontal progress bars (Calories, Protein, Carbs, Fat, Fiber) showing `planned / target`; the **Fiber bar is the hero** (uses the person's accent color, shows "goal met"); carbs shows "run-day flex" in amber on run days. Bars compute from that person's meals via `sumNutr`.
- **Right — `<Person>'s day`:** a count badge ("6 meals"), a sub-line noting the other person's count. Then one card per meal moment the person participates in. Each meal card: label (Breakfast/Morning snack/…), a **Together / Just me** toggle, a **×** remove button, avatar(s) (both if shared), recipe name, a TOGETHER / JUST-YOU badge, kcal, and a **Change** button (opens the library scoped to that moment+person). A dashed **"+ Add a meal"** button appends a meal (opens the library in add mode).
- Below the grid, full-width: an **"Ask your coach about [day]"** composer — the same coach agent, scoped to the viewed day. Quick-prompt chips ("Plan around what I have", "Swap a meal", "Make it vegetarian"), a text input, and a send button. Typing e.g. *"we have a lot of cucumbers from the garden"* swaps the viewed person's matching meal to a recipe built around them, live (see `planReply` + `sendPlan`).

### 2. Recipes — Library (`screen='library'`)
**Purpose:** search/filter recipes and add them to the plan.
**Layout:** optional **picking banner** (dark bar: "Choosing a meal for Mara · Thu 18" or "Adding a meal…") with Cancel; optional **flash** confirmation; a **search input** (matches name + tags + ingredient labels); **diet chips** (All / Vegan) and **meal chips** (Any/Breakfast/Lunch/Dinner/Snack); a result count; then a responsive **card grid** (`minmax(280px,1fr)`). Each card: striped image placeholder with slot label + Vegan badge, name, up to 3 tags, kcal + fiber + time, **View** + **Add to plan / Select** buttons.
**Two entry modes:** free browse (Add to plan → appends to the viewed person's day at the recipe's natural slot, shows a flash) vs picking (came from a Plan "Change"/"+Add"/"Browse all" → banner shows the scoped target; selecting assigns straight back and returns to Plan). When picking for Mara, the diet filter auto-defaults to Vegan.

### 3. Recipe detail (`screen='recipe'`)
**Purpose:** read a recipe AND choose the product that fills each ingredient line — the three-layer model made tangible.
**Layout:** header card (striped image, slot, name, tags, time·serves, health note) over a **per-serving nutrition strip** (kcal / protein / carbs / fat / **fiber** highlighted). Below, an **Ingredients** card: one row per line showing `qty`, `label`, a summary of the currently selected product (store · price), and a +/− caret. **Tapping a line expands a product picker**: a grid of product cards, each showing store, brand, size·price, and a mini nutrition label (kcal / P / C / fiber). Selecting a product updates the recipe's computed per-serving nutrition **and** the shopping list. "Default"/pantry products show "pantry" instead of price.

### 4. Shopping (`screen='shop'`)
**Purpose:** one combined grocery run for the household.
**Layout:** an info banner, then **sections grouped by store** (Whole Foods, Trader Joe's, Target, King Soopers, Online, plus a "Pantry · likely on hand" group). Each section header shows subtotal + item count. Each item row: a **checkbox** (check to cross off; crossed items leave the running total), brand, size + which ingredient it fills, **person badges** (J / M avatars showing who it's for — shared items carry both and count once), how many meals use it, and price. A dark **weekly total** bar at the bottom (sums unchecked items). In the prototype the list is a representative static set (`weekNeeds`) tagged by `who: 'j' | 'm' | 'both'`; **in production, generate it by walking every planned meal → its recipe's lines → each line's selected product, de-duplicating and summing quantities.**

### 5. Coach (`screen='coach'`)
**Purpose:** conversational, science-forward coaching; log runs/life/goals.
**Layout:** 2-column (`1.55fr / 1fr`). **Left — chat:** agent header (online dot), scrolling message thread (user bubbles use accent + right-aligned; coach bubbles use soft bg + left-aligned, with an optional citation line beneath), quick-prompt chips ("Log today's run", "I'm away Sunday", "Adjust my goals", "Log a weigh-in"), text input + send. Auto-scrolls to newest. **Right — rail:** "Goals & measurements" (weight w/ progress to goal, weekly mileage, resting HR, last check-in) and "This week's priorities" (condensed health-priority list with status pills). Replies are pattern-matched in `coachReply` — **replace with a real LLM** that has tools to read/edit the plan, the measurements, and the calendar (e.g. "I'm away Sunday" should actually clear that day + drop its shopping items).

### 6. Nutritionist (`screen='review'`)
**Purpose:** an analytical RD agent that reviews the **live plan** and flags issues.
**Layout:** RD-agent header with an overview line, **Re-analyze** and **Bring into coach chat** buttons. A 2-column per-person report: each column has the member, their target mode, a live nutrition summary, a score line ("2 to watch · 2 to tweak · 1 on track"), then findings. Each **finding** has a severity dot + badge (Looking good = green / Worth a tweak = amber / Keep an eye on = orange-red), title, body, and a citation. A "For the household" section follows. Findings are **computed from the live plan** in `nutritionReview(day)` (protein vs target, fiber vs target, vegan B12/iron/omega-3 flags, omega-3/colon strengths for the omnivore, household sodium/variety). **Bring into coach chat** appends a summary into the Coach thread and navigates there — agents are connected. Replace `nutritionReview` with an LLM given the structured plan + nutrition totals + the user's health profile.

---

## Interactions & Behavior
- **Navigation:** sidebar items switch `screen`; navigating clears any active picking/flash.
- **Person switch (Plan):** the You/Mara pills set `planPerson`, which drives BOTH the Targets card and the meals list.
- **Meal editing:** Change → scoped library pick; Together/Just-me → `toggleTogether`; × → `removeMeal`; +Add → scoped library add. All recompute targets immediately.
- **Recipe product picker:** tapping a line toggles its expansion (`openLine`); selecting a product updates `selected[key]`, re-deriving recipe nutrition and the shopping list.
- **Shopping:** tapping a row toggles `checked[key]`; total re-sums.
- **Coach/Plan chat:** Enter (no shift) or send button submits; thread auto-scrolls (query the thread element, set scrollTop = scrollHeight, on a rAF + short timeout).
- **Nutritionist → Coach handoff:** appends a coach message and switches screens.
- No destructive confirmations are modeled; add as appropriate.

## State Management
Prototype state (single component, all in the logic class — your app should distribute this into stores/server state):
- `theme` ('a'|'b'), `screen`, `activeDay` (0–6 index into the demo week)
- `planPerson` ('j'|'m') — drives Plan targets + meals
- `days: { [dayIndex]: Moment[] }` — the per-day meal plan; falls back to `defaultDay()` when unset
- `selected: { [ingredientKey]: productId }` — product choices (drives nutrition + shopping)
- `checked: { [ingredientKey]: bool }` — shopping checkoffs
- `openRecipe`, `openLine` — recipe-detail view state
- `recipeQuery`, `recipeDiet`, `recipeSlot`, `picking` ({day, kind:'change'|'add', momentId?, viewer, person}), `flash`
- `messages: [{role:'me'|'coach', text, cite?}]`, `draft`, `planDraft` — chat
- **Data fetching for production:** recipes, ingredients, products (+ nutrition labels) from a DB/API; Apple Health for steps/calories/weight/HR (requires a native iOS companion using HealthKit — a pure web app cannot read HealthKit directly; plan a small native bridge or manual entry + a future iOS app). Both agents call an LLM.

## Design Tokens

**Look A · Coastal** (recommended default): accent `oklch(0.64 0.085 195)`, deep `oklch(0.43 0.07 205)`, tint `oklch(0.95 0.03 195)`, soft `oklch(0.975 0.013 200)`, radius **18px**.
**Look B · Clinic:** accent `oklch(0.55 0.105 245)`, deep `oklch(0.39 0.085 248)`, tint `oklch(0.95 0.034 245)`, soft `oklch(0.975 0.013 238)`, radius **6px**.

**Member colors:** Jordan = the theme accent/deep/tint. Mara (fixed coral): color `oklch(0.64 0.13 25)`, deep `oklch(0.47 0.11 28)`, tint `oklch(0.94 0.045 30)`.

**Severity (Nutritionist):** good `oklch(0.55 0.11 150)` / amber `oklch(0.66 0.13 70)` / watch `oklch(0.58 0.16 30)`. **Vegan badge** green: `oklch(0.55 0.11 150)`.

**Neutrals:** app bg `oklch(0.985 0.006 215)`; card bg `#fff`; primary ink `oklch(0.31 0.02 235)`; muted text `oklch(0.6 0.01 230)`; hairline borders `oklch(0.92–0.94 0.006 220)`; bar track `oklch(0.94 0.006 220)`.

**Typography:** Headings/body **Hanken Grotesk** (Google Fonts; weights 400/500/600/700/800). Numerics, labels, metadata **Spline Sans Mono** (400/500/600). UPPERCASE mono with ~0.05–0.08em letter-spacing for slot labels and metadata. Page title ~22px/800; section heads 17px/800; meal name ~14.5px/700; body 13–14px.

**Spacing/shape:** sidebar 236px; main padding ~30px 34px; card padding 18–24px; gaps 8–22px; pills/avatars fully rounded (999px); avatars 19–32px with 2px white ring when overlapped.

## Assets
- **Fonts:** Hanken Grotesk + Spline Sans Mono via Google Fonts.
- **Images:** none real — recipe images are striped CSS placeholders with text labels (e.g. "lentil bowl photo"). Source real photography or a food-image API in production.
- **Icons:** none as files — simple glyphs/unicode (→, ✓, ×, ⌕, ⇆, ↻) and CSS-drawn dots/rings. Use your icon library.
- No proprietary/brand assets.

## Files
- `Harbor Meal Planner.dc.html` — the full prototype. The `<script data-dc-script>` block at the bottom is the **logic class**: read `DATA()` (all recipes/ingredients/products/weekNeeds), `defaultDay()` (sample household day), `recNutr`/`sumNutr`/`personTargets`/`nutritionReview` (all derivations), and the mutation methods. The markup above it shows exact layout/styles.
- `support.js` — the prototype runtime (reference only; not needed in production).

## Suggested production stack
No codebase exists yet. A clean fit: **Next.js (React) + TypeScript + Tailwind** for the app, **Postgres (via Prisma)** for the relational data model above (households, members, recipes, ingredients, products, nutrition, meal-moments, product-selections), and your LLM provider for the Coach + Nutritionist agents (give them tools to read/mutate the plan). For Apple Health, add a thin **native iOS companion** (HealthKit) that syncs steps/calories/weight/HR to your backend — the web app reads the synced data. Recreate the UI from the tokens above; keep the recipe→ingredient→product separation intact in the schema, since it is the core of the product.
