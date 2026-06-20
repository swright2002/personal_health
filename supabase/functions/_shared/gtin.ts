// GTIN/UPC validation — Harbor product engine (spec §D).
// Pure functions: check-digit, prefix class, and external corroboration so a
// scanned/entered barcode can be flagged when it doesn't match the claimed
// product. Runs in Deno (edge) and could be copied to the RN client for an
// instant pre-network reject.

export function stripNonDigits(s: string): string {
  return (s ?? '').replace(/\D+/g, '');
}

export function leftPad14(digits: string): string {
  return stripNonDigits(digits).padStart(14, '0').slice(-14);
}

/** Mod-10 check digit over `body` (digits WITHOUT the trailing check digit). */
export function computeCheckDigit(body: string): number {
  let sum = 0;
  for (let r = 0; r < body.length; r++) {
    const d = body.charCodeAt(body.length - 1 - r) - 48; // rightmost data digit first
    sum += d * (r % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/** True if `full` (incl. check digit) is a structurally valid GTIN-8/12/13/14. */
export function validateGtin(full: string): boolean {
  if (!/^\d+$/.test(full) || ![8, 12, 13, 14].includes(full.length)) return false;
  return computeCheckDigit(full.slice(0, -1)) === full.charCodeAt(full.length - 1) - 48;
}

export type PrefixClass =
  | 'RETAIL_GLOBAL'
  | 'RESTRICTED_INTERNAL'
  | 'NON_FOOD_PUBLICATION'
  | 'NON_PRODUCT'
  | 'COUPON'
  | 'NON_RETAIL'
  | 'TEST_CODE';

/** Classify by the GS1 prefix read from the EAN-13 form (= GTIN-14 without the leading indicator). */
export function classifyPrefix(ean13: string): PrefixClass {
  const p3 = parseInt(ean13.slice(0, 3), 10);
  const p2 = parseInt(ean13.slice(0, 2), 10);
  if ((p3 >= 20 && p3 <= 29) || (p3 >= 40 && p3 <= 49) || (p3 >= 200 && p3 <= 299)) return 'RESTRICTED_INTERNAL';
  if (p3 === 977 || p3 === 978 || p3 === 979) return 'NON_FOOD_PUBLICATION';
  if (p3 === 980) return 'NON_PRODUCT';
  if (p3 >= 981 && p3 <= 984) return 'COUPON';
  if (p2 === 99) return 'COUPON';
  if (p3 === 951) return 'NON_RETAIL';
  if (p3 === 952) return 'TEST_CODE';
  return 'RETAIL_GLOBAL';
}

export function normBrand(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\b(inc|llc|co|ltd|corp|company|gmbh|s\.?a\.?)\b/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 0..1 similarity of two already-present brand strings. */
export function fuzzyBrandMatch(a: string, b: string): number {
  const na = normBrand(a);
  const nb = normBrand(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const ta = new Set(na.split(' '));
  const tb = new Set(nb.split(' '));
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = new Set([...ta, ...tb]).size;
  return union ? inter / union : 0;
}

export type BarcodeVerdict = {
  ok: boolean;
  confidence: number;
  class: PrefixClass | 'INVALID';
  gtin14: string | null;
  witnesses: number;
  brandResult: 'MATCH' | 'WEAK' | 'MISMATCH' | 'UNKNOWN';
  flags: string[];
};

/** Corroborate a barcode against claimed brand/name + OFF/FDC echoes (spec §D5). */
export function validateBarcode(
  scanned: string,
  opts: {
    claimedBrand?: string | null;
    claimedName?: string | null;
    offCode?: string | null;
    fdcGtin?: string | null;
    sourceBrand?: string | null;
    sourceConflict?: boolean;
  } = {},
): BarcodeVerdict {
  const digits = stripNonDigits(scanned);
  if (![8, 12, 13, 14].includes(digits.length)) {
    return { ok: false, confidence: 0, class: 'INVALID', gtin14: null, witnesses: 0, brandResult: 'UNKNOWN', flags: ['BAD_LENGTH'] };
  }
  if (!validateGtin(digits)) {
    return { ok: false, confidence: 0, class: 'INVALID', gtin14: null, witnesses: 0, brandResult: 'UNKNOWN', flags: ['CHECK_DIGIT_FAIL'] };
  }
  const gtin14 = leftPad14(digits);
  const cls = classifyPrefix(gtin14.slice(1));
  if (cls !== 'RETAIL_GLOBAL') {
    return { ok: false, confidence: cls === 'RESTRICTED_INTERNAL' ? 25 : 10, class: cls, gtin14, witnesses: 0, brandResult: 'UNKNOWN', flags: [cls] };
  }

  const flags: string[] = [];
  if (!['0', '9'].includes(gtin14[0])) flags.push('CASE_OR_PACK_LEVEL');

  const offN = opts.offCode ? leftPad14(opts.offCode) : null;
  const fdcN = opts.fdcGtin ? leftPad14(opts.fdcGtin) : null;
  let witnesses = 0;
  if (offN === gtin14) witnesses++;
  else if (offN) flags.push('OFF_CODE_MISMATCH');
  if (fdcN === gtin14) witnesses++;
  else if (fdcN) flags.push('FDC_CODE_MISMATCH');
  if (opts.sourceConflict) flags.push('SOURCE_CONFLICT');

  let brandResult: BarcodeVerdict['brandResult'] = 'UNKNOWN';
  if (opts.claimedBrand && opts.sourceBrand) {
    const r = fuzzyBrandMatch(opts.claimedBrand, opts.sourceBrand);
    brandResult = r >= 0.85 ? 'MATCH' : r >= 0.55 ? 'WEAK' : 'MISMATCH';
    if (brandResult === 'MISMATCH') flags.push('BRAND_MISMATCH');
    if (brandResult === 'WEAK') flags.push('BRAND_WEAK');
  }

  let conf = 50;
  conf += witnesses === 2 ? 30 : witnesses === 1 ? 15 : 0;
  conf += brandResult === 'MATCH' ? 20 : brandResult === 'WEAK' ? 5 : brandResult === 'MISMATCH' ? -40 : 0;
  if (flags.includes('SOURCE_CONFLICT')) conf -= 30;
  if (flags.includes('OFF_CODE_MISMATCH') || flags.includes('FDC_CODE_MISMATCH')) conf -= 25;
  if (flags.includes('CASE_OR_PACK_LEVEL')) conf -= 5;
  conf = Math.max(0, Math.min(100, conf));

  const ok = conf >= 70 && !flags.includes('BRAND_MISMATCH') && !flags.includes('SOURCE_CONFLICT');
  return { ok, confidence: conf, class: cls, gtin14, witnesses, brandResult, flags };
}
