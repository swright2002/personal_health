// Client mirror of the engine's form detection (supabase/functions/_shared/forms.ts),
// used by the product picker to show a product's cooked/dry form and warn when it
// doesn't match what the recipe calls for.

export type Form = 'cooked' | 'canned' | 'dry' | 'raw' | null;

const HYDRATING = new Set(['grain', 'legume', 'pasta', 'rice']);

export function detectForm(text: string | null | undefined): Form {
  const s = (text ?? '').toLowerCase();
  if (/\b(dry|dried|uncooked)\b/.test(s)) return 'dry';
  if (/\b(canned|drained|in water|in brine)\b/.test(s)) return 'canned';
  if (/\b(cooked|boiled|roasted|steamed)\b/.test(s)) return 'cooked';
  if (/\b(raw|fresh)\b/.test(s)) return 'raw';
  return null;
}

export function basis(form: Form): 'wet' | 'dry' | 'unknown' {
  if (form === 'dry') return 'dry';
  if (form === 'cooked' || form === 'canned' || form === 'raw') return 'wet';
  return 'unknown';
}

export function ingredientBasis(label: string, category: string | null): 'wet' | 'dry' | 'unknown' {
  const b = basis(detectForm(label));
  if (b === 'unknown' && category && HYDRATING.has(category)) return 'dry';
  return b;
}

/** True when the product's form is on a different (cooked vs dry) basis than the recipe needs. */
export function formMismatch(ingredientLabel: string, category: string | null, productForm: Form): boolean {
  const ib = ingredientBasis(ingredientLabel, category);
  const pb = basis(productForm);
  return ib !== 'unknown' && pb !== 'unknown' && ib !== pb;
}
