'use client'

import type { ReactNode } from 'react'
import { adminButtonClassName } from '@/components/admin/ui'

/**
 * Interactive admin button (submit / onClick). Prefer AdminButton link from ui on server pages.
 */
export function AdminActionButton({
  children,
  variant = 'primary',
  type = 'button',
  disabled,
  onClick,
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type={type}
      className={adminButtonClassName(variant)}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
