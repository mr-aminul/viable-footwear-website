import Link from 'next/link'
import type { ReactNode } from 'react'

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          {title}
        </h1>
        {description ? (
          <div className="mt-2 max-w-2xl text-[14px] text-mute">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

const buttonClass = (
  variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'primary',
) =>
  [
    'inline-flex items-center justify-center rounded-full px-4 py-2.5 text-[13px] font-semibold transition disabled:opacity-50',
    variant === 'primary' && 'bg-navy text-white hover:bg-navy-deep',
    variant === 'secondary' &&
      'border border-cloud bg-white text-ink hover:border-navy/30',
    variant === 'danger' && 'bg-spark text-white hover:bg-spark-soft',
    variant === 'ghost' && 'text-navy hover:underline',
  ]
    .filter(Boolean)
    .join(' ')

/** Server-safe link styled as an admin button. */
export function AdminButton({
  href,
  children,
  variant = 'primary',
  prefetch = true,
}: {
  href: string
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  prefetch?: boolean
}) {
  return (
    <Link href={href} prefetch={prefetch} className={buttonClass(variant)}>
      {children}
    </Link>
  )
}

export { buttonClass as adminButtonClassName }

export function Field({
  label,
  name,
  children,
  hint,
}: {
  label: string
  name?: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold uppercase tracking-wider text-mute">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1 text-[12px] text-mute">{hint}</p> : null}
      {name ? <span className="sr-only">{name}</span> : null}
    </label>
  )
}

export const inputClassName =
  'w-full rounded-xl border border-cloud bg-white px-3 py-2.5 text-[14px] text-ink outline-none transition focus:border-navy'

/** Soft fill fields (no hard border) — used in the visual product editor. */
export const softFieldClassName =
  'w-full rounded-2xl border-0 bg-ink/[0.045] px-3.5 py-3 text-[14px] text-ink outline-none transition placeholder:text-mute focus:bg-ink/[0.07]'

export function StatusPill({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex rounded-full bg-navy/10 px-2.5 py-1 text-[11px] font-semibold text-navy">
      Active
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-mist px-2.5 py-1 text-[11px] font-semibold text-mute">
      Inactive
    </span>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div className="rounded-xl border border-spark/30 bg-spark/10 px-4 py-3 text-[13px] text-spark">
      {message}
    </div>
  )
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div className="rounded-xl border border-navy/20 bg-navy/5 px-4 py-3 text-[13px] text-navy">
      {message}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-cloud bg-white px-6 py-16 text-center">
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[14px] text-mute">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}
