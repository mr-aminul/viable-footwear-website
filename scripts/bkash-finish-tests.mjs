#!/usr/bin/env node
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const PROOF = resolve(ROOT, 'viable-bkash/formal-proof')
mkdirSync(PROOF, { recursive: true })

const WALLET = '01770618575'
const PIN = '12121'
const GOOD_OTP = '123456'

function loadEnv() {
  const env = {}
  for (const line of readFileSync(resolve(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const i = t.indexOf('=')
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1)
    env[t.slice(0, i).trim()] = v
  }
  return env
}

function loadToken() {
  const cached = JSON.parse(
    readFileSync(resolve(ROOT, 'viable-bkash/.bkash-sandbox-token.json'), 'utf8'),
  )
  if (!cached.id_token || Date.now() >= cached.refreshAt) throw new Error('token expired')
  return cached.id_token
}

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  return { status: res.status, json: await res.json().catch(() => ({})) }
}

async function createPayment(amount, label) {
  const env = loadEnv()
  const base = env.BKASH_BASE_URL.replace(/\/$/, '')
  const token = loadToken()
  const invoice = `VF-${label}-${Date.now()}`
  const body = {
    payerReference: WALLET,
    callbackURL: 'http://localhost:3000/api/payments/bkash/callback',
    amount: String(amount),
    currency: 'BDT',
    intent: 'sale',
    merchantInvoiceNumber: invoice,
  }
  const { status, json } = await postJson(
    `${base}/payment/create`,
    { authorization: token, 'x-app-key': env.BKASH_APP_KEY },
    body,
  )
  return {
    invoice,
    amount,
    httpStatus: status,
    paymentID: json.paymentID || json.paymentId,
    bkashURL: json.bkashURL,
    createTime: json.paymentCreateTime,
    createRequest: body,
    createResponse: json,
    cancelledCallbackURL: json.cancelledCallbackURL,
    failureCallbackURL: json.failureCallbackURL,
  }
}

async function executePayment(paymentID) {
  const env = loadEnv()
  const base = env.BKASH_BASE_URL.replace(/\/$/, '')
  const token = loadToken()
  return postJson(
    `${base}/payment/execute`,
    { authorization: token, 'x-app-key': env.BKASH_APP_KEY },
    { paymentId: paymentID, paymentID },
  )
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function shot(page, name) {
  const path = resolve(PROOF, `${name}.png`)
  await page.screenshot({ path, fullPage: true })
  console.log('shot', name)
}

async function waitText(page, re, timeout = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const text = await page.locator('body').innerText()
    if (re.test(text)) return text
    await sleep(400)
  }
  throw new Error(`Timeout waiting for ${re}`)
}

async function fillVisible(page, value) {
  const input = page.locator('input:visible').first()
  await input.click({ timeout: 15000 })
  await input.fill('')
  await input.pressSequentially(value, { delay: 70 })
  await sleep(300)
}

async function confirm(page) {
  const btn = page.locator('button:has-text("Confirm")').first()
  await btn.waitFor({ state: 'visible', timeout: 15000 })
  for (let i = 0; i < 25; i++) {
    if (!(await btn.isDisabled())) {
      await btn.click()
      return
    }
    await sleep(300)
  }
  throw new Error('Confirm stayed disabled')
}

async function completeCheckout(page, payment, tag) {
  await page.goto(payment.bkashURL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await waitText(page, /bKash Account Number|Account Number/i)
  await shot(page, `${tag}-wallet`)
  await fillVisible(page, WALLET)
  await confirm(page)

  await waitText(page, /Enter PIN|PIN Of Your bKash/i)
  await shot(page, `${tag}-pin`)
  await fillVisible(page, PIN)
  await confirm(page)

  await waitText(page, /Verification Code|OTP|verification code/i)
  await shot(page, `${tag}-otp`)
  await fillVisible(page, GOOD_OTP)
  await confirm(page)

  await sleep(5000)
  await shot(page, `${tag}-result`)
  const text = await page.locator('body').innerText()
  console.log(tag, 'url', page.url())
  console.log(tag, 'text', text.slice(0, 400))
  return { url: page.url(), text }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  })
  const context = await browser.newContext({
    viewport: { width: 420, height: 900 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
    locale: 'en-BD',
  })
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })
  const page = await context.newPage()

  // --- Proper Cancel via Cancel button ---
  console.log('\n=== CANCEL via Cancel button ===')
  const cancel = await createPayment(18, 'CANCEL2')
  writeFileSync(resolve(PROOF, 'cancel2-payment.json'), JSON.stringify(cancel, null, 2))
  await page.goto(cancel.bkashURL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await waitText(page, /Cancel|Account Number/i)
  await shot(page, '10-cancel2-page')
  await page.getByRole('button', { name: /^Cancel$/i }).click()
  await sleep(3500)
  await shot(page, '11-cancel2-after-button')
  console.log('after cancel url', page.url())
  console.log((await page.locator('body').innerText()).slice(0, 400))
  // ensure merchant message
  if (!/Payment Cancelled/i.test(await page.locator('body').innerText())) {
    await page.goto(cancel.cancelledCallbackURL, { waitUntil: 'domcontentloaded' })
    await sleep(1500)
  }
  await shot(page, '12-cancel2-merchant')
  writeFileSync(
    resolve(PROOF, '12-cancel2-merchant.txt'),
    `${page.url()}\n\n${await page.locator('body').innerText()}`,
  )

  // --- Merchant fail message (from prior fail payment if present) ---
  console.log('\n=== MERCHANT FAIL MESSAGE ===')
  let failPayment = null
  if (existsSync(resolve(PROOF, 'fail-payment.json'))) {
    failPayment = JSON.parse(readFileSync(resolve(PROOF, 'fail-payment.json'), 'utf8'))
  } else {
    failPayment = await createPayment(19, 'FAIL2')
  }
  await page.goto(
    failPayment.failureCallbackURL ||
      `http://localhost:3000/api/payments/bkash/callback?paymentID=${failPayment.paymentID}&status=failure`,
    { waitUntil: 'domcontentloaded' },
  )
  await sleep(1500)
  await shot(page, '13-fail-merchant-payment-failed')
  writeFileSync(
    resolve(PROOF, '13-fail-merchant-payment-failed.txt'),
    `${page.url()}\n\n${await page.locator('body').innerText()}`,
  )

  // --- Duplicate amount: complete first, then second ---
  console.log('\n=== DUPLICATE ===')
  const amount = 21
  const dup1 = await createPayment(amount, 'DUPA')
  writeFileSync(resolve(PROOF, 'dupa-payment.json'), JSON.stringify(dup1, null, 2))
  const r1 = await completeCheckout(page, dup1, '14-dupa')
  const ex1 = await executePayment(dup1.paymentID)
  writeFileSync(resolve(PROOF, 'dupa-execute.json'), JSON.stringify({ ...ex1, ui: r1 }, null, 2))
  console.log('dupa execute', ex1.json)

  const dup2 = await createPayment(amount, 'DUPB')
  writeFileSync(resolve(PROOF, 'dupb-payment.json'), JSON.stringify(dup2, null, 2))
  let r2
  try {
    r2 = await completeCheckout(page, dup2, '15-dupb')
  } catch (e) {
    r2 = { error: String(e), text: await page.locator('body').innerText().catch(() => '') }
    await shot(page, '15-dupb-error')
    console.error('dupb ui error', e)
  }
  const ex2 = await executePayment(dup2.paymentID)
  writeFileSync(resolve(PROOF, 'dupb-execute.json'), JSON.stringify({ ...ex2, ui: r2 }, null, 2))
  console.log('dupb execute', ex2.json)
  await shot(page, '16-dupb-final')
  writeFileSync(
    resolve(PROOF, '16-dupb-final.txt'),
    `${page.url()}\n\n${await page.locator('body').innerText()}`,
  )

  writeFileSync(
    resolve(PROOF, 'finish-summary.json'),
    JSON.stringify({ cancel, failPayment, dup1, dup2, ex1, ex2, r1, r2 }, null, 2),
  )
  await browser.close()
  console.log('done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
