#!/usr/bin/env node
/**
 * Formal sandbox API dumps for bKash PGW validation email.
 *
 * Usage:
 *   node scripts/bkash-sandbox-validate.mjs
 *   node scripts/bkash-sandbox-validate.mjs --query <paymentID>
 *   node scripts/bkash-sandbox-validate.mjs --execute <paymentID>   # only after customer pays
 *   node scripts/bkash-sandbox-validate.mjs --search <trxID>
 *   node scripts/bkash-sandbox-validate.mjs --no-create --query <paymentID>
 *
 * Token is cached in viable-bkash/.bkash-sandbox-token.json so Grant Token
 * is not called more than necessary (bKash allows only 2 grants/hour).
 * Dumps append to viable-bkash/bkash-formal-sandbox-dump.txt.
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const ENV_PATH = resolve(ROOT, '.env.local')
const BKASH_DIR = resolve(ROOT, 'viable-bkash')
const OUT_PATH = resolve(BKASH_DIR, 'bkash-formal-sandbox-dump.txt')
const TOKEN_PATH = resolve(BKASH_DIR, '.bkash-sandbox-token.json')
mkdirSync(BKASH_DIR, { recursive: true })

function loadEnv(path) {
  if (!existsSync(path)) throw new Error(`Missing ${path}`)
  const env = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

function requireEnv(env, key) {
  const value = env[key]?.trim()
  if (!value) throw new Error(`Missing ${key} in .env.local`)
  return value
}

function pretty(value) {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function section(title, url, requestBody, response) {
  return [
    `API Title: ${title}`,
    `API URL: ${url}`,
    `Request Body:`,
    pretty(requestBody),
    `API Response:`,
    pretty(response),
    '',
    '---',
    '',
  ].join('\n')
}

function appendSection(text) {
  appendFileSync(OUT_PATH, text, 'utf8')
}

function dumpHasTitle(title) {
  if (!existsSync(OUT_PATH)) return false
  return readFileSync(OUT_PATH, 'utf8').includes(`API Title: ${title}`)
}

async function postJson(url, { headers, body }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { _raw: text, _httpStatus: res.status }
  }
  return { ok: res.ok, status: res.status, json }
}

function readTokenCache() {
  if (!existsSync(TOKEN_PATH)) return null
  try {
    const cached = JSON.parse(readFileSync(TOKEN_PATH, 'utf8'))
    if (!cached?.id_token || !cached?.refreshAt) return null
    if (Date.now() >= cached.refreshAt) return null
    return cached
  } catch {
    return null
  }
}

function writeTokenCache(data) {
  const expiresInSec = Number(data.expires_in) || 3600
  const usableMs = Math.max(60, expiresInSec - 600) * 1000
  writeFileSync(
    TOKEN_PATH,
    JSON.stringify(
      {
        id_token: data.id_token,
        refresh_token: data.refresh_token || null,
        refreshAt: Date.now() + usableMs,
        savedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf8',
  )
}

function parseArgs(argv) {
  const out = { query: null, execute: null, search: null, create: true }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--query') out.query = argv[++i]
    else if (arg === '--execute') out.execute = argv[++i]
    else if (arg === '--search') out.search = argv[++i]
    else if (arg === '--no-create') out.create = false
    else if (arg === '--help' || arg === '-h') out.help = true
  }
  if (out.query || out.execute || out.search) {
    // Prefer not creating unless explicitly wanted alongside these.
    if (!argv.includes('--create')) out.create = argv.includes('--create')
      ? true
      : out.create && !out.query && !out.execute && !out.search
  }
  // Fix: if only query/execute/search, default create false
  if ((out.query || out.execute || out.search) && !argv.includes('--create')) {
    out.create = false
  }
  if (argv.includes('--create')) out.create = true
  return out
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(`Usage:
  node scripts/bkash-sandbox-validate.mjs
  node scripts/bkash-sandbox-validate.mjs --query <paymentID>
  node scripts/bkash-sandbox-validate.mjs --execute <paymentID>
  node scripts/bkash-sandbox-validate.mjs --search <trxID>
  node scripts/bkash-sandbox-validate.mjs --create --query <paymentID>`)
    return
  }

  const env = loadEnv(ENV_PATH)
  const base = requireEnv(env, 'BKASH_BASE_URL').replace(/\/$/, '')
  const username = requireEnv(env, 'BKASH_USERNAME')
  const password = requireEnv(env, 'BKASH_PASSWORD')
  const appKey = requireEnv(env, 'BKASH_APP_KEY')
  const appSecret = requireEnv(env, 'BKASH_APP_SECRET')
  const site = (env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
    /\/$/,
    '',
  )

  let token = null
  const cached = readTokenCache()
  if (cached?.id_token) {
    token = cached.id_token
    console.log('Using cached Grant Token (no new grant call)')
  } else {
    const grantUrl = `${base}/auth/grant-token`
    const grantBody = { app_key: appKey, app_secret: appSecret }
    const grant = await postJson(grantUrl, {
      headers: { username, password },
      body: grantBody,
    })
    if (!dumpHasTitle('Grant Token')) {
      appendSection(
        section('Grant Token', grantUrl, grantBody, {
          httpStatus: grant.status,
          ...grant.json,
        }),
      )
    }
    if (!grant.json.id_token) {
      throw new Error(
        `Grant Token failed (${grant.status}): ${pretty(grant.json)}`,
      )
    }
    writeTokenCache(grant.json)
    token = grant.json.id_token
    console.log('Grant Token: ok (cached for ~50 minutes)')
  }

  const authHeaders = {
    authorization: token,
    'x-app-key': appKey,
  }

  if (args.create) {
    const invoice = `VF-SANDBOX-${Date.now()}`
    const createUrl = `${base}/payment/create`
    const createBody = {
      payerReference: '01770618575',
      callbackURL: `${site}/api/payments/bkash/callback`,
      amount: '10',
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: invoice,
    }
    const created = await postJson(createUrl, {
      headers: authHeaders,
      body: createBody,
    })
    appendSection(
      section('Create API', createUrl, createBody, {
        httpStatus: created.status,
        ...created.json,
      }),
    )
    const paymentID = created.json.paymentID || created.json.paymentId || null
    console.log(`Created paymentID: ${paymentID}`)
    console.log(`Invoice: ${invoice}`)
    if (created.json.bkashURL) console.log(`Pay URL: ${created.json.bkashURL}`)
  }

  if (args.query) {
    const queryUrl = `${base}/query/payment`
    const queryBody = { paymentId: args.query, paymentID: args.query }
    const queried = await postJson(queryUrl, {
      headers: authHeaders,
      body: queryBody,
    })
    appendSection(
      section('Query Payment API', queryUrl, queryBody, {
        httpStatus: queried.status,
        ...queried.json,
      }),
    )
    console.log(`Query status: ${queried.json.transactionStatus || 'unknown'}`)
  }

  if (args.execute) {
    const executeUrl = `${base}/payment/execute`
    const executeBody = { paymentId: args.execute, paymentID: args.execute }
    const executed = await postJson(executeUrl, {
      headers: authHeaders,
      body: executeBody,
    })
    appendSection(
      section('Execute API', executeUrl, executeBody, {
        httpStatus: executed.status,
        ...executed.json,
      }),
    )
    const trx = executed.json.trxID || executed.json.trxId
    if (trx) console.log(`trxID: ${trx}`)
  }

  if (args.search) {
    // V2: /general/search-transaction + trxId (camelCase)
    const searchUrl = `${base}/general/search-transaction`
    const searchBody = { trxId: args.search }
    const searched = await postJson(searchUrl, {
      headers: authHeaders,
      body: searchBody,
    })
    appendSection(
      section('Search Transaction API', searchUrl, searchBody, {
        httpStatus: searched.status,
        ...searched.json,
      }),
    )
    console.log(
      `Search status: ${searched.json.transactionStatus || searched.status}`,
    )
  }

  console.log(`\nUpdated ${OUT_PATH}`)
  console.log(
    '\nNext:\n1) Open a Pay URL, complete success payment (PIN 12121 / OTP 123456)\n2) npm run bkash:sandbox-validate -- --execute <paymentID>\n3) npm run bkash:sandbox-validate -- --search <trxID>\n4) Cancel / wrong-OTP / duplicate-amount on checkout + screenshots',
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
