/** Storefront product path. */
export function storeProductPath(slug: string): string {
  return `/product/${slug}`
}

/**
 * Admin editor for a product — public URL + `/admin` suffix.
 * Example: /product/skyform-crocs/admin
 */
export function adminProductPath(slug: string): string {
  return `/product/${slug}/admin`
}

/** True for classic /admin routes and public paths ending with /admin. */
export function isAdminPath(pathname: string): boolean {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true
  return pathname.endsWith('/admin')
}
