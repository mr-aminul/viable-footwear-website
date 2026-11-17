/**
 * Deduping / scoring for order-import variant resolution.
 * Near-duplicate catalog names (Purechill vs PURECHILL) must resolve
 * to one clear variant via identity + size + color — never the wrong shoe.
 */

export type ResolveProductHint = {
  id: string
  name: string
  slug: string
}

export type ResolveVariantCandidate = {
  id: string
  product_id: string
  size_eu: number
  color: string | null
  sku: string | null
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** `#uuid` or bare uuid from picker / durable items text. */
export function parseVariantIdToken(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  const stripped = value.startsWith('#')
    ? value.slice(1).trim()
    : value.startsWith('vid:')
      ? value.slice(4).trim()
      : value
  return UUID_RE.test(stripped) ? stripped : null
}

/** Normalize color labels so "Black /Black" and "Black" can be compared. */
export function normalizeColorKey(color: string | null | undefined): string {
  return String(color ?? '')
    .toLowerCase()
    .replace(/[/|_+,.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenSet(key: string): Set<string> {
  return new Set(key.split(' ').filter(Boolean))
}

/**
 * Higher is better. 0 = not a color match.
 * Exact normalized match wins; token overlap covers "Black" vs "Black /Black".
 */
export function colorMatchScore(
  wanted: string,
  actual: string | null | undefined,
): number {
  const w = normalizeColorKey(wanted)
  const a = normalizeColorKey(actual)
  if (!w || !a) return 0
  if (w === a) return 100

  const wantedTokens = tokenSet(w)
  const actualTokens = tokenSet(a)
  if (wantedTokens.size === 0 || actualTokens.size === 0) return 0

  let shared = 0
  for (const token of wantedTokens) {
    if (actualTokens.has(token)) shared += 1
  }
  if (shared === 0) return 0

  // Wanted tokens all present on the variant (e.g. "black" ⊂ "black black")
  if (shared === wantedTokens.size) {
    return actualTokens.size === wantedTokens.size ? 95 : 75
  }
  // Variant's primary token matches wanted (e.g. first word)
  const actualPrimary = [...actualTokens][0]
  if (actualPrimary && wantedTokens.has(actualPrimary) && wantedTokens.size === 1) {
    return 60
  }
  return Math.round(40 * (shared / wantedTokens.size))
}

/** How well the typed product key matches this catalog product. */
export function productKeyScore(
  productKey: string,
  product: ResolveProductHint,
): number {
  const key = productKey.trim()
  const keyLower = key.toLowerCase()
  const name = product.name.trim()
  const nameLower = name.toLowerCase()
  const slug = product.slug.trim().toLowerCase()

  if (name === key) return 100
  if (slug === keyLower) return 95
  if (nameLower === keyLower) return 85
  if (slug.startsWith(keyLower) || keyLower.startsWith(slug)) return 45
  if (nameLower.includes(keyLower) || keyLower.includes(nameLower)) return 25
  return 10
}

export type ScoredVariant = {
  variant: ResolveVariantCandidate
  product: ResolveProductHint
  score: number
  colorScore: number
  productScore: number
}

/**
 * Among variants that fit size, pick the single best by product-key + color.
 * Returns null when nothing matches; `ambiguous` when top score is tied.
 */
export function pickBestVariantMatch(input: {
  productKey: string
  sizeEu: number
  color: string
  products: ResolveProductHint[]
  variants: ResolveVariantCandidate[]
}):
  | { ok: true; variant: ResolveVariantCandidate }
  | { ok: false; reason: 'none' | 'ambiguous'; scored: ScoredVariant[] } {
  const size = Number(input.sizeEu)
  const productsById = new Map(input.products.map((p) => [p.id, p]))

  const scored: ScoredVariant[] = []
  for (const variant of input.variants) {
    if (Number(variant.size_eu) !== size) continue
    const product = productsById.get(variant.product_id)
    if (!product) continue

    const colorScore = colorMatchScore(input.color, variant.color)
    if (colorScore <= 0) continue

    const productScore = productKeyScore(input.productKey, product)
    // Exact color beats soft color (Black vs Black /Black), then product-key
    // strength breaks twin-name ties (Purechill vs PURECHILL).
    const colorTier = colorScore >= 100 ? 2 : colorScore >= 75 ? 1 : 0
    scored.push({
      variant,
      product,
      colorScore,
      productScore,
      score: colorTier * 1_000_000 + productScore * 1_000 + colorScore,
    })
  }

  if (scored.length === 0) {
    return { ok: false, reason: 'none', scored }
  }

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]!
  const tied = scored.filter((row) => row.score === best.score)
  if (tied.length > 1) {
    // Same score but identical variant id (shouldn't happen) — still unique.
    const uniqueIds = new Set(tied.map((row) => row.variant.id))
    if (uniqueIds.size === 1) {
      return { ok: true, variant: best.variant }
    }
    return { ok: false, reason: 'ambiguous', scored: tied }
  }

  return { ok: true, variant: best.variant }
}
