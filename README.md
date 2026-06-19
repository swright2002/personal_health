# Personal Health

A personal health tracker for iOS. The **meal planner** is the first module; planned future modules are Apple Health integration, a running coach, weight management, and sleep.

## Documents
- **[PLAN.md](PLAN.md)** — architecture, data model, agents, and the milestone sequence.
- **[design/](design/)** — the original "Harbor" meal-planner design handoff (reference spec): `HANDOFF.md`, the interactive prototype (`Harbor Meal Planner.dc.html`), and its runtime (`support.js`).

## Stack
- **Expo (React Native + TypeScript)** — installable iPhone app; can read Apple Health later.
- **Supabase** — Postgres + Auth + Realtime (accounts, the shared data, live sync between phones).
- **Anthropic API (`claude-opus-4-8`)** — the Coach + Nutritionist agents. The API key lives in Supabase Edge Function secrets, never in the app.

## Status
**M0 — Foundations** (project setup). See PLAN.md §6 for the milestone roadmap.
