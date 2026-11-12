/**
 * Local-only: trust corporate HTTPS inspection CA (Forward Trust)
 * so Node fetch can reach VIABLE_API_URL / MinIO / etc.
 * No-ops when the PEM is missing (e.g. Vercel) or NODE_EXTRA_CA_CERTS is set.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const defaultCa = path.join(root, 'certs/forward-trust-root.pem')
const env = { ...process.env }

if (!env.NODE_EXTRA_CA_CERTS && fs.existsSync(defaultCa)) {
  env.NODE_EXTRA_CA_CERTS = defaultCa
}

const [cmd, ...args] = process.argv.slice(2)
if (!cmd) {
  console.error('Usage: node scripts/run-with-local-ca.mjs <command> [...args]')
  process.exit(1)
}

const child = spawn(cmd, args, { stdio: 'inherit', env, cwd: root })
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
