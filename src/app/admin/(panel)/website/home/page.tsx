import { WebsiteHomeEditor } from '@/components/admin/WebsiteHomeEditor'
import {
  listPromoPickerProducts,
  listStoreCategories,
  listStoreProducts,
} from '@/lib/catalog/queries'
import { getHomePageContentFresh } from '@/lib/website/queries'

export const metadata = {
  title: 'Edit Home · Website Modifier',
  robots: { index: false, follow: false },
}

export default async function WebsiteHomeAdminPage() {
  const [content, categories, products, catalog] = await Promise.all([
    getHomePageContentFresh(),
    listStoreCategories(),
    listStoreProducts(),
    listPromoPickerProducts(),
  ])

  return (
    <WebsiteHomeEditor
      initial={content}
      categories={categories.map((c) => ({
        name: c.name,
        slug: c.slug,
        image: c.image,
        count: c.count,
      }))}
      products={products}
      catalog={catalog}
    />
  )
}
