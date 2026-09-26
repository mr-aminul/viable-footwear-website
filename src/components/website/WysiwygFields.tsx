'use client'

import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

const base =
  'w-full border-0 bg-transparent p-0 text-inherit outline-none transition placeholder:opacity-50'

const lightChrome =
  'underline-offset-[3px] hover:opacity-90 hover:underline hover:decoration-dashed hover:decoration-ink/25 focus:opacity-100 focus:underline focus:decoration-solid focus:decoration-spark'

const darkChrome =
  'underline-offset-[3px] hover:opacity-90 hover:underline hover:decoration-dashed hover:decoration-white/35 focus:opacity-100 focus:underline focus:decoration-solid focus:decoration-white'

/** Invisible inline text input that inherits surrounding typography. */
export function WysiwygInput({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[base, lightChrome, className].filter(Boolean).join(' ')}
    />
  )
}

/** Invisible textarea that inherits surrounding typography. */
export function WysiwygTextarea({
  className = '',
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={rows}
      className={[base, 'resize-y', lightChrome, className]
        .filter(Boolean)
        .join(' ')}
    />
  )
}

/** Invisible field for dark hero overlays — white underline on focus. */
export function WysiwygInputOnDark({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[base, darkChrome, className].filter(Boolean).join(' ')}
    />
  )
}

export function WysiwygTextareaOnDark({
  className = '',
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={rows}
      className={[base, 'resize-y', darkChrome, className]
        .filter(Boolean)
        .join(' ')}
    />
  )
}
