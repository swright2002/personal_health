/** Client for the product-engine edge functions + persisting a chosen product. */
import { supabase } from './supabase';

const FN_BASE = 'https://bvykxlpmchnujfzwglhu.supabase.co/functions/v1';
const PUB = 'sb_publishable_8J2pMn6ioROcteW7PhvvKQ_-kqT9fkH';

export type Tag = 'allowed' | 'unverified' | 'disallowed';
export type Compliance = { householdClass: number; perMember: Record<string, Tag> };
export type Nutr = { kcal: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber: number | null; sodium: number | null };

export type ProductCandidate = {
  barcode: string | null;
  name: string;
  brand: string;
  size: string | null;
  serving_size: number;
  serving_unit: string;
  net_weight_g: number | null;
  servings_per_container: number | null;
  nutrition: Nutr;
  ingredients_text: string | null;
  diet_level: number | null;
  diet_status: string | null;
  allergens: string[];
  allergen_traces: string[];
  allergens_known?: boolean;
  gluten_free: boolean | null;
  form?: 'cooked' | 'canned' | 'dry' | 'raw' | null;
  analysis_source: string;
  source_url: string | null;
  source_ref: string | null;
  attribution: string | null;
  image_url: string | null;
  compliance?: Compliance;
  barcode_validation?: { ok: boolean; confidence: number; class: string; brandResult: string; flags: string[] };
};

export type EngineResult = { ok: boolean; candidates: ProductCandidate[]; auto_suggest_index: number | null; error: { code: string; message: string } | null };

async function callFn(slug: string, body: unknown): Promise<EngineResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? PUB;
  try {
    const r = await fetch(`${FN_BASE}/${slug}`, {
      method: 'POST',
      headers: { apikey: PUB, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await r.json();
  } catch (e) {
    return { ok: false, candidates: [], auto_suggest_index: null, error: { code: 'NETWORK', message: String(e) } };
  }
}

export const WHOLE_FOOD_CATS = ['produce', 'legume', 'grain', 'meat', 'fish', 'dairy', 'nut', 'oil', 'spice'];

export const searchProducts = (query: string, category: string | null) =>
  callFn('analyze-product', {
    mode: 'name_search',
    query,
    label: query,
    category,
    brand_intent: !(category && WHOLE_FOOD_CATS.includes(category)),
  });

export const lookupBarcode = (barcode: string, claimedBrand?: string) =>
  callFn('lookup-product-barcode', { barcode, claimed_brand: claimedBrand });

/** Persist a chosen candidate as this ingredient's household-default product. */
export async function chooseProduct(params: { householdId: string; ingredientId: string; candidate: ProductCandidate }): Promise<{ error: string | null }> {
  const { householdId, ingredientId, candidate: c } = params;
  const ins = await supabase
    .from('product')
    .insert({
      ingredient_id: ingredientId, name: c.name, brand: c.brand || '', store: null,
      serving_size: c.serving_size || 100, serving_unit: c.serving_unit || 'g',
      kcal: c.nutrition.kcal ?? 0, protein: c.nutrition.protein ?? 0, carbs: c.nutrition.carbs ?? 0,
      fat: c.nutrition.fat ?? 0, fiber: c.nutrition.fiber ?? 0, sodium: c.nutrition.sodium ?? 0,
      ingredients_text: c.ingredients_text, diet_level: c.diet_level, diet_status: c.diet_status,
      allergens: c.allergens, allergen_traces: c.allergen_traces, gluten_free: c.gluten_free,
      analysis_source: c.analysis_source, source_url: c.source_url, source_ref: c.source_ref,
      barcode: c.barcode, net_weight_g: c.net_weight_g, servings_per_container: c.servings_per_container,
      form: c.form ?? null,
    })
    .select('id')
    .single();
  if (ins.error) return { error: ins.error.message };

  // Update the existing household-default in place (no delete-then-insert window
  // that could transiently leave the ingredient with no default); insert if none.
  const upd = await supabase
    .from('product_selection')
    .update({ product_id: ins.data.id, source: 'manual' })
    .eq('household_id', householdId)
    .eq('ingredient_id', ingredientId)
    .is('member_id', null)
    .select('product_id');
  if (upd.error) return { error: upd.error.message };
  if ((upd.data?.length ?? 0) === 0) {
    const sel = await supabase.from('product_selection').insert({
      household_id: householdId, ingredient_id: ingredientId, product_id: ins.data.id, member_id: null, source: 'manual',
    });
    return { error: sel.error?.message ?? null };
  }
  return { error: null };
}

export type SelectedProduct = { name: string; brand: string; analysis_source: string; diet_level: number | null; diet_status: string | null; allergens: string[]; kcal: number; serving_size: number; serving_unit: string };

/** The product currently filling an ingredient (household default), if any. */
export async function loadSelectedProduct(ingredientId: string): Promise<SelectedProduct | null> {
  const sel = await supabase.from('product_selection').select('product_id').eq('ingredient_id', ingredientId).is('member_id', null).maybeSingle();
  if (!sel.data?.product_id) return null;
  const p = await supabase.from('product').select('name,brand,analysis_source,diet_level,diet_status,allergens,kcal,serving_size,serving_unit').eq('id', sel.data.product_id).single();
  return (p.data as SelectedProduct) ?? null;
}
