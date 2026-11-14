'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  Clock,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import type { VpsStatusReport } from '@/lib/status/types'
import {
  busyLabel,
  formatBytes,
  formatRelativeTime,
  formatUptime,
  friendlyName,
  friendlyStatus,
  overallBlurb,
  overallLabel,
  statusTone,
  usageComfort,
} from '@/lib/status/format'

const REFRESH_MS = 30_000

function Meter({
  label,
  percent,
  detail,
}: {
  label: string
  percent: number
  detail: string
}) {
  const capped = Math.max(0, Math.min(100, percent))
  const hot = capped >= 90
  const warm = capped >= 75
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span className="text-[12px] text-mute">{detail}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-cloud/80">
        <div
          className={[
            'h-full rounded-full transition-[width] duration-700',
            hot ? 'bg-spark' : warm ? 'bg-amber-500' : 'bg-navy',
          ].join(' ')}
          style={{ width: `${capped}%` }}
        />
      </div>
    </div>
  )
}

type ChecklistItem = {
  key: string
  title: string
  status: 'up' | 'down' | 'degraded' | 'unknown'
  note: string
}

export function StatusPage({ initial }: { initial: VpsStatusReport }) {
  const [report, setReport] = useState(initial)
  const [loading, setLoading] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch('/api/status', { cache: 'no-store' })
      if (!res.ok) return
      const json = (await res.json()) as VpsStatusReport
      setReport(json)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh()
    }, REFRESH_MS)
    return () => window.clearInterval(id)
  }, [])

  const tone = statusTone(report.overall)
  const rootDisk = report.disks[0]
  const cpuBusy = Math.min(
    100,
    (report.load['1'] / Math.max(1, report.platform.cpus)) * 100,
  )

  const chartData = report.history.map((p) => ({
    ...p,
    label: new Date(p.t * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }))

  const checklist = useMemo(() => {
    const items: ChecklistItem[] = []
    const seen = new Set<string>()

    for (const svc of report.services) {
      const title = friendlyName(svc.id) || svc.label
      seen.add(title.toLowerCase())
      items.push({
        key: `svc-${svc.id}`,
        title,
        status: svc.status,
        note:
          svc.status === 'up'
            ? 'Running smoothly'
            : svc.status === 'degraded'
              ? 'Starting or recovering'
              : 'Not responding',
      })
    }

    for (const c of report.containers) {
      const title = friendlyName(c.name)
      if (seen.has(title.toLowerCase())) continue
      seen.add(title.toLowerCase())
      items.push({
        key: `ctr-${c.name}`,
        title,
        status: c.status,
        note: c.status === 'up' ? 'Running smoothly' : 'Not responding',
      })
    }

    // Public website checks only (skip duplicate local probes)
    for (const p of report.probes) {
      if (!p.id.includes('public') && p.id !== 'minio-live') continue
      const title = friendlyName(p.id) || p.label
      if (seen.has(title.toLowerCase())) continue
      seen.add(title.toLowerCase())
      items.push({
        key: `probe-${p.id}`,
        title,
        status: p.ok ? 'up' : 'down',
        note: p.ok
          ? `Replies in ${Math.max(1, Math.round(p.latencyMs))} ms`
          : 'Could not reach it',
      })
    }

    return items
  }, [report])

  const workingCount = checklist.filter((i) => i.status === 'up').length

  return (
    <div className="min-h-svh bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(26,54,104,0.14),transparent),radial-gradient(900px_500px_at_90%_0%,rgba(227,28,35,0.08),transparent),linear-gradient(180deg,#faf7f2_0%,#f0ebe4_100%)]">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-logo text-[13px] font-semibold tracking-[0.18em] text-navy uppercase">
              Viable
            </p>
            <h1 className="font-display mt-2 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              Is everything okay?
            </h1>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-mute">
              A simple live check of our websites and the server behind them.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-paper/80 px-4 py-2 text-[13px] font-medium text-navy shadow-soft backdrop-blur transition hover:border-navy/30"
          >
            <RefreshCw
              className={['h-3.5 w-3.5', loading ? 'animate-spin' : ''].join(' ')}
            />
            Check again
          </button>
        </header>

        <section
          className={[
            'mt-10 rounded-[1.75rem] p-6 ring-1 sm:p-8',
            tone.bg,
            tone.ring,
          ].join(' ')}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className={['h-3 w-3 rounded-full', tone.dot].join(' ')} />
            <h2 className={['font-display text-2xl font-bold', tone.text].join(' ')}>
              {overallLabel(report.overall)}
            </h2>
          </div>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-mute">
            {report.message && report.source === 'demo'
              ? 'This is a preview on your computer. On the live server you’ll see real results.'
              : report.stale
                ? 'This update is a little old — we’re waiting on a fresh check.'
                : overallBlurb(report.overall)}
          </p>
          <p className="mt-4 text-[13px] text-mute">
            Last checked {formatRelativeTime(report.generatedAt)}
            {checklist.length > 0
              ? ` · ${workingCount} of ${checklist.length} parts working`
              : null}
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={Sparkles}
            label="How busy"
            value={busyLabel(report.load['1'], report.platform.cpus)}
            hint={`${Math.round(cpuBusy)}% of capacity`}
          />
          <StatCard
            icon={MemoryStick}
            label="Memory"
            value={`${report.memory.usedPercent}% used`}
            hint={usageComfort(report.memory.usedPercent)}
          />
          <StatCard
            icon={HardDrive}
            label="Storage"
            value={`${rootDisk?.usedPercent ?? 0}% used`}
            hint={usageComfort(rootDisk?.usedPercent ?? 0)}
          />
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-navy/8 bg-paper/70 p-5 shadow-soft backdrop-blur sm:p-6">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-navy" />
            <h3 className="font-display text-lg font-bold text-ink">
              How it’s been feeling
            </h3>
          </div>
          <p className="mt-1 text-[13px] text-mute">
            Busyness and memory use over the last hour or so.
          </p>
          <div className="mt-5 h-52 w-full">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="memFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1a3668" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#1a3668" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(26,54,104,0.08)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#5c6370' }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#5c6370' }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid rgba(26,54,104,0.12)',
                      fontSize: 12,
                    }}
                    formatter={(value, name) => {
                      const n = typeof value === 'number' ? value : Number(value)
                      const label =
                        name === 'memPercent' ? 'Memory' : 'Storage'
                      return [`${Math.round(n)}%`, label]
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="memPercent"
                    name="memPercent"
                    stroke="#1a3668"
                    fill="url(#memFill)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="diskPercent"
                    name="diskPercent"
                    stroke="#2a4a7a"
                    fill="transparent"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] text-mute">
                Gathering a little history…
              </div>
            )}
          </div>

          <div className="mt-6 space-y-5">
            <Meter
              label="Server busyness"
              percent={cpuBusy}
              detail={busyLabel(report.load['1'], report.platform.cpus)}
            />
            <Meter
              label="Memory"
              percent={report.memory.usedPercent}
              detail={`${formatBytes(report.memory.available)} free`}
            />
            <Meter
              label="Storage"
              percent={rootDisk?.usedPercent ?? 0}
              detail={`${formatBytes(rootDisk?.available ?? 0)} free`}
            />
          </div>

          <p className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-mute">
            <Clock className="h-3.5 w-3.5" />
            Server has been up for {formatUptime(report.uptimeSec)}
          </p>
        </section>

        <section className="mt-8">
          <h3 className="font-display text-lg font-bold text-ink">
            What’s running
          </h3>
          <p className="mt-1 text-[13px] text-mute">
            Each piece of the setup, in plain words.
          </p>
          <div className="mt-4 space-y-3">
            {checklist.map((item) => {
              const s = statusTone(item.status)
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-navy/8 bg-paper/70 px-4 py-4 shadow-soft"
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-ink">{item.title}</p>
                    <p className="mt-0.5 text-[13px] text-mute">{item.note}</p>
                  </div>
                  <span
                    className={[
                      'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold',
                      s.bg,
                      s.text,
                    ].join(' ')}
                  >
                    <span className={['h-1.5 w-1.5 rounded-full', s.dot].join(' ')} />
                    {friendlyStatus(item.status)}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        <footer className="mt-12 border-t border-navy/10 pt-6 text-[13px] text-mute">
          <p>
            This page updates by itself about every half minute. If something
            looks off, try again in a minute.
          </p>
          <p className="mt-2">
            <a
              href="https://viable.fashion"
              className="font-medium text-navy underline-offset-2 hover:underline"
            >
              Back to Viable
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Sparkles
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-[1.35rem] border border-navy/8 bg-paper/70 p-4 shadow-soft backdrop-blur">
      <div className="flex items-center gap-2 text-mute">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[12px] font-medium tracking-wide uppercase">
          {label}
        </span>
      </div>
      <p className="font-display mt-2 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
        {value}
      </p>
      <p className="mt-1 truncate text-[12px] text-mute">{hint}</p>
    </div>
  )
}
