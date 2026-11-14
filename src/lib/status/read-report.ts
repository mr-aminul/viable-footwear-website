import { readFile } from 'node:fs/promises'
import type { StatusLevel, VpsStatusReport } from '@/lib/status/types'

const DEFAULT_REPORT_PATH = '/var/lib/vps-status/report.json'
/** Treat collector output older than this as stale. */
const STALE_AFTER_MS = 3 * 60 * 1000

function reportPath(): string {
  return process.env.VPS_STATUS_REPORT_PATH || DEFAULT_REPORT_PATH
}

function demoReport(): VpsStatusReport {
  const now = Date.now()
  const history = Array.from({ length: 30 }, (_, i) => ({
    t: Math.floor((now - (29 - i) * 60_000) / 1000),
    load1: 0.15 + (i % 5) * 0.04,
    memPercent: 28 + (i % 7),
    diskPercent: 8,
  }))

  return {
    generatedAt: new Date().toISOString(),
    hostname: 'local-dev',
    platform: {
      os: 'Development preview',
      kernel: 'n/a',
      arch: process.arch,
      cpus: 4,
      cpuModel: 'Demo CPU',
    },
    uptimeSec: 86_400,
    load: { '1': 0.2, '5': 0.18, '15': 0.15 },
    memory: {
      total: 8 * 1024 ** 3,
      used: 2.4 * 1024 ** 3,
      available: 5.6 * 1024 ** 3,
      usedPercent: 30,
    },
    swap: { total: 0, used: 0 },
    disks: [
      {
        mount: '/',
        device: '/dev/sda1',
        fstype: 'ext4',
        total: 100 * 1024 ** 3,
        used: 8 * 1024 ** 3,
        available: 92 * 1024 ** 3,
        usedPercent: 8,
      },
    ],
    network: [{ iface: 'eth0', rxBytes: 1_500_000_000, txBytes: 11_000_000_000 }],
    services: [
      { id: 'caddy', label: 'Edge proxy (Caddy)', kind: 'systemd', status: 'up', detail: 'active' },
      { id: 'postgres', label: 'PostgreSQL', kind: 'systemd', status: 'up', detail: 'active' },
      { id: 'minio', label: 'Object storage (MinIO)', kind: 'systemd', status: 'up', detail: 'active' },
      { id: 'docker', label: 'Docker engine', kind: 'systemd', status: 'up', detail: 'active' },
      { id: 'viable-web', label: 'Viable — storefront', kind: 'systemd', status: 'up', detail: 'active' },
      { id: 'govibe-web', label: 'GoVibe — storefront', kind: 'systemd', status: 'up', detail: 'active' },
    ],
    containers: [
      { name: 'viable-postgrest', status: 'up', detail: 'Up (demo)' },
      { name: 'govibe-postgrest', status: 'up', detail: 'Up (demo)' },
    ],
    probes: [
      {
        id: 'viable-local',
        label: 'Viable storefront (:3000)',
        url: 'http://127.0.0.1:3000/',
        ok: true,
        latencyMs: 12,
        httpStatus: 200,
      },
      {
        id: 'govibe-local',
        label: 'GoVibe storefront (:3003)',
        url: 'http://127.0.0.1:3003/',
        ok: true,
        latencyMs: 14,
        httpStatus: 200,
      },
      {
        id: 'minio-live',
        label: 'MinIO health',
        url: 'http://127.0.0.1:9000/minio/health/live',
        ok: true,
        latencyMs: 4,
        httpStatus: 200,
      },
    ],
    overall: 'operational',
    history,
    source: 'demo',
    message:
      'This is a preview on your computer. On the live server you’ll see real results.',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asStatusLevel(value: unknown): StatusLevel {
  if (value === 'operational' || value === 'degraded' || value === 'outage') {
    return value
  }
  return 'unknown'
}

function parseReport(raw: unknown): VpsStatusReport | null {
  if (!isRecord(raw)) return null
  if (typeof raw.generatedAt !== 'string') return null
  if (typeof raw.hostname !== 'string') return null
  if (!isRecord(raw.platform) || !isRecord(raw.memory) || !isRecord(raw.load)) {
    return null
  }

  return {
    generatedAt: raw.generatedAt,
    hostname: raw.hostname,
    platform: {
      os: String(raw.platform.os ?? 'unknown'),
      kernel: String(raw.platform.kernel ?? 'unknown'),
      arch: String(raw.platform.arch ?? 'unknown'),
      cpus: Number(raw.platform.cpus ?? 0),
      cpuModel: String(raw.platform.cpuModel ?? 'unknown'),
    },
    uptimeSec: Number(raw.uptimeSec ?? 0),
    load: {
      '1': Number(raw.load['1'] ?? 0),
      '5': Number(raw.load['5'] ?? 0),
      '15': Number(raw.load['15'] ?? 0),
    },
    memory: {
      total: Number(raw.memory.total ?? 0),
      used: Number(raw.memory.used ?? 0),
      available: Number(raw.memory.available ?? 0),
      usedPercent: Number(raw.memory.usedPercent ?? 0),
    },
    swap: {
      total: Number(isRecord(raw.swap) ? raw.swap.total : 0),
      used: Number(isRecord(raw.swap) ? raw.swap.used : 0),
    },
    disks: Array.isArray(raw.disks) ? (raw.disks as VpsStatusReport['disks']) : [],
    network: Array.isArray(raw.network)
      ? (raw.network as VpsStatusReport['network'])
      : [],
    services: Array.isArray(raw.services)
      ? (raw.services as VpsStatusReport['services'])
      : [],
    containers: Array.isArray(raw.containers)
      ? (raw.containers as VpsStatusReport['containers'])
      : [],
    probes: Array.isArray(raw.probes) ? (raw.probes as VpsStatusReport['probes']) : [],
    overall: asStatusLevel(raw.overall),
    history: Array.isArray(raw.history)
      ? (raw.history as VpsStatusReport['history'])
      : [],
    source: 'collector',
  }
}

/** Load the latest VPS status report written by the collector cron. */
export async function readVpsStatusReport(): Promise<VpsStatusReport> {
  try {
    const text = await readFile(reportPath(), 'utf8')
    const parsed = parseReport(JSON.parse(text) as unknown)
    if (!parsed) {
      const demo = demoReport()
      demo.message = 'Status report on disk was invalid.'
      demo.overall = 'unknown'
      return demo
    }

    const ageMs = Date.now() - Date.parse(parsed.generatedAt)
    if (!Number.isFinite(ageMs) || ageMs > STALE_AFTER_MS) {
      parsed.stale = true
      if (parsed.overall === 'operational') parsed.overall = 'degraded'
      parsed.message = 'Collector data is stale — last successful sample is older than expected.'
    }
    return parsed
  } catch {
    return demoReport()
  }
}
