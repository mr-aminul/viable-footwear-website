'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SearchableSelect } from '@/components/SearchableSelect'
import { OrderItemPicker } from '@/components/admin/OrderItemPicker'
import { createManualOrder } from '@/lib/orders/actions'
import type { OrderImportPickerProduct } from '@/lib/catalog/queries'
import {
  IMPORTABLE_ORDER_CHANNELS,
  isShopChannel,
  orderChannelLabel,
} from '@/lib/orders/channels'
import {
  orderPickerLinesToItemsText,
  type OrderPickerSelectedLine,
} from '@/lib/orders/picker-lines'
import {
  FormError,
  FormSuccess,
} from '@/components/admin/ui'
import { usePathaoLocations } from '@/hooks/usePathaoLocations'

const fieldClassName =
  'h-8 w-full rounded-lg border border-cloud bg-white px-2.5 text-[12px] text-ink outline-none transition placeholder:text-mute focus:border-navy'
const labelClassName =
  'text-[11px] font-semibold uppercase tracking-wider text-mute'

export function ManualOrderForm({
  catalog,
}: {
  catalog: OrderImportPickerProduct[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [channel, setChannel] = useState('whatsapp')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [secondaryPhone, setSecondaryPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [cityId, setCityId] = useState('')
  const [cityName, setCityName] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [zoneName, setZoneName] = useState('')
  const [areaId, setAreaId] = useState('')
  const [areaName, setAreaName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [shipping, setShipping] = useState('')
  const [alreadyPaid, setAlreadyPaid] = useState(false)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<OrderPickerSelectedLine[]>([])

  const shopSale = isShopChannel(channel)

  const {
    cities,
    citiesLoading,
    zonesByCity,
    areasByZone,
    loadingZones,
    loadingAreas,
    ensureZones,
    ensureAreas,
  } = usePathaoLocations()

  const cityOptions = useMemo(
    () =>
      cities.map((city) => ({
        value: String(city.city_id),
        label: city.city_name,
      })),
    [cities],
  )
  const zones = zonesByCity[cityId] ?? []
  const areas = areasByZone[zoneId] ?? []
  const zoneLoading = Boolean(loadingZones[cityId])
  const areaLoading = Boolean(loadingAreas[zoneId])

  const submit = () => {
    setError(null)
    setSuccess(null)

    const items = orderPickerLinesToItemsText(lines)
    const variantLines = lines
      .filter((line) => line.quantity > 0 && line.variantId)
      .map((line) => ({
        variantId: line.variantId,
        quantity: line.quantity,
      }))
    if (variantLines.length === 0) {
      setError('Pick at least one product variant.')
      return
    }

    startTransition(async () => {
      const result = await createManualOrder({
        key: crypto.randomUUID(),
        channel,
        fullName: shopSale ? '' : fullName,
        phone,
        secondaryPhone: shopSale ? '' : secondaryPhone,
        email: shopSale ? '' : email,
        address: shopSale ? '' : address,
        cityName: shopSale ? '' : cityName,
        zoneName: shopSale ? '' : zoneName,
        areaName: shopSale ? '' : areaName,
        cityId: shopSale || !cityId ? null : Number(cityId),
        zoneId: shopSale || !zoneId ? null : Number(zoneId),
        areaId: shopSale || !areaId ? null : Number(areaId),
        paymentMethod,
        shipping: shipping.trim() ? Number(shipping) : null,
        alreadyPaid,
        notes,
        items,
        variantLines,
      })

      if (!result.ok || !result.data) {
        setError(result.ok ? 'Failed to create order.' : result.error)
        return
      }

      setSuccess(`Created ${result.data.orderNumber}. Opening order…`)
      router.push(`/admin/orders/${result.data.id}`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <FormError message={error} />
      <FormSuccess message={success} />

      <div className="rounded-2xl border border-cloud bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <span className={labelClassName}>Channel</span>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className={`${fieldClassName} mt-1`}
            >
              {IMPORTABLE_ORDER_CHANNELS.map((value) => (
                <option key={value} value={value}>
                  {orderChannelLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClassName}>Payment</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={`${fieldClassName} mt-1`}
            >
              <option value="cod">COD</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
            </select>
          </label>
          <label>
            <span className={labelClassName}>Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`${fieldClassName} mt-1`}
              placeholder="01712345678"
            />
          </label>
          {shopSale ? (
            <p className="flex items-end pb-1 text-[12px] text-mute sm:col-span-2 lg:col-span-1">
              Shop sales only need the customer mobile number.
            </p>
          ) : (
            <>
              <label className="sm:col-span-2">
                <span className={labelClassName}>Full name</span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`${fieldClassName} mt-1`}
                  placeholder="Customer full name"
                />
              </label>
              <label>
                <span className={labelClassName}>Alt phone</span>
                <input
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  className={`${fieldClassName} mt-1`}
                />
              </label>
              <label className="sm:col-span-2">
                <span className={labelClassName}>Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${fieldClassName} mt-1`}
                  type="email"
                />
              </label>
              <label className="sm:col-span-2 lg:col-span-4">
                <span className={labelClassName}>Address</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={`${fieldClassName} mt-1`}
                  placeholder="House, road, landmark"
                />
              </label>
              <label>
                <span className={labelClassName}>City</span>
                <SearchableSelect
                  value={cityId}
                  disabled={citiesLoading}
                  placeholder={citiesLoading ? 'Loading…' : 'Select city'}
                  searchPlaceholder="Search city…"
                  options={cityOptions}
                  onChange={(next) => {
                    const city = cities.find(
                      (item) => String(item.city_id) === next,
                    )
                    setCityId(next)
                    setCityName(city?.city_name ?? '')
                    setZoneId('')
                    setZoneName('')
                    setAreaId('')
                    setAreaName('')
                    if (next) void ensureZones(next)
                  }}
                />
              </label>
              <label>
                <span className={labelClassName}>Zone</span>
                <SearchableSelect
                  value={zoneId}
                  disabled={!cityId || zoneLoading}
                  placeholder={
                    !cityId
                      ? 'Select city first'
                      : zoneLoading
                        ? 'Loading…'
                        : 'Select zone'
                  }
                  searchPlaceholder="Search zone…"
                  options={zones.map((zone) => ({
                    value: String(zone.zone_id),
                    label: zone.zone_name,
                  }))}
                  onChange={(next) => {
                    const zone = zones.find(
                      (item) => String(item.zone_id) === next,
                    )
                    setZoneId(next)
                    setZoneName(zone?.zone_name ?? '')
                    setAreaId('')
                    setAreaName('')
                    if (next) void ensureAreas(next)
                  }}
                />
              </label>
              <label>
                <span className={labelClassName}>Area</span>
                <SearchableSelect
                  value={areaId}
                  disabled={!zoneId || areaLoading}
                  placeholder={
                    !zoneId
                      ? 'Select zone first'
                      : areaLoading
                        ? 'Loading…'
                        : 'Area (optional)'
                  }
                  searchPlaceholder="Search area…"
                  options={areas.map((area) => ({
                    value: String(area.area_id),
                    label: area.area_name,
                  }))}
                  onChange={(next) => {
                    const area = areas.find(
                      (item) => String(item.area_id) === next,
                    )
                    setAreaId(next)
                    setAreaName(area?.area_name ?? '')
                  }}
                />
              </label>
              <label>
                <span className={labelClassName}>Shipping ৳</span>
                <input
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value)}
                  className={`${fieldClassName} mt-1`}
                  inputMode="decimal"
                  placeholder="auto"
                />
              </label>
            </>
          )}
          <label className="flex items-end gap-2 pb-1 sm:col-span-2">
            <input
              type="checkbox"
              checked={alreadyPaid}
              onChange={(e) => setAlreadyPaid(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-[12px] text-ink">Already paid</span>
          </label>
          <label className="sm:col-span-2 lg:col-span-4">
            <span className={labelClassName}>Notes</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${fieldClassName} mt-1`}
              placeholder="Chat link, special request…"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-cloud bg-white p-4">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-mute">
          Items
        </h2>
        <OrderItemPicker catalog={catalog} value={lines} onChange={setLines} />
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="inline-flex h-8 items-center justify-center rounded-lg bg-navy px-3 text-[12px] font-semibold text-white transition hover:bg-navy-deep disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Create order'}
      </button>
    </div>
  )
}
