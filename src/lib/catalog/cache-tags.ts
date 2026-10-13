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
 * Bust storefront Data Cache + route caches after catalog writes.
 */
export function revalidateStorefront(...slugs: Array<string | null | undefined>) {
  revalidateTag(STORE_CATALOG_TAG)
  revalidatePath('/')
  revalidatePath('/shop')

  const unique = [...new Set(slugs.filter((s): s is string => Boolean(s)))]
  for (const slug of unique) {
    revalidateTag(storeProductTag(slug))
    revalidatePath(`/product/${slug}`)
  }
}
