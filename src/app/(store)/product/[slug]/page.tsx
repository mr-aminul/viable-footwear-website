import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ProductPage } from '@/components/pages/ProductPage'
import {
  getRelatedProductIds,
  getRelatedProducts,
  getStoreProductBySlug,
} from '@/lib/catalog/queries'
import { getSiteContent } from '@/lib/website/queries'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [product, site] = await Promise.all([
    getStoreProductBySlug(slug),
    getSiteContent(),
  ])
  if (!product) return { title: 'Product not found' }

  const title = product.seoTitle || `${product.name} | ${site.brand.name}`
  const description =
    product.seoDescription || product.description.slice(0, 160)
  const imageUrls =
    product.images.length > 0
      ? product.images.map((img) => img.url)
      : [product.image]

  return {
    // Absolute avoids root template appending "· Viable" onto seo titles
    // that already include the brand (e.g. "Noir Cloud Slide | Viable").
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      images: imageUrls,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [product.image],
    },
  }
}

export default async function ProductRoute({ params }: Props) {
  const { slug } = await params
  const [product, site] = await Promise.all([
    getStoreProductBySlug(slug),
    getSiteContent(),
  ])
  if (!product) notFound()

  const relatedIds = await getRelatedProductIds(product.id)
  const related = await getRelatedProducts(product, relatedIds)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image:
      product.images.length > 0
        ? product.images.map((img) => img.url)
        : [product.image],
    sku: product.slug,
    brand: {
      '@type': 'Brand',
      name: site.brand.name,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BDT',
      price: product.price,
      availability:
        product.variants.some((v) => v.stock > 0)
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `/product/${product.slug}`,
    },
    aggregateRating:
      product.reviews > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviews,
          }
        : undefined,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductPage product={product} related={related} />
    </>
  )
}
