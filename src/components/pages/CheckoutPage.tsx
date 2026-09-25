'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Copy, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { useOrders } from '@/context/OrdersContext'
import { SearchableSelect, type SearchableSelectHandle } from '@/components/SearchableSelect'
import { formatPrice } from '@/lib/brand'
import {
  isValidBdMobile,
  PATHAO_ADDRESS_MAX_LENGTH,
} from '@/lib/orders/cod-total'
import {
  trackBeginCheckout,
  trackPurchase,
} from '@/lib/analytics/events'
import { showToast } from '@/components/ToastHost'

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

type CheckoutFormData = {
  email: string
  fullName: string
  phone: string
  secondaryPhone: string
  address: string
  cityId: string
  cityName: string
  zoneId: string
  zoneName: string
  areaId: string
  areaName: string
}

type CheckoutPaymentMethod = 'cod' | 'bkash' | 'nagad'

type CheckoutDraft = {
  formData: CheckoutFormData
  paymentMethod: CheckoutPaymentMethod
  showSecondaryPhone: boolean
}

const CHECKOUT_DRAFT_KEY = 'viable-checkout-draft'

const EMPTY_FORM: CheckoutFormData = {
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
}

function parsePaymentMethod(value: unknown): CheckoutPaymentMethod {
  if (value === 'bkash' || value === 'nagad') return value
  return 'cod'
}

function readCheckoutDraft(): CheckoutDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CHECKOUT_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CheckoutDraft>
    if (!parsed?.formData || typeof parsed.formData !== 'object') return null
    return {
      formData: { ...EMPTY_FORM, ...parsed.formData },
      paymentMethod: parsePaymentMethod(parsed.paymentMethod),
      showSecondaryPhone: Boolean(parsed.showSecondaryPhone),
    }
  } catch {
    return null
  }
}

const inputClass =
  'mt-1.5 w-full rounded-xl border border-cloud bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-navy/40 focus:ring-2 focus:ring-navy/10'

const inputErrorClass =
  'mt-1.5 w-full rounded-xl border border-spark/50 bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-spark/50 focus:ring-2 focus:ring-spark/15'

function normalizeBdMobile(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('01')) return digits
  if (digits.length === 13 && digits.startsWith('8801')) return digits.slice(2)
  return digits
}

function fieldClass(hasError: boolean) {
  return hasError ? inputErrorClass : inputClass
}

function SectionHeading({
  step,
  title,
  hint,
}: {
  step: number
  title: string
  hint?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-[12px] font-bold text-white">
        {step}
      </span>
      <div className="min-w-0 pt-0.5">
        <h2 className="text-[15px] font-semibold leading-none">{title}</h2>
        {hint ? (
          <p className="mt-1.5 text-[13px] text-mute">{hint}</p>
        ) : null}
      </div>
    </div>
  )
}

export function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items, cartTotal, cartCount, cartWeightKg, clearCart, hydrated } =
    useCart()
  const { addOrder } = useOrders()
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [placedTotal, setPlacedTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<CheckoutErrorState | null>(null)
  const [paymentMethod, setPaymentMethod] =
    useState<CheckoutPaymentMethod>('cod')
  const [bkashAvailable, setBkashAvailable] = useState(false)
  const [nagadAvailable, setNagadAvailable] = useState(false)
  const [gatewaysChecked, setGatewaysChecked] = useState(false)
  const [quoteCodTotal, setQuoteCodTotal] = useState<number | null>(null)
  const [quoteCodShipping, setQuoteCodShipping] = useState<number | null>(null)
  const [quotePrepaidTotal, setQuotePrepaidTotal] = useState<number | null>(
    null,
  )
  const [quotePrepaidShipping, setQuotePrepaidShipping] = useState<
    number | null
  >(null)
  const [formData, setFormData] = useState<CheckoutFormData>(EMPTY_FORM)
  const [showSecondaryPhone, setShowSecondaryPhone] = useState(false)
  const [draftHydrated, setDraftHydrated] = useState(false)
  const [cities, setCities] = useState<PathaoCity[]>([])
  const [zones, setZones] = useState<PathaoZone[]>([])
  const [areas, setAreas] = useState<PathaoArea[]>([])
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [zonesLoading, setZonesLoading] = useState(false)
  const [areasLoading, setAreasLoading] = useState(false)
  const [shippingPrice, setShippingPrice] = useState<number | null>(null)
  const [campaignLabel, setCampaignLabel] = useState<string | null>(null)
  const [campaignDiscount, setCampaignDiscount] = useState<number | null>(null)
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] = useState('')
  const [promoLabel, setPromoLabel] = useState<string | null>(null)
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [shippingPriceLoading, setShippingPriceLoading] = useState(false)
  const [shippingPriceError, setShippingPriceError] = useState<string | null>(
    null,
  )
  const [copied, setCopied] = useState(false)
  const fieldRefs = useRef<
    Partial<
      Record<
        CheckoutFieldKey,
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | SearchableSelectHandle
        | null
      >
    >
  >({})

  const clearFieldError = useCallback((field: CheckoutFieldKey) => {
    setError((prev) => (prev?.field === field ? null : prev))
  }, [])

  const quoteShipping =
    paymentMethod === 'cod' ? quoteCodShipping : quotePrepaidShipping
  const quoteTotal =
    paymentMethod === 'cod' ? quoteCodTotal : quotePrepaidTotal

  useEffect(() => {
    const pay = searchParams.get('pay')
    const msg = searchParams.get('message')
    const oid = searchParams.get('orderId')
    if (pay === 'success' && oid) {
      setOrderId(oid)
      setOrderPlaced(true)
      let purchaseValue = 0
      try {
        const raw = window.sessionStorage.getItem('viable-purchase')
        if (raw) {
          const pending = JSON.parse(raw) as {
            orderId?: string
            total?: number
          }
          if (pending.orderId === oid && typeof pending.total === 'number') {
            purchaseValue = pending.total
            setPlacedTotal(pending.total)
          }
          window.sessionStorage.removeItem('viable-purchase')
        }
      } catch {
        // ignore
      }
      trackPurchase({ transactionId: oid, value: purchaseValue })
      try {
        window.localStorage.removeItem(CHECKOUT_DRAFT_KEY)
      } catch {
        // ignore
      }
      clearCart()
      return
    }
    if (pay === 'failed') {
      const message = msg || 'Payment did not finish. You can try again.'
      setError({
        title: 'Payment not completed',
        message,
      })
      showToast({
        title: 'Payment not completed',
        message,
      })
    }
  }, [searchParams, clearCart])

  useEffect(() => {
    if (!hydrated || items.length === 0) return
    trackBeginCheckout({
      value: cartTotal,
      items: items.map((item) => ({
        item_id: item.product.id,
        item_name: item.product.name,
        item_category: item.product.categoryLabel || item.product.category,
        price: item.product.price,
        quantity: item.quantity,
        item_variant: `EU ${item.size}`,
      })),
    })
    // Once per checkout visit with a cart
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  useEffect(() => {
    Promise.all([
      fetch('/api/payments/bkash/status', { cache: 'no-store' })
        .then((r) => r.json())
        .then((j) => {
          if (j?.configured) setBkashAvailable(true)
        })
        .catch(() => {}),
      fetch('/api/payments/nagad/status', { cache: 'no-store' })
        .then((r) => r.json())
        .then((j) => {
          if (j?.configured) setNagadAvailable(true)
        })
        .catch(() => {}),
    ]).finally(() => setGatewaysChecked(true))
  }, [])

  const addressSuffix = [formData.areaName, formData.zoneName, formData.cityName]
    .filter(Boolean)
    .join(', ')
  const addressMaxLength = Math.max(
    0,
    PATHAO_ADDRESS_MAX_LENGTH - (addressSuffix ? addressSuffix.length + 2 : 0),
  )

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

  const loadZones = useCallback(
    (cityId: string, options?: { resetSelection?: boolean }) => {
      const resetSelection = options?.resetSelection ?? true
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
      if (resetSelection) {
        setFormData((prev) => ({
          ...prev,
          zoneId: '',
          zoneName: '',
          areaId: '',
          areaName: '',
        }))
      }
      fetch(`/api/pathao/zones?city_id=${encodeURIComponent(cityId)}`, {
        cache: 'no-store',
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.success && Array.isArray(j.data)) setZones(j.data)
        })
        .catch(() => {})
        .finally(() => setZonesLoading(false))
    },
    [],
  )

  const loadAreas = useCallback(
    (zoneId: string, options?: { resetSelection?: boolean }) => {
      const resetSelection = options?.resetSelection ?? true
      if (!zoneId) {
        setAreas([])
        return
      }
      setAreasLoading(true)
      setAreas([])
      if (resetSelection) {
        setFormData((prev) => ({ ...prev, areaId: '', areaName: '' }))
      }
      fetch(`/api/pathao/areas?zone_id=${encodeURIComponent(zoneId)}`, {
        cache: 'no-store',
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.success && Array.isArray(j.data)) setAreas(j.data)
        })
        .catch(() => {})
        .finally(() => setAreasLoading(false))
    },
    [],
  )

  useEffect(() => {
    const draft = readCheckoutDraft()
    if (draft) {
      setFormData(draft.formData)
      setPaymentMethod(draft.paymentMethod)
      setShowSecondaryPhone(
        draft.showSecondaryPhone || Boolean(draft.formData.secondaryPhone),
      )
      if (draft.formData.cityId) {
        loadZones(draft.formData.cityId, { resetSelection: false })
      }
      if (draft.formData.zoneId) {
        loadAreas(draft.formData.zoneId, { resetSelection: false })
      }
    }
    setDraftHydrated(true)
  }, [loadZones, loadAreas])

  useEffect(() => {
    if (!draftHydrated) return
    try {
      const draft: CheckoutDraft = {
        formData,
        paymentMethod,
        showSecondaryPhone:
          showSecondaryPhone || Boolean(formData.secondaryPhone),
      }
      window.localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // ignore quota errors
    }
  }, [formData, paymentMethod, showSecondaryPhone, draftHydrated])

  useEffect(() => {
    if (!gatewaysChecked) return
    if (paymentMethod === 'bkash' && !bkashAvailable) {
      setPaymentMethod('cod')
    }
    if (paymentMethod === 'nagad' && !nagadAvailable) {
      setPaymentMethod('cod')
    }
  }, [gatewaysChecked, bkashAvailable, nagadAvailable, paymentMethod])

  const loadShippingPrice = useCallback(
    (
      cityId: string,
      zoneId: string,
      itemWeight: number,
      subtotal: number,
      promoCode: string,
      cartItems: Array<{ productId: string; quantity: number }>,
    ) => {
      if (!cityId || !zoneId) {
        setShippingPrice(null)
        setQuoteCodTotal(null)
        setQuoteCodShipping(null)
        setQuotePrepaidTotal(null)
        setQuotePrepaidShipping(null)
        setCampaignLabel(null)
        setCampaignDiscount(null)
        setPromoLabel(null)
        setPromoDiscount(null)
        setPromoError(null)
        setShippingPriceError(null)
        return
      }
      setShippingPriceLoading(true)
      setShippingPrice(null)
      setQuoteCodTotal(null)
      setQuoteCodShipping(null)
      setQuotePrepaidTotal(null)
      setQuotePrepaidShipping(null)
      setCampaignLabel(null)
      setCampaignDiscount(null)
      setPromoLabel(null)
      setPromoDiscount(null)
      setPromoError(null)
      setShippingPriceError(null)
      fetch('/api/pathao/price', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_id: Number(cityId),
          zone_id: Number(zoneId),
          item_weight: itemWeight,
          subtotal,
          promo_code: promoCode || undefined,
          items: cartItems.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
          })),
        }),
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.success && typeof j.pathaoDeliveryFee === 'number') {
            setShippingPrice(j.pathaoDeliveryFee)
            setQuoteCodShipping(
              typeof j.shipping === 'number' ? j.shipping : null,
            )
            setQuoteCodTotal(typeof j.total === 'number' ? j.total : null)
            setQuotePrepaidShipping(
              typeof j.prepaidShipping === 'number' ? j.prepaidShipping : null,
            )
            setQuotePrepaidTotal(
              typeof j.prepaidTotal === 'number' ? j.prepaidTotal : null,
            )
            if (j.campaign?.name) {
              setCampaignLabel(String(j.campaign.name))
              setCampaignDiscount(
                typeof j.campaign.discount === 'number'
                  ? j.campaign.discount
                  : null,
              )
            }
            if (j.promo?.code) {
              setPromoLabel(String(j.promo.title || j.promo.code))
              setPromoDiscount(
                typeof j.promo.discount === 'number' ? j.promo.discount : null,
              )
              setPromoError(null)
            } else if (typeof j.promoError === 'string' && j.promoError) {
              setPromoError(j.promoError)
            }
            setShippingPriceError(null)
          } else if (j.success && typeof j.price === 'number') {
            setShippingPrice(j.price)
            setShippingPriceError(null)
          } else {
            setShippingPriceError(j.error || 'Could not get shipping rate')
            showToast({
              title: 'Delivery quote failed',
              message:
                j.error ||
                'We couldn’t get a Pathao rate for that address. Try again or pick another area.',
            })
          }
        })
        .catch(() => {
          setShippingPriceError('Could not load shipping rate')
          showToast({
            title: 'Delivery quote failed',
            message:
              'Check your connection and try selecting your city again.',
          })
        })
        .finally(() => setShippingPriceLoading(false))
    },
    [],
  )

  useEffect(() => {
    if (formData.zoneId && formData.cityId) {
      loadShippingPrice(
        formData.cityId,
        formData.zoneId,
        cartWeightKg,
        cartTotal,
        appliedPromoCode,
        items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      )
    } else {
      setShippingPrice(null)
      setQuoteCodTotal(null)
      setQuoteCodShipping(null)
      setQuotePrepaidTotal(null)
      setQuotePrepaidShipping(null)
      setCampaignLabel(null)
      setCampaignDiscount(null)
      setPromoLabel(null)
      setPromoDiscount(null)
      setPromoError(null)
      setShippingPriceError(null)
    }
  }, [
    formData.cityId,
    formData.zoneId,
    cartWeightKg,
    cartTotal,
    appliedPromoCode,
    items,
    loadShippingPrice,
  ])

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
    if (!isValidBdMobile(normalizeBdMobile(formData.phone))) {
      return {
        title: 'Check your phone number',
        message: 'Use an 11-digit BD mobile number, e.g. 01712345678.',
        field: 'phone',
      }
    }
    if (
      formData.secondaryPhone.trim() &&
      !isValidBdMobile(normalizeBdMobile(formData.secondaryPhone))
    ) {
      return {
        title: 'Check secondary phone',
        message: 'Use an 11-digit BD mobile number, e.g. 01712345678.',
        field: 'secondaryPhone',
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
    if (!formData.address.trim()) {
      return {
        title: 'Address required',
        message: 'Please enter your detailed delivery address.',
        field: 'address',
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
          payment_method: paymentMethod,
          ...(appliedPromoCode
            ? { promo_code: appliedPromoCode }
            : {}),
        }),
      })
      const data = (await res.json()) as {
        success?: boolean
        error?: string
        orderId?: string
        total?: number
        paymentMethod?: string
        bkashURL?: string
        nagadURL?: string
      }

      if (!res.ok || !data.success) {
        const message =
          data.error ||
          'Please review your delivery details and try again.'
        setError({
          title: "We couldn't place your order",
          message,
        })
        showToast({
          title: "We couldn't place your order",
          message,
        })
        setLoading(false)
        return
      }

      const redirectUrl = data.bkashURL || data.nagadURL
      if (redirectUrl) {
        if (data.orderId) {
          try {
            window.sessionStorage.setItem(
              'viable-purchase',
              JSON.stringify({
                orderId: data.orderId,
                total: typeof data.total === 'number' ? data.total : cartTotal,
              }),
            )
          } catch {
            // ignore
          }
          addOrder({
            orderId: data.orderId,
            date: new Date().toISOString(),
            phone: formData.phone.trim(),
            pathaoConsignmentId: null,
            status: 'pending_payment',
            total: typeof data.total === 'number' ? data.total : undefined,
            paymentMethod:
              paymentMethod === 'nagad'
                ? 'nagad'
                : paymentMethod === 'bkash'
                  ? 'bkash'
                  : 'cod',
            itemsSummary: items
              .map((i) => `${i.product.name} (EU ${i.size}) × ${i.quantity}`)
              .join(' · '),
          })
        }
        window.location.href = redirectUrl
        return
      }

      setOrderId(data.orderId ?? null)
      setPlacedTotal(typeof data.total === 'number' ? data.total : null)
      setOrderPlaced(true)
      if (data.orderId) {
        trackPurchase({
          transactionId: data.orderId,
          value: typeof data.total === 'number' ? data.total : cartTotal,
          items: items.map((item) => ({
            item_id: item.product.id,
            item_name: item.product.name,
            item_category: item.product.categoryLabel || item.product.category,
            price: item.product.price,
            quantity: item.quantity,
            item_variant: `EU ${item.size}`,
          })),
        })
      }
      try {
        window.localStorage.removeItem(CHECKOUT_DRAFT_KEY)
      } catch {
        // ignore
      }
      if (data.orderId) {
        addOrder({
          orderId: data.orderId,
          date: new Date().toISOString(),
          phone: formData.phone.trim(),
          pathaoConsignmentId: null,
          status: 'awaiting_fulfillment',
          total: typeof data.total === 'number' ? data.total : undefined,
          paymentMethod: paymentMethod === 'cod' ? 'cod' : paymentMethod,
          itemsSummary: items
            .map((i) => `${i.product.name} (EU ${i.size}) × ${i.quantity}`)
            .join(' · '),
        })
      }
      clearCart()
    } catch {
      setError({
        title: 'Connection problem',
        message: 'Check your internet connection and try again.',
      })
      showToast({
        title: 'Connection problem',
        message: 'Check your internet connection and try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!hydrated || !draftHydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center text-mute md:px-6">
        Loading checkout…
      </div>
    )
  }

  if (orderPlaced) {
    const paidOnline = searchParams.get('pay') === 'success'
    return (
      <div className="mx-auto max-w-lg px-4 py-16 md:px-6 md:py-20">
        <div className="flex flex-col items-center text-center">
          <motion.div
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-navy text-white"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <Check className="h-8 w-8" strokeWidth={2.5} />
          </motion.div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Order confirmed
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-mute">
            {paidOnline
              ? 'Payment received. We’ll prepare your order for Pathao shipping shortly.'
              : 'Pay cash on delivery when your order arrives. We’ll prepare it for Pathao shipping shortly.'}
          </p>
        </div>

        {orderId ? (
          <div className="mt-8 rounded-2xl border border-cloud bg-mist/80 p-5 sm:p-6">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-mute">
              Order number
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[18px] font-semibold tracking-tight text-navy">
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
                className="inline-flex items-center gap-1.5 rounded-full border border-cloud bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition hover:bg-white"
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
              <div className="mt-4 flex items-baseline justify-between border-t border-cloud pt-4">
                <span className="text-[13px] text-mute">
                  {paidOnline ? 'Amount paid' : 'Amount to pay'}
                </span>
                <span className="font-display text-[22px] tabular-nums tracking-tight text-navy-deep">
                  {formatPrice(placedTotal)}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/orders"
            className="inline-flex justify-center rounded-full bg-navy px-6 py-3.5 text-[14px] font-semibold text-white transition hover:bg-navy-soft"
          >
            View your orders
          </Link>
          <Link
            href="/shop"
            className="inline-flex justify-center rounded-full border border-cloud bg-white px-6 py-3.5 text-[14px] font-semibold text-ink transition hover:bg-mist"
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

  const canSubmit =
    !loading && !shippingPriceLoading && shippingPrice != null
  const submitLabel = loading
    ? paymentMethod === 'bkash'
      ? 'Redirecting to bKash…'
      : paymentMethod === 'nagad'
        ? 'Redirecting to Nagad…'
        : 'Placing order…'
    : paymentMethod === 'bkash'
      ? 'Pay with bKash'
      : paymentMethod === 'nagad'
        ? 'Pay with Nagad'
        : 'Place COD order'

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 pb-28 md:px-6 md:py-14 lg:px-8 lg:pb-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Checkout
          </h1>
          <p className="mt-2 text-[15px] text-mute">
            Delivery via Pathao · Pay on delivery, bKash, or Nagad
          </p>
        </div>
        <Link
          href="/cart"
          className="text-[13px] font-medium text-navy underline-offset-4 hover:underline"
        >
          Edit bag
        </Link>
      </div>

      <form
        id="checkout-form"
        onSubmit={handleSubmit}
        className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px] lg:gap-10"
      >
        <div className="space-y-5">
          <section className="rounded-2xl border border-cloud bg-white p-5 sm:p-6">
            <SectionHeading
              step={1}
              title="Contact"
              hint="We’ll use this to confirm delivery."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                  Full name
                </span>
                <input
                  ref={(el) => {
                    fieldRefs.current.fullName = el
                  }}
                  className={fieldClass(error?.field === 'fullName')}
                  value={formData.fullName}
                  onChange={(e) => {
                    clearFieldError('fullName')
                    setFormData((p) => ({ ...p, fullName: e.target.value }))
                  }}
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
                  className={fieldClass(error?.field === 'phone')}
                  value={formData.phone}
                  onChange={(e) => {
                    clearFieldError('phone')
                    setFormData((p) => ({ ...p, phone: e.target.value }))
                  }}
                  placeholder="01712345678"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                />
                <p className="mt-1 text-[12px] text-mute">
                  11-digit BD mobile
                </p>
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                  Email <span className="normal-case">(optional)</span>
                </span>
                <input
                  ref={(el) => {
                    fieldRefs.current.email = el
                  }}
                  className={fieldClass(error?.field === 'email')}
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    clearFieldError('email')
                    setFormData((p) => ({ ...p, email: e.target.value }))
                  }}
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
                  className={fieldClass(error?.field === 'secondaryPhone')}
                  value={formData.secondaryPhone}
                  onChange={(e) => {
                    clearFieldError('secondaryPhone')
                    setFormData((p) => ({
                      ...p,
                      secondaryPhone: e.target.value,
                    }))
                  }}
                  placeholder="01712345678"
                  inputMode="tel"
                />
              </label>
            ) : (
              <button
                type="button"
                className="mt-4 text-[13px] font-medium text-navy hover:underline"
                onClick={() => setShowSecondaryPhone(true)}
              >
                + Add secondary phone
              </button>
            )}
          </section>

          <section className="rounded-2xl border border-cloud bg-white p-5 sm:p-6">
            <SectionHeading
              step={2}
              title="Delivery"
              hint="Select city and zone to get your shipping quote."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                  City
                </span>
                <SearchableSelect
                  ref={(el) => {
                    fieldRefs.current.cityId = el
                  }}
                  value={formData.cityId}
                  disabled={citiesLoading}
                  invalid={error?.field === 'cityId'}
                  placeholder={citiesLoading ? 'Loading…' : 'Select city'}
                  searchPlaceholder="Search city…"
                  options={cities.map((c) => ({
                    value: String(c.city_id),
                    label: c.city_name,
                  }))}
                  onChange={(next) => {
                    clearFieldError('cityId')
                    const city = cities.find((c) => String(c.city_id) === next)
                    setFormData((p) => ({
                      ...p,
                      cityId: next,
                      cityName: city?.city_name ?? '',
                    }))
                    loadZones(next)
                  }}
                  required
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                  Zone
                </span>
                <SearchableSelect
                  ref={(el) => {
                    fieldRefs.current.zoneId = el
                  }}
                  value={formData.zoneId}
                  disabled={!formData.cityId || zonesLoading}
                  invalid={error?.field === 'zoneId'}
                  placeholder={
                    !formData.cityId
                      ? 'Select city first'
                      : zonesLoading
                        ? 'Loading…'
                        : 'Select zone'
                  }
                  searchPlaceholder="Search zone…"
                  options={zones.map((z) => ({
                    value: String(z.zone_id),
                    label: z.zone_name,
                  }))}
                  onChange={(next) => {
                    clearFieldError('zoneId')
                    const zone = zones.find((z) => String(z.zone_id) === next)
                    setFormData((p) => ({
                      ...p,
                      zoneId: next,
                      zoneName: zone?.zone_name ?? '',
                    }))
                    loadAreas(next)
                  }}
                  required
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                  Area
                </span>
                <SearchableSelect
                  ref={(el) => {
                    fieldRefs.current.areaId = el
                  }}
                  value={formData.areaId}
                  disabled={!formData.zoneId || areasLoading}
                  invalid={error?.field === 'areaId'}
                  placeholder={
                    !formData.zoneId
                      ? 'Select zone first'
                      : areasLoading
                        ? 'Loading…'
                        : 'Select area (optional)'
                  }
                  searchPlaceholder="Search area…"
                  options={areas.map((a) => ({
                    value: String(a.area_id),
                    label: a.area_name,
                  }))}
                  onChange={(next) => {
                    clearFieldError('areaId')
                    const area = areas.find((a) => String(a.area_id) === next)
                    setFormData((p) => ({
                      ...p,
                      areaId: next,
                      areaName: area?.area_name ?? '',
                    }))
                  }}
                />
              </label>
            </div>
            <label className="mt-4 block">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                Detailed address
              </span>
              <textarea
                ref={(el) => {
                  fieldRefs.current.address = el
                }}
                className={`${fieldClass(error?.field === 'address')} min-h-[5.5rem] resize-y`}
                value={formData.address}
                maxLength={addressMaxLength}
                onChange={(e) => {
                  clearFieldError('address')
                  setFormData((p) => ({ ...p, address: e.target.value }))
                }}
                placeholder="House, road, landmark"
                required
              />
              <p className="mt-1 text-[12px] text-mute">
                {formData.address.length}/{addressMaxLength}
                {addressSuffix
                  ? ` · “${addressSuffix}” is added automatically`
                  : ' · city/zone/area are added automatically'}
              </p>
            </label>
            {!formData.zoneId ? (
              <p className="mt-3 rounded-xl bg-mist/80 px-3.5 py-2.5 text-[13px] text-mute">
                Shipping charge appears after you pick a city and zone.
              </p>
            ) : shippingPriceLoading ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-mist/80 px-3.5 py-2.5 text-[13px] text-mute">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Calculating delivery charge…
              </p>
            ) : quoteShipping != null ? (
              <p className="mt-3 rounded-xl bg-navy/5 px-3.5 py-2.5 text-[13px] text-navy">
                Delivery charge:{' '}
                <span className="font-semibold tabular-nums">
                  {formatPrice(quoteShipping)}
                </span>
                {paymentMethod === 'cod' ? ' (included in COD total)' : ''}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-cloud bg-white p-5 sm:p-6">
            <SectionHeading step={3} title="Payment" />
            <p className="mt-2 text-[13px] text-mute">
              {gatewaysChecked
                ? [
                    'Cash on delivery',
                    bkashAvailable ? 'bKash' : null,
                    nagadAvailable ? 'Nagad' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : 'Checking available payment methods…'}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                aria-pressed={paymentMethod === 'cod'}
                className={[
                  'rounded-xl border px-4 py-3.5 text-left transition',
                  paymentMethod === 'cod'
                    ? 'border-navy bg-navy text-white'
                    : 'border-cloud bg-ink/[0.03] text-ink hover:bg-ink/[0.06]',
                ].join(' ')}
              >
                <span className="block text-[14px] font-semibold">
                  Cash on delivery
                </span>
                <span
                  className={[
                    'mt-1 block text-[12px] font-normal',
                    paymentMethod === 'cod' ? 'text-white/75' : 'text-mute',
                  ].join(' ')}
                >
                  Pay when your order arrives
                </span>
              </button>
              <button
                type="button"
                disabled={!bkashAvailable}
                onClick={() => setPaymentMethod('bkash')}
                aria-pressed={paymentMethod === 'bkash'}
                className={[
                  'rounded-xl border px-4 py-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-45',
                  paymentMethod === 'bkash'
                    ? 'border-navy bg-navy text-white'
                    : 'border-cloud bg-ink/[0.03] text-ink hover:bg-ink/[0.06]',
                ].join(' ')}
              >
                <span className="block text-[14px] font-semibold">bKash</span>
                <span
                  className={[
                    'mt-1 block text-[12px] font-normal',
                    paymentMethod === 'bkash' ? 'text-white/75' : 'text-mute',
                  ].join(' ')}
                >
                  {!bkashAvailable
                    ? 'Not configured yet'
                    : 'Pay now, then we ship'}
                </span>
              </button>
              <button
                type="button"
                disabled={!nagadAvailable}
                onClick={() => setPaymentMethod('nagad')}
                aria-pressed={paymentMethod === 'nagad'}
                className={[
                  'rounded-xl border px-4 py-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-45',
                  paymentMethod === 'nagad'
                    ? 'border-navy bg-navy text-white'
                    : 'border-cloud bg-ink/[0.03] text-ink hover:bg-ink/[0.06]',
                ].join(' ')}
              >
                <span className="block text-[14px] font-semibold">Nagad</span>
                <span
                  className={[
                    'mt-1 block text-[12px] font-normal',
                    paymentMethod === 'nagad' ? 'text-white/75' : 'text-mute',
                  ].join(' ')}
                >
                  {!nagadAvailable
                    ? 'Not configured yet'
                    : 'Pay now, then we ship'}
                </span>
              </button>
            </div>
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

        <aside className="h-fit rounded-2xl bg-mist/80 p-5 lg:sticky lg:top-28 lg:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold">Order summary</h2>
            <span className="text-[12px] font-medium text-mute">
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </span>
          </div>

          <ul className="mt-4 divide-y divide-cloud border-y border-cloud">
            {items.map((item, index) => (
              <motion.li
                key={`${item.product.id}-${item.size}-${item.variantId}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.04,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex items-center gap-3 py-3"
              >
                <Link
                  href={`/product/${item.product.slug}`}
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white"
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="h-full w-full object-contain"
                  />
                  {item.quantity > 1 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-navy px-1 text-[10px] font-bold text-white">
                      ×{item.quantity}
                    </span>
                  ) : null}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${item.product.slug}`}
                    className="truncate text-[13px] font-semibold text-ink hover:text-navy"
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-0.5 text-[12px] text-mute">
                    Size EU {item.size}
                    {item.quantity > 1
                      ? ` · ${item.quantity} × ${formatPrice(item.product.price)}`
                      : null}
                  </p>
                </div>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                  {formatPrice(item.product.price * item.quantity)}
                </span>
              </motion.li>
            ))}
          </ul>

          <div className="mt-4 space-y-2.5 text-[14px]">
            <div className="flex justify-between text-mute">
              <span>Subtotal</span>
              <span className="font-medium tabular-nums text-ink">
                {formatPrice(cartTotal)}
              </span>
            </div>

            <div className="rounded-xl border border-cloud bg-mist/40 p-3">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-mute">
                Promo code
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-lg border border-cloud bg-white px-3 py-2 text-[13px] uppercase tracking-wide text-ink outline-none focus:border-navy"
                  value={promoCodeInput}
                  onChange={(e) =>
                    setPromoCodeInput(e.target.value.toUpperCase())
                  }
                  placeholder="Enter code"
                  autoCapitalize="characters"
                  disabled={loading}
                />
                {appliedPromoCode ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-lg px-3 text-[13px] font-semibold text-navy hover:underline"
                    onClick={() => {
                      setPromoCodeInput('')
                      setAppliedPromoCode('')
                      setPromoLabel(null)
                      setPromoDiscount(null)
                      setPromoError(null)
                    }}
                    disabled={loading}
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    className="shrink-0 rounded-lg bg-navy px-3 py-2 text-[13px] font-semibold text-white hover:bg-navy-soft disabled:opacity-50"
                    onClick={async () => {
                      const next = promoCodeInput.trim().toUpperCase()
                      if (!next) {
                        setPromoError('Enter a promo code.')
                        return
                      }
                      setPromoError(null)
                      try {
                        const res = await fetch('/api/promotions/validate', {
                          method: 'POST',
                          cache: 'no-store',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            promo_code: next,
                            items: items.map((item) => ({
                              product_id: item.product.id,
                              quantity: item.quantity,
                            })),
                          }),
                        })
                        const j = (await res.json()) as {
                          success?: boolean
                          error?: string
                          promo?: {
                            title?: string
                            code?: string
                            discount?: number
                          }
                        }
                        if (!res.ok || !j.success || !j.promo) {
                          setAppliedPromoCode('')
                          setPromoLabel(null)
                          setPromoDiscount(null)
                          setPromoError(j.error || 'Invalid promo code.')
                          return
                        }
                        setAppliedPromoCode(String(j.promo.code || next))
                        setPromoLabel(
                          String(j.promo.title || j.promo.code || next),
                        )
                        setPromoDiscount(
                          typeof j.promo.discount === 'number'
                            ? j.promo.discount
                            : null,
                        )
                        setPromoError(null)
                      } catch {
                        setPromoError('Could not validate promo code.')
                      }
                    }}
                    disabled={loading || !promoCodeInput.trim()}
                  >
                    Apply
                  </button>
                )}
              </div>
              {promoError ? (
                <p className="mt-2 text-[12px] text-spark">{promoError}</p>
              ) : null}
            </div>

            {promoLabel && promoDiscount != null && promoDiscount > 0 ? (
              <div className="flex justify-between text-[13px] text-navy">
                <span>Promo ({appliedPromoCode})</span>
                <span className="tabular-nums">
                  −{formatPrice(promoDiscount)}
                </span>
              </div>
            ) : null}

            <div className="flex justify-between text-mute">
              <span>
                {paymentMethod === 'cod' ? 'Delivery charge' : 'Delivery'}
              </span>
              <span className="font-medium tabular-nums text-ink">
                {shippingPriceLoading
                  ? 'Calculating…'
                  : quoteShipping != null
                    ? formatPrice(quoteShipping)
                    : '—'}
              </span>
            </div>
            {campaignLabel ? (
              <div className="flex justify-between text-[13px] text-navy">
                <span>{campaignLabel}</span>
                <span className="tabular-nums">
                  {campaignDiscount != null && campaignDiscount > 0
                    ? `−${formatPrice(campaignDiscount)}`
                    : 'Applied'}
                </span>
              </div>
            ) : null}
            {shippingPriceError ? (
              <p className="text-[12px] text-spark">{shippingPriceError}</p>
            ) : null}
            <div className="flex items-end justify-between border-t border-cloud pt-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">
                  {paymentMethod === 'cod' ? 'Total (COD)' : 'Total'}
                </p>
                <p className="mt-0.5 text-[12px] text-mute">
                  {paymentMethod === 'bkash'
                    ? 'Paid via bKash'
                    : paymentMethod === 'nagad'
                      ? 'Paid via Nagad'
                      : 'Pay when you receive'}
                </p>
              </div>
              <span className="font-display text-[26px] tabular-nums tracking-tight text-navy-deep">
                {quoteTotal != null ? formatPrice(quoteTotal) : '—'}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-5 hidden w-full items-center justify-center gap-2 rounded-full bg-navy py-3.5 text-[14px] font-semibold text-white transition hover:bg-navy-soft disabled:opacity-50 lg:inline-flex"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitLabel}
          </button>
          <Link
            href="/cart"
            className="mt-3 hidden text-center text-[13px] font-medium text-navy underline-offset-4 hover:underline lg:block"
          >
            Back to bag
          </Link>
        </aside>
      </form>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cloud bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">
              {paymentMethod === 'cod' ? 'Total (COD)' : 'Total'}
            </p>
            <p className="truncate font-display text-[20px] tabular-nums tracking-tight text-navy-deep">
              {quoteTotal != null ? formatPrice(quoteTotal) : '—'}
            </p>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={!canSubmit}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-navy px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-navy-soft disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
