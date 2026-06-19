# Harbor — Supabase backend

The data model from [`PLAN.md`](../PLAN.md) §2, as Postgres migrations + a seed.

```
supabase/
├─ migrations/
│  ├─ 20260619000001_init_schema.sql   # tables, indexes, constraints
│  └─ 20260619000002_rls.sql           # current_household_id() + row-level security
└─ seed.sql                            # the prototype's recipes/products/day as demo data
```

## Applying it

### Option A — Cloud project (recommended)

No Docker needed. Two ways to run the SQL:

**Quickest (SQL editor):** open your project at supabase.com → SQL Editor, and run, in order:
`20260619000001_init_schema.sql`, then `20260619000002_rls.sql`, then `seed.sql`.

**With the CLI (repeatable):**

```bash
npm i -g supabase            # or: scoop install supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push             # applies migrations/
supabase db execute --file supabase/seed.sql
```

Then copy the project's URL + anon key into `mobile/.env` (see `mobile/.env.example`).

### Option B — Local stack (needs Docker Desktop)

```bash
npm i -g supabase
supabase init                # generates config.toml (keep migrations/ + seed.sql)
supabase start               # boots local Postgres + Studio; applies migrations + seed.sql
```

`supabase start` prints a local URL + anon key for `mobile/.env`.

## Linking a login to a household member

Seeded members have `auth_user_id = null`, so Row-Level Security hides all data
until a real auth user is attached (RLS keys off `member.auth_user_id = auth.uid()`).
After creating the two auth users (Authentication → Users, or via the app's
sign-up once that exists), link each to a seeded member:

```sql
update member set auth_user_id = '<spencer-auth-uid>'
  where household_id = '11111111-1111-1111-1111-111111111111' and short = 'You';
update member set auth_user_id = '<jacq-auth-uid>'
  where household_id = '11111111-1111-1111-1111-111111111111' and short = 'Jacq';
```

## Regenerating the app's types

After any schema change, regenerate `mobile/src/lib/database.types.ts`:

```bash
supabase gen types typescript --linked > mobile/src/lib/database.types.ts   # cloud
supabase gen types typescript --local  > mobile/src/lib/database.types.ts   # local
```
