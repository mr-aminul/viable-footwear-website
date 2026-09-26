import { WebsiteHomeEditor } from '@/components/admin/WebsiteHomeEditor'
import {
  listStoreCategories,
  listStoreProducts,
} from '@/lib/catalog/queries'
import { getHomePageContentFresh } from '@/lib/website/queries'

export const metadata = {
  title: 'Edit Home · Website Modifier',
  robots: { index: false, follow: false },
}

export default async function WebsiteHomeAdminPage() {
  const [content, categories, products] = await Promise.all([
    getHomePageContentFresh(),
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
    <WebsiteHomeEditor
      initial={content}
      categories={categories.map((c) => ({
        name: c.name,
        slug: c.slug,
        image: c.image,
        count: c.count,
      }))}
      featured={featured.length > 0 ? featured : products.slice(0, 4)}
      foamPicks={foamPicks}
    />
  )
}
