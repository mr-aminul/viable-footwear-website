'use client'

import { usePathname } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { pageTransition } from '@/lib/motion'

/**
 * Soft fade on storefront route changes.
 * Avoid AnimatePresence mode="wait" — it can desync App Router children
 * from the URL when soft navigations are slow or fail (URL updates, old page stays).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <>{children}</>
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  )
}
