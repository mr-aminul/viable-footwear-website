import { WishlistPage } from '@/components/pages/WishlistPage'
import { listStoreProducts } from '@/lib/catalog/queries'

export const metadata = {
  title: 'Wishlist',
  description: 'Styles you saved on this device.',
}

export default async function Wishlist() {
  const products = await listStoreProducts()
  return <WishlistPage products={products} />
}
