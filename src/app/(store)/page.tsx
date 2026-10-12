import { HomePage } from '@/components/pages/HomePage'
import {
  listStoreCategories,
  listStoreProducts,
} from '@/lib/catalog/queries'
import {
  legacyFoamCrocsProducts,
  legacyMostPopularProducts,
  pickHomeSectionProducts,
} from '@/lib/website/home-products'
import { getHomePageContent } from '@/lib/website/queries'

export default async function Home() {
  const [categories, products, content] = await Promise.all([
    listStoreCategories(),
    listStoreProducts(),
    getHomePageContent(),
  ])

  const featured = pickHomeSectionProducts(
    products,
    content.mostPopular.productIds,
    legacyMostPopularProducts(products),
  )
  const foamPicks = pickHomeSectionProducts(
    products,
    content.foamCrocs.productIds,
    legacyFoamCrocsProducts(products),
  )

  return (
    <HomePage
      content={content}
      categories={categories}
      featured={featured}
      foamPicks={foamPicks}
    />
  )
}
