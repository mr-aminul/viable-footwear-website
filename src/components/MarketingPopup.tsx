'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { useSiteSettings } from '@/context/SiteSettingsContext'
import { EASE_OUT } from '@/lib/motion'
import { resolveSiteMediaUrl } from '@/lib/website/media-url'
import {
  isMarketingPopupLive,
  markMarketingPopupDismissed,
  normalizeSiteHref,
  shouldSkipMarketingPopup,
  wasMarketingPopupDismissed,
} from '@/lib/website/marketing-popup'

/**
 * Full-viewport marketing interstitial. Shows after a configurable delay on
 * any storefront page (except checkout / order tracking) when enabled in admin.
 */
export function MarketingPopup() {
  const { marketingPopup: popup } = useSiteSettings()
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()
  const titleId = useId()
  const [open, setOpen] = useState(false)

  const dismiss = useCallback(() => {
    markMarketingPopupDismissed(popup.campaignKey, popup.frequency)
    setOpen(false)
  }, [popup.campaignKey, popup.frequency])

  useEffect(() => {
    if (shouldSkipMarketingPopup(pathname)) {
      setOpen(false)
      return
    }
    if (!isMarketingPopupLive(popup)) {
      setOpen(false)
      return
    }
    if (wasMarketingPopupDismissed(popup.campaignKey, popup.frequency)) {
      setOpen(false)
      return
    }

    const delayMs = Math.max(0, popup.delaySeconds) * 1000
    const timer = window.setTimeout(() => setOpen(true), delayMs)
    return () => window.clearTimeout(timer)
  }, [pathname, popup])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, dismiss])

  const imageUrl = resolveSiteMediaUrl(popup.image, '')
  if (!imageUrl) return null

  const href = normalizeSiteHref(popup.href)
  const isExternal =
    href.startsWith('http://') || href.startsWith('https://')

  const creative = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={popup.alt || 'Special offer'}
      className="max-h-[min(78vh,720px)] w-full object-contain"
      draggable={false}
    />
  )

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="marketing-popup"
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/70"
            aria-label="Dismiss offer"
            onClick={dismiss}
          />

          <motion.div
            className="relative z-10 w-full max-w-[min(92vw,420px)]"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
          >
            <h2 id={titleId} className="sr-only">
              {popup.alt || 'Special offer'}
            </h2>

            <button
              type="button"
              onClick={dismiss}
              className="absolute -right-2 -top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow-lift transition hover:bg-cloud focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:-right-3 sm:-top-3"
              aria-label="Close"
            >
              <X size={18} strokeWidth={2.25} aria-hidden />
            </button>

            <div className="overflow-hidden rounded-2xl bg-transparent shadow-lift">
              {href ? (
                isExternal ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={dismiss}
                    className="block"
                  >
                    {creative}
                  </a>
                ) : (
                  <Link href={href} onClick={dismiss} className="block">
                    {creative}
                  </Link>
                )
              ) : (
                creative
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
