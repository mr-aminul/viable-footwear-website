'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Copy, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { formatPrice } from '@/lib/brand'
import {
  computeCodCheckoutTotals,
  isValidBdMobile,
  PATHAO_ADDRESS_MAX_LENGTH,
} from '@/lib/orders/cod-total'

interface PathaoCity {
  city_id: number
  city_name: string
}
interface PathaoZone {
  zone_id: number
  zone_name: string
}
interface PathaoArea {
  area_id: number
  area_name: string
}

type CheckoutFieldKey =
  | 'cityId'
  | 'zoneId'
  | 'areaId'
  | 'address'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'secondaryPhone'

interface CheckoutErrorState {
  title: string
  message: string
  field?: CheckoutFieldKey
}

const inputClass =
  'mt-1.5 w-full rounded-xl border border-cloud bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-navy/40 focus:ring-2 focus:ring-navy/10'

export function CheckoutPage() {
  const router = useRouter()
  const { items, cartTotal, cartWeightKg, clearCart, hydrated } = useCart()
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [placedTotal, setPlacedTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<CheckoutErrorState | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    secondaryPhone: '',
    address: '',
    cityId: '',
    cityName: '',
    zoneId: '',
    zoneName: '',
    areaId: '',
    areaName: '',
  })
  const [showSecondaryPhone, setShowSecondaryPhone] = useState(false)
  const [cities, setCities] = useState<PathaoCity[]>([])
  const [zones, setZones] = useState<PathaoZone[]>([])
  const [areas, setAreas] = useState<PathaoArea[]>([])
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [zonesLoading, setZonesLoading] = useState(false)
  const [areasLoading, setAreasLoading] = useState(false)
  const [shippingPrice, setShippingPrice] = useState<number | null>(null)
  const [shippingPriceLoading, setShippingPriceLoading] = useState(false)
  const [shippingPriceError, setShippingPriceError] = useState<string | null>(
    null,
  )
  const [copied, setCopied] = useState(false)
  const fieldRefs = useRef<
    Partial<Record<CheckoutFieldKey, HTMLInputElement | HTMLSelectElement | null>>
  >({})

  const addressSuffix = [formData.areaName, formData.zoneName, formData.cityName]
    .filter(Boolean)
    .join(', ')
  const addressMaxLength = Math.max(
    0,
    PATHAO_ADDRESS_MAX_LENGTH - (addressSuffix ? addressSuffix.length + 2 : 0),
  )

  const totals =
    shippingPrice != null
      ? computeCodCheckoutTotals(cartTotal, shippingPrice)
      : null

  const focusField = useCallback(
    (field: CheckoutFieldKey) => {
      const runFocus = () => {
        const el = fieldRefs.current[field]
        if (!el) return
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        window.setTimeout(() => el.focus(), 120)
      }
      if (field === 'secondaryPhone' && !showSecondaryPhone) {
        setShowSecondaryPhone(true)
        window.setTimeout(runFocus, 50)
        return
      }
      runFocus()
    },
    [showSecondaryPhone],
  )

  useEffect(() => {
    if (!hydrated) return
    if (items.length === 0 && !orderPlaced) {
      router.replace('/cart')
    }
  }, [hydrated, items.length, orderPlaced, router])

  useEffect(() => {
    fetch('/api/pathao/cities', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) setCities(j.data)
      })
      .catch(() => {})
      .finally(() => setCitiesLoading(false))
  }, [])

  const loadZones = useCallback((cityId: string) => {
    if (!cityId) {
      setZones([])
      setAreas([])
      setShippingPrice(null)
      return
    }
    setZonesLoading(true)
    setZones([])
    setAreas([])
    setShippingPrice(null)
    setFormData((prev) => ({
      ...prev,
      zoneId: '',
      zoneName: '',
      areaId: '',
      areaName: '',
    }))
    fetch(`/api/pathao/zones?city_id=${encodeURIComponent(cityId)}`, {
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) setZones(j.data)
      })
      .catch(() => {})
      .finally(() => setZonesLoading(false))
  }, [])

  const loadAreas = useCallback((zoneId: string) => {
    if (!zoneId) {
      setAreas([])
      return
    }
    setAreasLoading(true)
    setAreas([])
    setFormData((prev) => ({ ...prev, areaId: '', areaName: '' }))
    fetch(`/api/pathao/areas?zone_id=${encodeURIComponent(zoneId)}`, {
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) setAreas(j.data)
      })
      .catch(() => {})
      .finally(() => setAreasLoading(false))
  }, [])

  const loadShippingPrice = useCallback(
    (cityId: string, zoneId: string, itemWeight: number) => {
      if (!cityId || !zoneId) {
        setShippingPrice(null)
        setShippingPriceError(null)
        return
      }
      setShippingPriceLoading(true)
      setShippingPrice(null)
      setShippingPriceError(null)
      fetch('/api/pathao/price', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_id: Number(cityId),
          zone_id: Number(zoneId),
          item_weight: itemWeight,
        }),
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.success && typeof j.price === 'number') {
            setShippingPrice(j.price)
            setShippingPriceError(null)
          } else {
            setShippingPriceError(j.error || 'Could not get shipping rate')
          }
        })
        .catch(() => setShippingPriceError('Could not load shipping rate'))
        .finally(() => setShippingPriceLoading(false))
    },
    [],
  )

  useEffect(() => {
    if (formData.zoneId && formData.cityId) {
      loadShippingPrice(formData.cityId, formData.zoneId, cartWeightKg)
    } else {
      setShippingPrice(null)
      setShippingPriceError(null)
    }
  }, [formData.cityId, formData.zoneId, cartWeightKg, loadShippingPrice])

  const getValidationError = (): CheckoutErrorState | null => {
    if (!formData.fullName.trim()) {
      return {
        title: 'Name required',
        message: 'Please enter your full name.',
        field: 'fullName',
      }
    }
    if (!formData.phone.trim()) {
      return {
        title: 'Phone required',
        message: 'Please enter your mobile number.',
        field: 'phone',
      }
    }
    const digits = formData.phone.replace(/\D/g, '')
    const normalized =
      digits.length === 11 && digits.startsWith('01')
        ? digits
        : digits.length === 13 && digits.startsWith('8801')
          ? digits.slice(2)
          : digits
    if (!isValidBdMobile(normalized)) {
      return {
        title: 'Check your phone number',
        message: 'Use an 11-digit BD mobile number, e.g. 01712345678.',
        field: 'phone',
      }
    }
    if (!formData.address.trim()) {
      return {
        title: 'Address required',
        message: 'Please enter your detailed delivery address.',
        field: 'address',
      }
    }
    if (!formData.cityId) {
      return {
        title: 'City required',
        message: 'Please select a city.',
        field: 'cityId',
      }
    }
    if (!formData.zoneId) {
      return {
        title: 'Zone required',
        message: 'Please select a zone.',
        field: 'zoneId',
      }
    }
    if (shippingPriceLoading) {
      return {
        title: 'Shipping still calculating',
        message: 'Wait for the delivery charge to load, then try again.',
        field: 'zoneId',
      }
    }
    if (shippingPrice == null) {
      return {
        title: 'Delivery charge unavailable',
        message:
          shippingPriceError ||
          'Select city and zone again to refresh the delivery quote.',
        field: 'zoneId',
      }
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const validationError = getValidationError()
    if (validationError) {
      setError(validationError)
      if (validationError.field) focusField(validationError.field)
      return
    }

    const missingVariant = items.find((i) => !i.variantId)
    if (missingVariant) {
      setError({
        title: 'Bag your bag',
        message: `${missingVariant.product.name} is missing a size variant. Remove it and add it again from the product page.`,
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim() || undefined,
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          ...(formData.secondaryPhone.trim() && {
            secondaryPhone: formData.secondaryPhone.trim(),
          }),
          address: formData.address.trim(),
          city_id: Number(formData.cityId),
          zone_id: Number(formData.zoneId),
          area_id: formData.areaId ? Number(formData.areaId) : 0,
          city_name: formData.cityName,
          zone_name: formData.zoneName,
          area_name: formData.areaName || '',
          items: items.map((item) => ({
            productId: item.product.id,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      })
      const data = (await res.json()) as {
        success?: boolean
        error?: string
        orderId?: string
        total?: number
      }

      if (!res.ok || !data.success) {
        setError({
          title: "We couldn't place your order",
          message:
            data.error ||
            'Please review your delivery details and try again.',
        })
        setLoading(false)
        return
      }

      setOrderId(data.orderId ?? null)
      setPlacedTotal(typeof data.total === 'number' ? data.total : null)
      setOrderPlaced(true)
      clearCart()
    } catch {
      setError({
        title: 'Connection problem',
        message: 'Check your internet connection and try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center text-mute md:px-6">
        Loading checkout…
      </div>
    )
  }

  if (orderPlaced) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 md:px-6">
        <div className="flex flex-col items-center text-center">
          <motion.div
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-navy text-white"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            <Check className="h-8 w-8" strokeWidth={2.5} />
          </motion.div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Order confirmed
          </h1>
          <p className="mt-3 max-w-md text-[15px] text-mute">
            Pay cash on delivery when your order arrives. We&apos;ll prepare it
            for Pathao shipping shortly.
          </p>
        </div>

        {orderId ? (
          <div className="mt-8 rounded-2xl border border-cloud bg-mist/60 p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-mute">
              Order number
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="font-mono text-[18px] font-semibold text-ink">
                {orderId}
              </p>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(orderId).then(() => {
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 2000)
                  })
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-cloud bg-white px-3 py-1.5 text-[12px] font-medium text-ink"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            {placedTotal != null ? (
              <p className="mt-3 text-[14px] text-mute">
                Amount to collect:{' '}
                <span className="font-semibold text-ink">
                  {formatPrice(placedTotal)}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/shop"
            className="inline-flex justify-center rounded-full bg-navy px-6 py-3.5 text-[14px] font-semibold text-white hover:bg-navy-soft"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return null
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14 lg:px-8">
      <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
        Checkout
      </h1>
      <p className="mt-2 text-[15px] text-mute">
        Cash on delivery · Pathao shipping quote
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]"
      >
        <div className="space-y-6">
          <section className="rounded-2xl border border-cloud bg-white p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold">Contact</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                  Full name
                </span>
                <input
                  ref={(el) => {
                    fieldRefs.current.fullName = el
                  }}
                  className={inputClass}
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, fullName: e.target.value }))
                  }
                  autoComplete="name"
                  required
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                  Phone
                </span>
                <input
                  ref={(el) => {
                    fieldRefs.current.phone = el
                  }}
                  className={inputClass}
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="01712345678"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                  Email <span className="normal-case">(optional)</span>
                </span>
                <input
                  ref={(el) => {
                    fieldRefs.current.email = el
                  }}
                  className={inputClass}
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, email: e.target.value }))
                  }
                  autoComplete="email"
                />
              </label>
            </div>
            {showSecondaryPhone ? (
              <label className="mt-4 block">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                  Secondary phone
                </span>
                <input
                  ref={(el) => {
                    fieldRefs.current.secondaryPhone = el
                  }}
                  className={inputClass}
                  value={formData.secondaryPhone}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      secondaryPhone: e.target.value,
                    }))
                  }
                  inputMode="tel"
                />
              </label>
            ) : (
              <button
                type="button"
                className="mt-3 text-[13px] font-medium text-navy hover:underline"
                onClick={() => setShowSecondaryPhone(true)}
              >
                + Add secondary phone
              </button>
            )}
          </section>

          <section className="rounded-2xl border border-cloud bg-white p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold">Delivery</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                  City
                </span>
                <select
                  ref={(el) => {
                    fieldRefs.current.cityId = el
                  }}
                  className={inputClass}
                  value={formData.cityId}
                  disabled={citiesLoading}
                  onChange={(e) => {
                    const city = cities.find(
                      (c) => String(c.city_id) === e.target.value,
                    )
                    setFormData((p) => ({
                      ...p,
                      cityId: e.target.value,
                      cityName: city?.city_name ?? '',
                    }))
                    loadZones(e.target.value)
                  }}
                  required
                >
                  <option value="">
                    {citiesLoading ? 'Loading…' : 'Select city'}
                  </option>
                  {cities.map((c) => (
                    <option key={c.city_id} value={c.city_id}>
                      {c.city_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                  Zone
                </span>
                <select
                  ref={(el) => {
                    fieldRefs.current.zoneId = el
                  }}
                  className={inputClass}
                  value={formData.zoneId}
                  disabled={!formData.cityId || zonesLoading}
                  onChange={(e) => {
                    const zone = zones.find(
                      (z) => String(z.zone_id) === e.target.value,
                    )
                    setFormData((p) => ({
                      ...p,
                      zoneId: e.target.value,
                      zoneName: zone?.zone_name ?? '',
                    }))
                    loadAreas(e.target.value)
                  }}
                  required
                >
                  <option value="">
                    {zonesLoading ? 'Loading…' : 'Select zone'}
                  </option>
                  {zones.map((z) => (
                    <option key={z.zone_id} value={z.zone_id}>
                      {z.zone_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                  Area
                </span>
                <select
                  ref={(el) => {
                    fieldRefs.current.areaId = el
                  }}
                  className={inputClass}
                  value={formData.areaId}
                  disabled={!formData.zoneId || areasLoading}
                  onChange={(e) => {
                    const area = areas.find(
                      (a) => String(a.area_id) === e.target.value,
                    )
                    setFormData((p) => ({
                      ...p,
                      areaId: e.target.value,
                      areaName: area?.area_name ?? '',
                    }))
                  }}
                >
                  <option value="">
                    {areasLoading ? 'Loading…' : 'Select area (optional)'}
                  </option>
                  {areas.map((a) => (
                    <option key={a.area_id} value={a.area_id}>
                      {a.area_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-4 block">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                Detailed address
              </span>
              <input
                ref={(el) => {
                  fieldRefs.current.address = el
                }}
                className={inputClass}
                value={formData.address}
                maxLength={addressMaxLength}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, address: e.target.value }))
                }
                placeholder="House, road, landmark"
                required
              />
              <p className="mt-1 text-[12px] text-mute">
                {formData.address.length}/{addressMaxLength} · city/zone/area
                are added automatically
              </p>
            </label>
          </section>

          {error ? (
            <div
              role="alert"
              className="rounded-2xl border border-spark/30 bg-spark/5 px-4 py-3"
            >
              <p className="text-[14px] font-semibold text-spark">{error.title}</p>
              <p className="mt-1 text-[13px] text-ink/80">{error.message}</p>
            </div>
          ) : null}
        </div>

        <aside className="h-fit rounded-2xl bg-mist/80 p-6 lg:sticky lg:top-28">
          <h2 className="text-[15px] font-semibold">Order summary</h2>
          <ul className="mt-4 space-y-3 border-b border-cloud pb-4">
            {items.map((item) => (
              <li
                key={`${item.product.id}-${item.size}-${item.variantId}`}
                className="flex justify-between gap-3 text-[13px]"
              >
                <span className="text-mute">
                  {item.product.name} · EU {item.size} × {item.quantity}
                </span>
                <span className="shrink-0 font-medium text-ink">
                  {formatPrice(item.product.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 text-[14px]">
            <div className="flex justify-between text-mute">
              <span>Subtotal</span>
              <span className="font-medium text-ink">
                {formatPrice(cartTotal)}
              </span>
            </div>
            <div className="flex justify-between text-mute">
              <span>Delivery + COD fee</span>
              <span className="font-medium text-ink">
                {shippingPriceLoading
                  ? 'Calculating…'
                  : totals
                    ? formatPrice(totals.shipping)
                    : '—'}
              </span>
            </div>
            {shippingPriceError ? (
              <p className="text-[12px] text-spark">{shippingPriceError}</p>
            ) : null}
            <div className="flex justify-between border-t border-cloud pt-3 text-[16px] font-semibold text-ink">
              <span>Total (COD)</span>
              <span>{totals ? formatPrice(totals.total) : '—'}</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || shippingPriceLoading || shippingPrice == null}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy py-3.5 text-[14px] font-semibold text-white transition hover:bg-navy-soft disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Placing order…
              </>
            ) : (
              'Place COD order'
            )}
          </button>
          <Link
            href="/cart"
            className="mt-3 block text-center text-[13px] font-medium text-navy underline-offset-4 hover:underline"
          >
            Back to bag
          </Link>
        </aside>
      </form>
    </div>
  )
}
