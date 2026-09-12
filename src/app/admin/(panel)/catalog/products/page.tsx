import { redirect } from 'next/navigation'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Products grid lives at /admin/catalog — keep old list URL working. */
export default async function ProductsListRedirect({ searchParams }: Props) {
  const params = await searchParams
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value) qs.set(key, value)
  }
  const suffix = qs.toString()
  redirect(suffix ? `/admin/catalog?${suffix}` : '/admin/catalog')
}
