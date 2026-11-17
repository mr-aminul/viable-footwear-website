'use client'

import { useCallback, useEffect, useState } from 'react'

export type PathaoCityOption = { city_id: number; city_name: string }
export type PathaoZoneOption = { zone_id: number; zone_name: string }
export type PathaoAreaOption = { area_id: number; area_name: string }

/**
 * Shared Pathao city list + cached zone/area fetches for admin order forms.
 */
export function usePathaoLocations() {
  const [cities, setCities] = useState<PathaoCityOption[]>([])
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [zonesByCity, setZonesByCity] = useState<
    Record<string, PathaoZoneOption[]>
  >({})
  const [areasByZone, setAreasByZone] = useState<
    Record<string, PathaoAreaOption[]>
  >({})
  const [loadingZones, setLoadingZones] = useState<Record<string, boolean>>(
    {},
  )
  const [loadingAreas, setLoadingAreas] = useState<Record<string, boolean>>(
    {},
  )

  useEffect(() => {
    let cancelled = false
    setCitiesLoading(true)
    fetch('/api/pathao/cities', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        if (j.success && Array.isArray(j.data)) {
          setCities(j.data as PathaoCityOption[])
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCitiesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const ensureZones = useCallback(async (cityId: string) => {
    if (!cityId) return []
    let cached: PathaoZoneOption[] | undefined
    setZonesByCity((current) => {
      cached = current[cityId]
      return current
    })
    if (cached) return cached

    setLoadingZones((current) => ({ ...current, [cityId]: true }))
    try {
      const response = await fetch(
        `/api/pathao/zones?city_id=${encodeURIComponent(cityId)}`,
        { cache: 'no-store' },
      )
      const json = await response.json()
      const zones =
        json.success && Array.isArray(json.data)
          ? (json.data as PathaoZoneOption[])
          : []
      setZonesByCity((current) => ({ ...current, [cityId]: zones }))
      return zones
    } catch {
      setZonesByCity((current) => ({ ...current, [cityId]: [] }))
      return []
    } finally {
      setLoadingZones((current) => ({ ...current, [cityId]: false }))
    }
  }, [])

  const ensureAreas = useCallback(async (zoneId: string) => {
    if (!zoneId) return []
    let cached: PathaoAreaOption[] | undefined
    setAreasByZone((current) => {
      cached = current[zoneId]
      return current
    })
    if (cached) return cached

    setLoadingAreas((current) => ({ ...current, [zoneId]: true }))
    try {
      const response = await fetch(
        `/api/pathao/areas?zone_id=${encodeURIComponent(zoneId)}`,
        { cache: 'no-store' },
      )
      const json = await response.json()
      const areas =
        json.success && Array.isArray(json.data)
          ? (json.data as PathaoAreaOption[])
          : []
      setAreasByZone((current) => ({ ...current, [zoneId]: areas }))
      return areas
    } catch {
      setAreasByZone((current) => ({ ...current, [zoneId]: [] }))
      return []
    } finally {
      setLoadingAreas((current) => ({ ...current, [zoneId]: false }))
    }
  }, [])

  const findCityByName = useCallback(
    (name: string) => {
      const trimmed = name.trim().toLowerCase()
      if (!trimmed) return null
      return (
        cities.find((city) => city.city_name.toLowerCase() === trimmed) ?? null
      )
    },
    [cities],
  )

  return {
    cities,
    citiesLoading,
    zonesByCity,
    areasByZone,
    loadingZones,
    loadingAreas,
    ensureZones,
    ensureAreas,
    findCityByName,
  }
}
