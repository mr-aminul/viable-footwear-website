'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart, Info, RotateCcw, Star, Truck } from 'lucide-react'
import {
  saveProductVariants,
  saveRelatedProducts,
  updateProduct,
} from '@/lib/catalog/actions/products'
import { slugify } from '@/lib/catalog/slug'
import { widthLabel } from '@/lib/catalog/sizing'
import { adminProductPath } from '@/lib/admin/paths'
import type { ProductWidth } from '@/lib/catalog/types'
import type { AdminProductView, RelatedPickerProduct } from '@/lib/catalog/queries'
import { normalizeProductBadge } from '@/lib/catalog/badge'
import type { ProductBadge } from '@/lib/catalog/constants'
import {
  AdminProductGallery,
  type GalleryMedia,
} from '@/components/admin/AdminProductGallery'
import { resolveMediaUrl } from '@/lib/catalog/media-url'
import { galleryForColor } from '@/lib/catalog/gallery'
import {
  VariantsEditor,
  buildVariantsPayload,
  createEmptyVariantDraft,
  type VariantDraft,
} from '@/components/admin/VariantsEditor'
import { RelatedProductsPicker } from '@/components/admin/RelatedProductsPicker'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import { ProductAccordion } from '@/components/ProductAccordion'
import {
  FormError,
  FormSuccess,
  softFieldClassName,
} from '@/components/admin/ui'

/** Compact soft fields — match storefront PDP rhythm (not the padded form fields). */
const pdpFieldClassName =
  'w-full rounded-lg border-0 bg-ink/[0.045] px-2 py-1 text-[14px] text-ink outline-none transition placeholder:text-mute focus:bg-ink/[0.07]'

const pdpTitleClassName =
  'w-full rounded-lg border-0 bg-ink/[0.045] px-2 py-0.5 font-display text-4xl font-extrabold leading-tight tracking-tight text-ink outline-none transition placeholder:text-mute focus:bg-ink/[0.07] md:text-5xl'

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
  const [subtitle, setSubtitle] = useState(product.subtitle ?? '')
  const [fitNote, setFitNote] = useState(product.fitNote ?? '')
  const [materials, setMaterials] = useState(product.materials ?? '')
  const [careInfo, setCareInfo] = useState(product.careInfo ?? '')
  const [widths, setWidths] = useState<ProductWidth[]>(product.widths ?? [])
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
  const [widthPreview, setWidthPreview] = useState<ProductWidth | null>(null)
  const [colorIndex, setColorIndex] = useState(0)

  const categoryLabel =
    categories.find((c) => c.id === categoryId)?.name ?? product.categoryLabel

  const toggleWidth = (value: ProductWidth) => {
    setWidths((current) =>
      current.includes(value)
        ? current.filter((w) => w !== value)
        : [...current, value],
    )
  }

  const colorOptions = useMemo(() => {
    const unique = new Map<string, { hex: string; name: string | null }>()
    for (const variant of product.variants) {
      const key = variant.colorHex || variant.color || 'default'
      if (!unique.has(key)) {
        unique.set(key, {
          hex: variant.colorHex || variant.color || '#1A3668',
          name: variant.color,
        })
      }
    }
    if (unique.size === 0 && product.colors.length > 0) {
      product.colors.forEach((c, i) =>
        unique.set(String(i), { hex: c, name: null }),
      )
    }
    return [...unique.entries()].map(([key, value]) => ({
      key,
      hex: value.hex,
      name: value.name,
      thumb:
        galleryForColor(product.images, value.hex)[0] ?? product.image,
    }))
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

  const variantImageOptions = useMemo(
    () =>
      [...media]
        .filter((m) => m.media_type === 'image')
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((m) => ({
          id: m.id,
          url: resolveMediaUrl(m.storage_path, 'image'),
          colorHex: m.color_hex ?? null,
        })),
    [media],
  )

  const save = () => {
    setError(null)
    setSuccess(null)
    const formData = new FormData()
    formData.set('name', name)
    formData.set('slug', slug)
    formData.set('description', description)
    formData.set('subtitle', subtitle)
    formData.set('fit_note', fitNote)
    formData.set('materials', materials)
    formData.set('care_info', careInfo)
    formData.set('widths', widths.join(','))
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
      if (slug !== product.slug) {
        router.replace(adminProductPath(slug))
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="mx-auto max-w-7xl">
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
              className={`${pdpFieldClassName} text-[13px] font-medium text-mute`}
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
            className={`${pdpTitleClassName} mt-2`}
            placeholder="Product name"
          />

          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className={`${pdpFieldClassName} mt-1 text-[15px] text-mute`}
            placeholder="Subtitle (e.g. suede)"
          />

          <div className="mt-2 flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 text-[12px] text-mute">/</span>
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              className={`${pdpFieldClassName} text-[13px] text-mute`}
              placeholder="slug"
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Star className="h-4 w-4 fill-gold text-gold" />
            <span className="text-[14px] font-medium">
              {product.rating.toFixed(1)}
            </span>
            <span className="text-[14px] text-mute">
              ({product.reviews} reviews)
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <label className="flex items-baseline gap-1 rounded-lg bg-ink/[0.045] px-2 py-1 transition focus-within:bg-ink/[0.07]">
              <span className="text-[14px] text-mute">৳</span>
              <input
                type="number"
                min={0}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-28 border-0 bg-transparent p-0 text-2xl font-semibold leading-none text-ink outline-none"
              />
            </label>
            <label className="flex items-baseline gap-1 rounded-lg bg-ink/[0.045] px-2 py-1 text-mute transition focus-within:bg-ink/[0.07]">
              <span className="text-[13px]">was ৳</span>
              <input
                type="number"
                min={0}
                step={1}
                value={compareAt}
                onChange={(e) => setCompareAt(e.target.value)}
                placeholder="—"
                className="w-24 border-0 bg-transparent p-0 text-[16px] leading-none text-mute line-through outline-none"
              />
            </label>
          </div>
          <p className="mt-1 text-[12px] text-mute">
            Incl. VAT · Free delivery across Bangladesh
          </p>

          {colorOptions.length > 0 ? (
            <div className="mt-8">
              <p className="text-[13px] font-semibold text-ink">
                Color
                {selectedColor?.name ? (
                  <span className="font-normal text-mute">
                    : {selectedColor.name}
                  </span>
                ) : null}
              </p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {colorOptions.map((c, i) => (
                  <button
                    key={c.key}
                    type="button"
                    aria-label={c.name ? `Color ${c.name}` : `Color ${i + 1}`}
                    title={c.name ?? undefined}
                    onClick={() => {
                      setColorIndex(i)
                      setSize(null)
                    }}
                    className={`h-12 w-12 shrink-0 overflow-hidden rounded-xl border bg-white transition ${
                      colorIndex === i
                        ? 'border-navy'
                        : 'border-cloud hover:border-navy/40'
                    }`}
                  >
                    {c.thumb ? (
                      <img
                        src={c.thumb}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span
                        className="block h-full w-full"
                        style={{
                          backgroundColor: c.hex,
                          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <label className="mt-6 block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
              Fit note (optional)
            </span>
            <div className="mt-1.5 flex items-start gap-2.5 rounded-xl bg-sky-50 px-3.5 py-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
              <input
                value={fitNote}
                onChange={(e) => setFitNote(e.target.value)}
                placeholder="e.g. Customers report this model runs small"
                className="w-full border-0 bg-transparent p-0 text-[13px] text-ink outline-none placeholder:text-mute"
              />
            </div>
          </label>

          <div className="mt-7">
            <p className="text-[13px] font-semibold text-ink">
              Width options
              <span className="ml-1 font-normal text-mute">
                (enable if product offers them)
              </span>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(['normal', 'narrow'] as const).map((w) => {
                const enabled = widths.includes(w)
                const previewActive = widthPreview === w
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      toggleWidth(w)
                      setWidthPreview(w)
                    }}
                    className={`rounded-xl border px-4 py-3.5 text-[13px] font-medium transition ${
                      enabled
                        ? previewActive
                          ? 'border-navy bg-navy text-white'
                          : 'border-navy/40 bg-white text-ink'
                        : 'border-dashed border-cloud bg-white text-mute'
                    }`}
                  >
                    {widthLabel(w)}
                    <span className="mt-0.5 block text-[11px] font-normal opacity-70">
                      {enabled ? 'Offered' : 'Not offered'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

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
            <span className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-full border border-cloud">
              <Heart className="h-[18px] w-[18px]" />
            </span>
            <span className="inline-flex min-w-[180px] flex-1 items-center justify-center gap-2 rounded-full bg-navy/90 px-6 py-3.5 text-[14px] font-semibold text-white sm:flex-none">
              Add to bag
            </span>
          </div>

          <ul className="mt-8 space-y-3">
            <li className="flex items-start gap-3 text-[13px] leading-relaxed text-mute">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
              <span>
                <span className="font-semibold text-ink">Delivery: </span>
                24hrs within Dhaka, 48–72hrs outside Dhaka
              </span>
            </li>
            <li className="flex items-start gap-3 text-[13px] leading-relaxed text-mute">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
              <span>
                <span className="font-semibold text-ink">Free returns: </span>
                7-day return policy on unused pairs
              </span>
            </li>
            <li className="flex items-start gap-3 text-[13px] leading-relaxed text-mute">
              <Star className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
              <span>
                <span className="font-semibold text-ink">Authentic: </span>
                Genuine footwear, curated for Bangladesh
              </span>
            </li>
          </ul>

          <div className="mt-10 border-t border-cloud">
            <ProductAccordion title="Product description" defaultOpen>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Product description"
                className={`${pdpFieldClassName} resize-y text-[14px] leading-relaxed text-mute focus:text-ink`}
              />
            </ProductAccordion>
            <ProductAccordion title="Materials">
              <textarea
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                rows={3}
                placeholder="Upper, footbed, sole materials…"
                className={`${pdpFieldClassName} resize-y text-[14px] leading-relaxed text-mute focus:text-ink`}
              />
            </ProductAccordion>
            <ProductAccordion title="Care & safety">
              <textarea
                value={careInfo}
                onChange={(e) => setCareInfo(e.target.value)}
                rows={3}
                placeholder="Care instructions, manufacturer notes…"
                className={`${pdpFieldClassName} resize-y text-[14px] leading-relaxed text-mute focus:text-ink`}
              />
            </ProductAccordion>
            <ProductAccordion title="Reviews">
              <p>
                {product.rating.toFixed(1)} · {product.reviews} reviews
                (storefront summary)
              </p>
            </ProductAccordion>
          </div>

          <p className="mt-6 text-[13px] text-mute">
            More from:{' '}
            <span className="font-medium text-navy">{categoryLabel}</span>
          </p>

          <label className="mt-6 block max-w-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
              Shipping weight (kg)
            </span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className={`${pdpFieldClassName} mt-1.5`}
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
          <VariantsEditor
            productId={product.id}
            rows={variantRows}
            onChange={setVariantRows}
            images={variantImageOptions}
          />
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
