import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

type Phase = 'idle' | 'customer' | 'typing' | 'reply' | 'hold'

function ViableAvatar() {
  return (
    <img
      src="/favicon.png"
      alt=""
      className="mt-auto h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-black/10"
    />
  )
}

/**
 * Animated WhatsApp chat preview for the home order CTA.
 * Explains the order flow; loops while in view.
 */
export function WhatsAppOrderVisual() {
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<Phase>(reduce ? 'hold' : 'idle')

  useEffect(() => {
    if (reduce) {
      setPhase('hold')
      return
    }

    let cancelled = false
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms)
      })

    const run = async () => {
      while (!cancelled) {
        setPhase('idle')
        await wait(200)
        if (cancelled) break
        setPhase('customer')
        await wait(750)
        if (cancelled) break
        setPhase('typing')
        await wait(550)
        if (cancelled) break
        setPhase('reply')
        await wait(900)
        if (cancelled) break
        setPhase('hold')
        await wait(200)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [reduce])

  const showCustomer = phase !== 'idle'
  const showTyping = phase === 'typing'
  const showReply = phase === 'reply' || phase === 'hold' || reduce

  return (
    <div
      className="relative flex h-full min-h-[220px] w-full flex-col overflow-hidden bg-mist"
      aria-hidden
    >
      {/* Soft depth + grain */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(26,54,104,0.04),transparent_50%),radial-gradient(ellipse_at_85%_90%,rgba(0,0,0,0.03),transparent_55%)]" />
      <div className="grain pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-multiply" />

      {/* Chat wallpaper dots */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(18,20,26,0.18) 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }}
      />

      {/* Messages */}
      <div className="relative z-10 flex flex-1 flex-col justify-center gap-2.5 px-4 py-5">
        <AnimatePresence mode="popLayout">
          {showCustomer && (
            <motion.div
              key="customer"
              initial={reduce ? false : { opacity: 0, transform: 'translateY(10px) scale(0.96)' }}
              animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
              exit={{ opacity: 0, transform: 'translateY(-6px) scale(0.98)' }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              className="ml-auto max-w-[85%]"
            >
              <div className="rounded-2xl rounded-br-md bg-[#22d664] px-3.5 py-2.5 text-[13px] font-semibold leading-snug text-[#0b3d1c] shadow-[0_6px_16px_rgba(0,0,0,0.08)]">
                Size 42 · foam clog — available?
                <span className="mt-1 flex items-center justify-end gap-1 text-[10px] font-medium text-[#0b3d1c]/65">
                  10:24
                </span>
              </div>
            </motion.div>
          )}

          {showTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, transform: 'translateY(8px) scale(0.96)' }}
              animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
              exit={{ opacity: 0, transform: 'translateY(-4px) scale(0.98)' }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="mr-auto flex max-w-[88%] items-end gap-2"
            >
              <ViableAvatar />
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white/90 px-3.5 py-3 shadow-[0_6px_16px_rgba(0,0,0,0.06)]">
                <span className="wa-dot h-1.5 w-1.5 rounded-full bg-[#5c6370]" />
                <span className="wa-dot wa-dot-2 h-1.5 w-1.5 rounded-full bg-[#5c6370]" />
                <span className="wa-dot wa-dot-3 h-1.5 w-1.5 rounded-full bg-[#5c6370]" />
              </div>
            </motion.div>
          )}

          {showReply && (
            <motion.div
              key="reply"
              initial={reduce ? false : { opacity: 0, transform: 'translateY(10px) scale(0.96)' }}
              animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
              exit={{ opacity: 0, transform: 'translateY(-6px) scale(0.98)' }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              className="mr-auto flex max-w-[88%] items-end gap-2"
            >
              <ViableAvatar />
              <div className="rounded-2xl rounded-bl-md bg-white/90 px-3.5 py-2.5 text-[13px] font-semibold leading-snug text-[#12141a] shadow-[0_6px_16px_rgba(0,0,0,0.06)]">
                Yes — in stock. COD across Dhaka, confirmed in minutes.
                <span className="mt-1 flex items-center justify-end gap-1 text-[10px] font-medium text-[#5c6370]">
                  10:24
                  <svg viewBox="0 0 16 10" className="h-2.5 w-4 text-[#53bdeb]" aria-hidden>
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M1 5.2 3.4 7.6 8.2 1.8"
                    />
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5.2 5.2 7.6 7.6 14.2 1.4"
                    />
                  </svg>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes wa-dot-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
          30% { transform: translateY(-3px); opacity: 1; }
        }
        .wa-dot {
          animation: wa-dot-bounce 1s ease-in-out infinite;
        }
        .wa-dot-2 { animation-delay: 0.15s; }
        .wa-dot-3 { animation-delay: 0.3s; }
        @media (prefers-reduced-motion: reduce) {
          .wa-dot { animation: none; opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
