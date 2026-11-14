export type StatusLevel = 'operational' | 'degraded' | 'outage' | 'unknown'

export type ServiceStatus = 'up' | 'down' | 'degraded' | 'unknown'

export type StatusService = {
  id: string
  label: string
  kind: 'systemd' | 'http' | 'other'
  unit?: string
  status: ServiceStatus
  detail?: string
}

export type StatusContainer = {
  name: string
  status: ServiceStatus
  detail?: string
}

export type StatusProbe = {
  id: string
  label: string
  url: string
  ok: boolean
  latencyMs: number
  httpStatus: number | string
}

export type StatusHistoryPoint = {
  t: number
  load1: number
  memPercent: number
  diskPercent: number
}

export type VpsStatusReport = {
  generatedAt: string
  hostname: string
  platform: {
    os: string
    kernel: string
    arch: string
    cpus: number
    cpuModel: string
  }
  uptimeSec: number
  load: { '1': number; '5': number; '15': number }
  memory: {
    total: number
    used: number
    available: number
    usedPercent: number
  }
  swap: {
    total: number
    used: number
  }
  disks: Array<{
    mount: string
    device: string
    fstype: string
    total: number
    used: number
    available: number
    usedPercent: number
  }>
  network: Array<{
    iface: string
    rxBytes: number
    txBytes: number
  }>
  services: StatusService[]
  containers: StatusContainer[]
  probes: StatusProbe[]
  overall: StatusLevel
  history: StatusHistoryPoint[]
  /** Present when the report file is missing or too old. */
  stale?: boolean
  source?: 'collector' | 'demo'
  message?: string
}
