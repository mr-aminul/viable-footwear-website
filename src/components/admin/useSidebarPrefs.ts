'use client'

import { useEffect, useState } from 'react'
import {
  DEFAULT_SIDEBAR_EXPANDED,
  DEFAULT_SIDEBAR_MODE,
  SIDEBAR_EXPANDED_KEY,
  SIDEBAR_MODE_KEY,
  SIDEBAR_PREFS_EVENT,
  readSidebarPrefs,
  type SidebarPrefs,
} from '@/lib/admin/sidebarPrefs'

const SSR_DEFAULTS: SidebarPrefs = {
  mode: DEFAULT_SIDEBAR_MODE,
  expanded: DEFAULT_SIDEBAR_EXPANDED,
}

/**
 * Desktop sidebar expand prefs (localStorage). Defaults until mounted to avoid
 * hydration mismatch; then syncs across tabs via storage + custom events.
 */
export function useSidebarPrefs(): SidebarPrefs {
  const [prefs, setPrefs] = useState<SidebarPrefs>(SSR_DEFAULTS)

  useEffect(() => {
    setPrefs(readSidebarPrefs())

    const onPrefsChange = (event: Event) => {
      const custom = event as CustomEvent<SidebarPrefs>
      if (custom.detail) {
        setPrefs(custom.detail)
        return
      }
      setPrefs(readSidebarPrefs())
    }

    const onStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === SIDEBAR_MODE_KEY ||
        event.key === SIDEBAR_EXPANDED_KEY
      ) {
        setPrefs(readSidebarPrefs())
      }
    }

    window.addEventListener(SIDEBAR_PREFS_EVENT, onPrefsChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(SIDEBAR_PREFS_EVENT, onPrefsChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return prefs
}
