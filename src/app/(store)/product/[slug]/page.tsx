import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ProductPage } from '@/components/pages/ProductPage'
import { BRAND } from '@/lib/brand'
import {
  getRelatedProductIds,
  getRelatedProducts,
  getStoreProductBySlug,
} from '@/lib/catalog/queries'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getStoreProductBySlug(slug)
  if (!product) return { title: 'Product not found' }

  const title = product.seoTitle || `${product.name} | ${BRAND.name}`
  const description =
    product.seoDescription || product.description.slice(0, 160)

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.images.length > 0 ? product.images : [product.image],
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
  const product = await getStoreProductBySlug(slug)
  if (!product) notFound()

  const relatedIds = await getRelatedProductIds(product.id)
  const related = await getRelatedProducts(product, relatedIds)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.length > 0 ? product.images : [product.image],
    sku: product.slug,
    brand: {
      '@type': 'Brand',
      name: BRAND.name,
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
