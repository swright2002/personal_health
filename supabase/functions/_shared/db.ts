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

/** Brands the household already buys, learned from their DELIBERATE choices
 *  (source='manual'), not auto-suggestions — so a random brand the engine
 *  happened to auto-pick on some ingredient doesn't pollute the preference. */
export async function loadPreferredBrands(req: Request): Promise<string[]> {
  const rows = await rest(req, 'product_selection?member_id=is.null&source=eq.manual&select=product(brand)');
  const brands = new Set<string>();
  for (const r of rows) {
    const p = Array.isArray(r.product) ? r.product[0] : r.product;
    const b = (p?.brand || '').trim();
    if (b) brands.add(b);
  }
  return [...brands];
}
