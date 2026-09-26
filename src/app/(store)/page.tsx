import { HomePage } from '@/components/pages/HomePage'
import {
  listStoreCategories,
  listStoreProducts,
} from '@/lib/catalog/queries'
import { getHomePageContent } from '@/lib/website/queries'

export default async function Home() {
  const [categories, products, content] = await Promise.all([
    listStoreCategories(),
    listStoreProducts(),
    getHomePageContent(),
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
      content={content}
      categories={categories}
      featured={featured.length > 0 ? featured : products.slice(0, 4)}
      foamPicks={foamPicks}
    />
  )
}
