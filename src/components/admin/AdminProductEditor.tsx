'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart, Star, Truck } from 'lucide-react'
import {
  saveProductVariants,
  saveRelatedProducts,
  updateProduct,
} from '@/lib/catalog/actions/products'
import { slugify } from '@/lib/catalog/slug'
import type { AdminProductView, RelatedPickerProduct } from '@/lib/catalog/queries'
import { normalizeProductBadge } from '@/lib/catalog/badge'
import type { ProductBadge } from '@/lib/catalog/constants'
import {
  AdminProductGallery,
  type GalleryMedia,
} from '@/components/admin/AdminProductGallery'
import { normalizeColorHex } from '@/lib/catalog/gallery'
import {
  VariantsEditor,
  buildVariantsPayload,
  createEmptyVariantDraft,
  type VariantDraft,
} from '@/components/admin/VariantsEditor'
import { RelatedProductsPicker } from '@/components/admin/RelatedProductsPicker'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import {
  FormError,
  FormSuccess,
  softFieldClassName,
} from '@/components/admin/ui'

type CategoryOption = { id: string; name: string }

type AdminProductEditorProps = {
  product: AdminProductView
  categories: CategoryOption[]
  media: GalleryMedia[]
  initialVariants: VariantDraft[]
  relatedCatalog: RelatedPickerProduct[]
  initialRelatedIds: string[]
}

/**
 * Visual PDP editor — layout matches the public product page, fields are editable.
 * One Save product persists details, variants, and related picks together.
 */
export function AdminProductEditor({
  product,
  categories,
  media,
  initialVariants,
  relatedCatalog,
  initialRelatedIds,
}: AdminProductEditorProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [name, setName] = useState(product.name)
  const [slug, setSlug] = useState(product.slug)
  const [slugTouched, setSlugTouched] = useState(true)
  const [description, setDescription] = useState(product.description)
  const [price, setPrice] = useState(String(product.price))
  const [compareAt, setCompareAt] = useState(
    product.compareAt != null ? String(product.compareAt) : '',
  )
  const [badge, setBadge] = useState<ProductBadge>(
    normalizeProductBadge(product.badge),
  )
  const [categoryId, setCategoryId] = useState(product.categoryId ?? '')
  const [featured, setFeatured] = useState(Boolean(product.featured))
  const [active, setActive] = useState(product.active)
  const [weightKg, setWeightKg] = useState(String(product.weightKg || 0.5))
  const [seoTitle, setSeoTitle] = useState(product.seoTitle ?? '')
  const [seoDescription, setSeoDescription] = useState(
    product.seoDescription ?? '',
  )
  const [variantRows, setVariantRows] = useState<VariantDraft[]>(
    initialVariants.length > 0 ? initialVariants : [createEmptyVariantDraft()],
  )
  const [relatedIds, setRelatedIds] = useState<string[]>(initialRelatedIds)

  const [size, setSize] = useState<number | null>(null)
  const [colorIndex, setColorIndex] = useState(0)

  const colorOptions = useMemo(() => {
    const unique = new Map<string, string>()
    for (const variant of product.variants) {
      const key = variant.colorHex || variant.color || 'default'
      if (!unique.has(key)) {
        unique.set(key, variant.colorHex || variant.color || '#1A3668')
      }
    }
    if (unique.size === 0 && product.colors.length > 0) {
      product.colors.forEach((c, i) => unique.set(String(i), c))
    }
    return [...unique.entries()].map(([key, hex]) => ({ key, hex }))
  }, [product])

  const selectedColor = colorOptions[colorIndex]
  const sizesForColor = useMemo(() => {
    if (!selectedColor) return product.sizes
    const matched = product.variants
      .filter((v) => {
        const key = v.colorHex || v.color || 'default'
        return key === selectedColor.key && v.stock > 0
      })
      .map((v) => v.sizeEu)
    return matched.length > 0
      ? [...new Set(matched)].sort((a, b) => a - b)
      : product.sizes
  }, [product, selectedColor])

  const categoryLabel =
    categories.find((c) => c.id === categoryId)?.name ?? product.categoryLabel

  const galleryColorOptions = useMemo(() => {
    const unique = new Map<string, string>()
    for (const row of variantRows) {
      const hex = normalizeColorHex(row.color_hex)
      if (!hex) continue
      if (!unique.has(hex)) {
        unique.set(hex, row.color.trim() || hex)
      }
    }
    return [...unique.entries()].map(([hex, label]) => ({ hex, label }))
  }, [variantRows])

  const save = () => {
    setError(null)
    setSuccess(null)
    const formData = new FormData()
    formData.set('name', name)
    formData.set('slug', slug)
    formData.set('description', description)
    formData.set('price', price)
    formData.set('compare_at', compareAt)
    formData.set('weight_kg', weightKg)
    formData.set('category_id', categoryId)
    formData.set('badge', badge)
    formData.set('seo_title', seoTitle)
    formData.set('seo_description', seoDescription)
    if (featured) formData.set('featured', 'on')
    if (active) formData.set('active', 'on')

    const variantsData = new FormData()
    variantsData.set('variants_json', buildVariantsPayload(variantRows))

    const relatedData = new FormData()
    relatedData.set('related_ids_json', JSON.stringify(relatedIds))

    startTransition(async () => {
      const variantsResult = await saveProductVariants(product.id, variantsData)
      if (!variantsResult.ok) {
        setError(variantsResult.error)
        return
      }

      const detailsResult = await updateProduct(product.id, formData)
      if (!detailsResult.ok) {
        setError(detailsResult.error)
        return
      }

      const relatedResult = await saveRelatedProducts(product.id, relatedData)
      if (!relatedResult.ok) {
        setError(relatedResult.error)
        return
      }

      setSuccess('Product saved.')
      router.refresh()
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/catalog"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-mute transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-full border border-cloud bg-white px-3 py-2 text-[12px] font-medium text-ink">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Featured
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            disabled={pending}
            onClick={() => setActive((value) => !value)}
            className={[
              'inline-flex items-center gap-2.5 rounded-full border bg-white px-3 py-2 text-[12px] font-medium disabled:opacity-60',
              active
                ? 'border-emerald-500 text-ink'
                : 'border-cloud text-ink',
            ].join(' ')}
          >
            <span className={active ? 'text-emerald-700' : 'text-mute'}>
              {active ? 'Live' : 'Draft'}
            </span>
            <span
              className={[
                'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
                active ? 'bg-emerald-600' : 'bg-cloud',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                  active ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </span>
          </button>
          <AdminActionButton type="button" disabled={pending} onClick={save}>
            {pending ? 'Saving…' : 'Save product'}
          </AdminActionButton>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <FormError message={error} />
        <FormSuccess message={success} />
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45 }}
          className="space-y-8"
        >
          <AdminProductGallery
            productId={product.id}
            productName={name || product.name}
            badge={badge || null}
            onBadgeChange={setBadge}
            isDraft={!active}
            media={media}
            colorOptions={galleryColorOptions}
            placeholderSrc={product.image}
          />

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
              SEO title
            </span>
            <input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className={`${softFieldClassName} mt-1.5`}
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
              SEO description
            </span>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              rows={3}
              className={`${softFieldClassName} mt-1.5 resize-y`}
            />
          </label>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <label className="block max-w-xs">
            <span className="sr-only">Category</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={`${softFieldClassName} text-[13px] font-medium text-mute`}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <p className="sr-only">{categoryLabel}</p>

          <input
            value={name}
            onChange={(e) => {
              const next = e.target.value
              setName(next)
              if (!slugTouched) setSlug(slugify(next))
            }}
            className={`${softFieldClassName} mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl`}
            placeholder="Product name"
          />

          <div className="mt-2 flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-[12px] text-mute">/</span>
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              className={`${softFieldClassName} text-[13px] text-mute`}
              placeholder="slug"
            />
          </div>

          <div className="mt-3 flex items-center gap-2 px-1">
            <Star className="h-4 w-4 fill-gold text-gold" />
            <span className="text-[14px] font-medium">
              {product.rating.toFixed(1)}
            </span>
            <span className="text-[14px] text-mute">
              ({product.reviews} reviews)
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 rounded-2xl bg-ink/[0.045] px-3.5 py-3 transition focus-within:bg-ink/[0.07]">
              <span className="text-[14px] text-mute">৳</span>
              <input
                type="number"
                min={0}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-28 border-0 bg-transparent p-0 text-2xl font-semibold text-ink outline-none"
              />
            </label>
            <label className="flex items-center gap-1.5 rounded-2xl bg-ink/[0.045] px-3.5 py-3 text-mute transition focus-within:bg-ink/[0.07]">
              <span className="text-[13px]">was ৳</span>
              <input
                type="number"
                min={0}
                step={1}
                value={compareAt}
                onChange={(e) => setCompareAt(e.target.value)}
                placeholder="—"
                className="w-24 border-0 bg-transparent p-0 text-[16px] text-mute line-through outline-none"
              />
            </label>
          </div>

          <label className="mt-5 block max-w-md">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Product description"
              className={`${softFieldClassName} mt-1.5 resize-y text-[15px] leading-relaxed text-mute focus:text-ink`}
            />
          </label>

          {colorOptions.length > 0 ? (
            <div className="mt-8">
              <p className="text-[13px] font-semibold text-ink">Color</p>
              <div className="mt-3 flex gap-2.5">
                {colorOptions.map((c, i) => (
                  <button
                    key={c.key}
                    type="button"
                    aria-label={`Color ${i + 1}`}
                    onClick={() => {
                      setColorIndex(i)
                      setSize(null)
                    }}
                    className={`h-9 w-9 rounded-full border-2 transition ${
                      colorIndex === i
                        ? 'scale-110 border-navy'
                        : 'border-transparent'
                    }`}
                    style={{
                      backgroundColor: c.hex,
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-7">
            <p className="text-[13px] font-semibold text-ink">Size (EU)</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(sizesForColor.length > 0 ? sizesForColor : product.sizes).map(
                (s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`min-w-12 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition ${
                      size === s
                        ? 'border-navy bg-navy text-white'
                        : 'border-cloud bg-white text-ink hover:border-navy/40'
                    }`}
                  >
                    {s}
                  </button>
                ),
              )}
              {product.sizes.length === 0 ? (
                <p className="text-[13px] text-mute">
                  Add sizes in Variants & SKUs below.
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="inline-flex min-w-[180px] flex-1 items-center justify-center gap-2 rounded-full bg-navy/90 px-6 py-3.5 text-[14px] font-semibold text-white sm:flex-none">
              Add to bag
            </span>
            <span className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-full border border-cloud">
              <Heart className="h-[18px] w-[18px]" />
            </span>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-mist/80 px-4 py-4">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
            <p className="text-[13px] leading-relaxed text-mute">
              Delivery across Bangladesh. 24hrs within Dhaka, 48-72hrs outside
              Dhaka!
            </p>
          </div>

          <label className="mt-4 block max-w-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
              Shipping weight (kg)
            </span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className={`${softFieldClassName} mt-1.5`}
            />
          </label>
        </motion.div>
      </div>

      <section className="mt-14">
        <h2 className="text-[15px] font-semibold text-ink">Variants & SKUs</h2>
        <p className="mt-1 text-[13px] text-mute">
          Size, color, SKU, and stock. Required before publishing.
        </p>
        <div className="mt-4">
          <VariantsEditor rows={variantRows} onChange={setVariantRows} />
        </div>
      </section>

      <section className="mt-20 border-t border-cloud pt-14">
        <h2 className="font-display text-3xl font-extrabold tracking-tight">
          You may also like
        </h2>
        <div className="mt-6">
          <RelatedProductsPicker
            catalog={relatedCatalog}
            selectedIds={relatedIds}
            onChange={setRelatedIds}
          />
        </div>
      </section>
    </div>
  )
}
