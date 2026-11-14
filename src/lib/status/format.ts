import type { StatusLevel, ServiceStatus } from '@/lib/status/types'

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  const digits = value >= 10 || i === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[i]}`
}

export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  const d = Math.floor(seconds / 86_400)
  const h = Math.floor((seconds % 86_400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return d === 1 ? `1 day ${h}h` : `${d} days ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

export function formatRelativeTime(iso: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return '—'
  const delta = Math.max(0, Date.now() - ms)
  const sec = Math.floor(delta / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min === 1) return '1 minute ago'
  if (min < 60) return `${min} minutes ago`
  const hr = Math.floor(min / 60)
  if (hr === 1) return '1 hour ago'
  if (hr < 48) return `${hr} hours ago`
  const days = Math.floor(hr / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

export function overallLabel(level: StatusLevel): string {
  switch (level) {
    case 'operational':
      return 'Everything looks good'
    case 'degraded':
      return 'Some things need attention'
    case 'outage':
      return 'Something is down'
    default:
      return 'Checking status…'
  }
}

export function overallBlurb(level: StatusLevel): string {
  switch (level) {
    case 'operational':
      return 'Websites, storage, and the server are running normally.'
    case 'degraded':
      return 'Most things still work, but one or more parts are slow or shaky.'
    case 'outage':
      return 'A key part of the setup isn’t responding. We’re looking into it.'
    default:
      return 'We’re still gathering the latest health info.'
  }
}

export function friendlyStatus(
  status: ServiceStatus | StatusLevel | 'ok' | 'fail',
): string {
  switch (status) {
    case 'up':
    case 'ok':
    case 'operational':
      return 'Working'
    case 'degraded':
      return 'Unsteady'
    case 'down':
    case 'fail':
    case 'outage':
      return 'Down'
    default:
      return 'Unknown'
  }
}

/** Map raw collector names → plain language. */
export function friendlyName(idOrName: string): string {
  const key = idOrName.trim().toLowerCase()
  const map: Record<string, string> = {
    caddy: 'Website gateway',
    postgres: 'Database',
    minio: 'Photo & file storage',
    docker: 'App platform',
    'viable-web': 'Viable website',
    'govibe-web': 'GoVibe website',
    'viable-postgrest': 'Viable data API',
    'govibe-postgrest': 'GoVibe data API',
    'viable-local': 'Viable website',
    'govibe-local': 'GoVibe website',
    'viable-api': 'Viable data API',
    'govibe-api': 'GoVibe data API',
    'minio-live': 'File storage',
    'viable-public': 'viable.fashion (public)',
    's3-public': 'Image CDN (public)',
  }
  if (map[key]) return map[key]

  // Soft cleanup for unknown docker names
  return idOrName
    .replace(/[-_]+/g, ' ')
    .replace(/\bpostgrest\b/gi, 'data API')
    .replace(/\bminio\b/gi, 'storage')
}

export function busyLabel(load1: number, cpus: number): string {
  const ratio = load1 / Math.max(1, cpus)
  if (ratio < 0.35) return 'Calm'
  if (ratio < 0.7) return 'Normal'
  if (ratio < 1) return 'Busy'
  return 'Very busy'
}

export function usageComfort(percent: number): string {
  if (percent < 50) return 'Plenty of room'
  if (percent < 75) return 'Comfortable'
  if (percent < 90) return 'Getting full'
  return 'Almost full'
}

export function statusTone(
  level: StatusLevel | ServiceStatus,
): { bg: string; text: string; dot: string; ring: string } {
  switch (level) {
    case 'operational':
    case 'up':
      return {
        bg: 'bg-emerald-500/12',
        text: 'text-emerald-800',
        dot: 'bg-emerald-500',
        ring: 'ring-emerald-500/25',
      }
    case 'degraded':
      return {
        bg: 'bg-amber-500/14',
        text: 'text-amber-900',
        dot: 'bg-amber-500',
        ring: 'ring-amber-500/30',
      }
    case 'outage':
    case 'down':
      return {
        bg: 'bg-spark/12',
        text: 'text-spark',
        dot: 'bg-spark',
        ring: 'ring-spark/25',
      }
    default:
      return {
        bg: 'bg-mute/10',
        text: 'text-mute',
        dot: 'bg-mute',
        ring: 'ring-mute/20',
      }
  }
}
