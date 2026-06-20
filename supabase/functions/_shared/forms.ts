// Cooked/dry form detection. A dry grain or legume has ~2.5–3× the calories per
// gram of its cooked form, so a "1 cup cooked quinoa" line must resolve to a
// COOKED product, not a dry one. We detect the form of the ingredient (from its
// label) and of each candidate (from its name) and prefer a matching basis.

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

/** Nutrition basis: cooked/canned/raw hold water ("wet"); dry/uncooked don't. */
export function basis(form: Form): 'wet' | 'dry' | 'unknown' {
  if (form === 'dry') return 'dry';
  if (form === 'cooked' || form === 'canned' || form === 'raw') return 'wet';
  return 'unknown';
}

/** The reference basis for an ingredient: its label form, defaulting a grain/
 *  legume with no stated form to "dry" (as purchased). */
export function ingredientBasis(label: string, category: string | null): 'wet' | 'dry' | 'unknown' {
  const b = basis(detectForm(label));
  if (b === 'unknown' && category && HYDRATING.has(category)) return 'dry';
  return b;
}

/** Sort key (lower = better): does the product's form match the ingredient's basis? */
export function formMatchScore(ingBasis: 'wet' | 'dry' | 'unknown', productForm: Form): number {
  const pb = basis(productForm);
  if (ingBasis === 'unknown' || pb === 'unknown') return 1; // neutral when unknown
  return ingBasis === pb ? 0 : 2;
}
