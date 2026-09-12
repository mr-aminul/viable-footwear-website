import { HomePage } from '@/components/pages/HomePage'
import {
  listStoreCategories,
  listStoreProducts,
} from '@/lib/catalog/queries'

export default async function Home() {
  const [categories, products] = await Promise.all([
    listStoreCategories(),
    listStoreProducts(),
  ])

  const featured = products.filter((p) => p.featured).slice(0, 4)
  const foamPicks = products
    .filter(
      (p) =>
        p.category === 'crocs' ||
        p.category === 'foam-runners' ||
        p.category === 'slides',
    )
    .slice(0, 4)

  return (
    <HomePage
      categories={categories}
      featured={featured.length > 0 ? featured : products.slice(0, 4)}
      foamPicks={foamPicks}
    />
  )
}
