import type { Transition, Variants } from 'framer-motion'

/** Shared easing — soft decelerate used across the storefront. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const

export const pageTransition: Transition = {
  duration: 0.28,
  ease: EASE_OUT,
}

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
}

export const fadeUpVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.04 },
  },
}

export function enterTransition(
  reduceMotion: boolean | null,
  delay = 0,
): Transition {
  if (reduceMotion) return { duration: 0 }
  return {
    duration: 0.4,
    delay,
    ease: EASE_OUT,
  }
}

export function springHover(reduceMotion: boolean | null) {
  if (reduceMotion) return undefined
  return {
    y: -8,
    transition: { type: 'spring' as const, stiffness: 280, damping: 26, mass: 0.65 },
  }
}

export const drawerTransition: Transition = {
  type: 'spring',
  damping: 28,
  stiffness: 280,
}
