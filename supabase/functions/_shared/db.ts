// Read reference data via PostgREST with the CALLER's JWT (so RLS applies).
// Plain fetch — no supabase-js (its esm.sh build boot-fails in this runtime).
import { FoodTerm } from './diet.ts';
import { Member } from './ranking.ts';

function restHeaders(req: Request): HeadersInit {
  return {
    apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    Authorization: req.headers.get('Authorization') ?? '',
    'Content-Type': 'application/json',
  };
}

async function rest(req: Request, path: string): Promise<any[]> {
  const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/${path}`, { headers: restHeaders(req) });
  if (!r.ok) return [];
  return await r.json().catch(() => []);
}

export async function loadFoodTerms(req: Request): Promise<FoodTerm[]> {
  return (await rest(req, 'food_term?select=term,allergen_key,vegan,vegetarian,pescetarian_ok,gluten,ambiguous')) as FoodTerm[];
}

export async function loadMembers(req: Request): Promise<Member[]> {
  const rows = await rest(req, 'member?select=id,diet_level,allergies,restrictions');
  return rows.map((m: any) => ({
    id: m.id,
    diet_level: m.diet_level ?? 0,
    allergies: m.allergies ?? [],
    restrictions: m.restrictions ?? [],
  }));
}
