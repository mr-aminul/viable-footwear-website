'use client'

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import { DEFAULT_SITE_CONTENT } from '@/lib/website/defaults'
import type { SiteContent } from '@/lib/website/types'

const SiteSettingsContext = createContext<SiteContent>(DEFAULT_SITE_CONTENT)

export function SiteSettingsProvider({
  value,
  children,
}: {
  value: SiteContent
  children: ReactNode
}) {
  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings(): SiteContent {
  return useContext(SiteSettingsContext)
}
