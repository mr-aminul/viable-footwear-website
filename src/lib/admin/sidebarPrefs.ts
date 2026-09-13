export type SidebarExpandMode = 'auto' | 'manual'

export const SIDEBAR_MODE_KEY = 'admin-sidebar-mode'
export const SIDEBAR_EXPANDED_KEY = 'admin-sidebar-expanded'
export const SIDEBAR_PREFS_EVENT = 'admin-sidebar-prefs-change'

export const DEFAULT_SIDEBAR_MODE: SidebarExpandMode = 'auto'
export const DEFAULT_SIDEBAR_EXPANDED = false

export type SidebarPrefs = {
  mode: SidebarExpandMode
  expanded: boolean
}

function isSidebarMode(value: string | null): value is SidebarExpandMode {
  return value === 'auto' || value === 'manual'
}

export function readSidebarMode(): SidebarExpandMode {
  try {
    const stored = localStorage.getItem(SIDEBAR_MODE_KEY)
    return isSidebarMode(stored) ? stored : DEFAULT_SIDEBAR_MODE
  } catch {
    return DEFAULT_SIDEBAR_MODE
  }
}

export function readSidebarExpanded(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_EXPANDED_KEY)
    if (stored === '1') return true
    if (stored === '0') return false
    return DEFAULT_SIDEBAR_EXPANDED
  } catch {
    return DEFAULT_SIDEBAR_EXPANDED
  }
}

export function readSidebarPrefs(): SidebarPrefs {
  return {
    mode: readSidebarMode(),
    expanded: readSidebarExpanded(),
  }
}

function emitSidebarPrefsChange(prefs: SidebarPrefs) {
  window.dispatchEvent(
    new CustomEvent<SidebarPrefs>(SIDEBAR_PREFS_EVENT, { detail: prefs }),
  )
}

export function applySidebarMode(mode: SidebarExpandMode): SidebarPrefs {
  const next: SidebarPrefs = {
    mode,
    expanded: mode === 'manual' ? readSidebarExpanded() : DEFAULT_SIDEBAR_EXPANDED,
  }
  try {
    localStorage.setItem(SIDEBAR_MODE_KEY, mode)
    if (mode === 'auto') {
      localStorage.setItem(SIDEBAR_EXPANDED_KEY, '0')
    }
  } catch {
    /* ignore quota / private mode */
  }
  emitSidebarPrefsChange(next)
  return next
}

export function applySidebarExpanded(expanded: boolean): SidebarPrefs {
  const next: SidebarPrefs = {
    mode: 'manual',
    expanded,
  }
  try {
    localStorage.setItem(SIDEBAR_MODE_KEY, 'manual')
    localStorage.setItem(SIDEBAR_EXPANDED_KEY, expanded ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
  emitSidebarPrefsChange(next)
  return next
}

/**
 * Pin open, or unpin back to auto (hover) collapse.
 * - Collapsed → pin expanded (manual)
 * - Auto + temporarily expanded (hover) → pin expanded
 * - Manual + expanded → return to auto
 */
export function toggleSidebarPinned(
  currentlyCollapsed: boolean,
  isManual: boolean,
): SidebarPrefs {
  if (currentlyCollapsed) {
    return applySidebarExpanded(true)
  }
  if (isManual) {
    return applySidebarMode('auto')
  }
  return applySidebarExpanded(true)
}
