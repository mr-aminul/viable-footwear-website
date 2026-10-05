import { StartDraftProduct } from '@/components/admin/StartDraftProduct'

export const metadata = {
  title: 'New product',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/**
 * Client-started draft — must not insert on GET (prefetch / RSC render).
 */
export default function NewProductPage() {
  return <StartDraftProduct />
}
