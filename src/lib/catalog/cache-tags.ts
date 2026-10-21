import { unlinkSync } from 'node:fs'
import path from 'node:path'
import { revalidatePath, revalidateTag } from 'next/cache'

/** Shared tag for all public catalog list/detail caches. */
export const STORE_CATALOG_TAG = 'store-catalog'

/** Per-product tag so a single PDP can be purged precisely. */
export function storeProductTag(slug: string): string {
  return `store-product-${slug}`
}

/**
 * No time-based TTL. Storefront Data Cache stays until admin mutations call
 * `revalidateStorefront` / `revalidateTag`.
 */
export const STORE_CACHE_REVALIDATE = false as const

/**
 * Self-hosted Next can keep Full Route Cache HTML on disk under
 * `.next/server/app/` even after `revalidatePath`. Delete those artifacts so
 * the next request regenerates from fresh data.
 */
export function purgePrerenderArtifacts(routeStems: string[]) {
  const base = path.join(process.cwd(), '.next', 'server', 'app')
  for (const stem of routeStems) {
    for (const ext of ['.html', '.rsc', '.meta'] as const) {
      try {
        unlinkSync(path.join(base, `${stem}${ext}`))
      } catch {
        // Missing file is fine — route may not have been prerendered yet.
      }
    }
  }
}

/**
 * Bust storefront Data Cache + route caches after catalog writes.
 * Call this from every admin mutation that changes what shoppers see
 * (products, categories, media, inventory, related products, etc.).
 */
export function revalidateStorefront(
  ...slugs: Array<string | null | undefined>
) {
  revalidateTag(STORE_CATALOG_TAG)
  // `layout` clears nested segments; bare path alone can leave stale HTML.
  revalidatePath('/', 'layout')
  revalidatePath('/shop', 'layout')
  revalidatePath('/shop', 'page')

  const unique = [...new Set(slugs.filter((s): s is string => Boolean(s)))]
  for (const slug of unique) {
    revalidateTag(storeProductTag(slug))
    revalidatePath(`/product/${slug}`, 'page')
    revalidatePath(`/product/${slug}`, 'layout')
  }

  purgePrerenderArtifacts([
    'index',
    'shop',
    ...unique.map((slug) => path.join('product', slug)),
  ])
}
