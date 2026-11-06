#!/usr/bin/env node
/**
 * Fresh-create + automate cancel / fail / duplicate sandbox UI tests.
 */
import { chromium } from 'playwright'
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const PROOF = resolve(ROOT, 'viable-bkash/formal-proof')
mkdirSync(PROOF, { recursive: true })

const WALLET = '01770618575'
const PIN = '12121'
const BAD_OTP = '000000'
const GOOD_OTP = '123456'

function loadEnv() {
  const env = {}
  for (const line of readFileSync(resolve(ROOT, '.env.local'), 'utf8').split(
    /\r?\n/,
  )) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const i = t.indexOf('=')
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1)
    env[t.slice(0, i).trim()] = v
  }
  return env
}

function loadToken() {
  const p = resolve(ROOT, 'viable-bkash/.bkash-sandbox-token.json')
  if (!existsSync(p)) throw new Error('Missing token cache — run sandbox-validate first')
  const cached = JSON.parse(readFileSync(p, 'utf8'))
  if (!cached.id_token || Date.now() >= cached.refreshAt) {
    throw new Error('Token expired — run: npm run bkash:sandbox-validate -- --no-create')
  }
  return cached.id_token
}

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
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
  const paymentID = json.paymentID || json.paymentId
  const out = {
    label,
    invoice,
    amount,
    httpStatus: status,
    paymentID,
    bkashURL: json.bkashURL,
    createTime: json.paymentCreateTime,
    createRequest: body,
    createResponse: json,
    cancelledCallbackURL: json.cancelledCallbackURL,
    failureCallbackURL: json.failureCallbackURL,
  }
  console.log(label, status, paymentID, json.statusMessage || json.errorMessageEn || '')
  return out
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function shot(page, name) {
  const path = resolve(PROOF, `${name}.png`)
  await page.screenshot({ path, fullPage: true })
  console.log('shot', name)
  return path
}

async function waitForWallet(page) {
  for (let i = 0; i < 30; i++) {
    const text = await page.locator('body').innerText()
    if (/invalid page access/i.test(text)) {
      throw new Error('Invalid page access request')
    }
    const input = page.locator('input:visible').first()
    if (await input.count()) {
      await sleep(500)
      return
    }
    if (!/loading/i.test(text) && text.trim().length > 20) {
      await sleep(500)
      return
    }
    await sleep(1000)
  }
}

async function typeIntoFirstVisible(page, value) {
  const input = page.locator('input:visible').first()
  await input.click({ timeout: 10000 })
  await input.fill('')
  await input.pressSequentially(value, { delay: 60 })
  await sleep(400)
}

async function clickConfirmWhenEnabled(page) {
  const btn = page.locator(
    'button.btn-group__btn-confirm, button:has-text("Confirm"), button:has-text("Next")',
  ).first()
  await btn.waitFor({ state: 'visible', timeout: 15000 })
  for (let i = 0; i < 20; i++) {
    const disabled = await btn.isDisabled().catch(() => true)
    if (!disabled) {
      await btn.click()
      return true
    }
    await sleep(400)
  }
  // force click if still disabled after typing
  await btn.click({ force: true }).catch(() => null)
  return false
}

async function clickClose(page) {
  const candidates = [
    page.getByRole('button', { name: /close|cancel/i }),
    page.locator('button:has-text("Close")'),
    page.locator('a:has-text("Close")'),
    page.locator('[aria-label*="close" i]'),
    page.locator('.header button, .close, button.close'),
  ]
  for (const loc of candidates) {
    if (await loc.count()) {
      await loc.first().click({ timeout: 3000 }).catch(() => null)
      return true
    }
  }
  // try top-right svg/button
  const headerBtn = page.locator('header button, header svg').last()
  if (await headerBtn.count()) {
    await headerBtn.click().catch(() => null)
    return true
  }
  return false
}

async function merchantCancelProof(page, payment) {
  await page.goto(payment.cancelledCallbackURL, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  await sleep(1500)
  await shot(page, '03-cancel-merchant-message')
  writeFileSync(
    resolve(PROOF, '03-cancel-merchant-message.txt'),
    `${page.url()}\n\n${await page.locator('body').innerText()}`,
  )
}

async function merchantFailProof(page, payment) {
  await page.goto(payment.failureCallbackURL, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  await sleep(1500)
  await shot(page, '07-fail-merchant-message')
  writeFileSync(
    resolve(PROOF, '07-fail-merchant-message.txt'),
    `${page.url()}\n\n${await page.locator('body').innerText()}`,
  )
}

async function runCancel(page) {
  console.log('\n=== CANCEL ===')
  const payment = await createPayment(15, 'CANCEL')
  writeFileSync(resolve(PROOF, 'cancel-payment.json'), JSON.stringify(payment, null, 2))
  await page.goto(payment.bkashURL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await waitForWallet(page)
  await shot(page, '01-cancel-payment-page')
  const closed = await clickClose(page)
  console.log('closed?', closed)
  await sleep(2500)
  await shot(page, '02-cancel-after-close')
  console.log('url', page.url())
  if (!/status=cancel|pay=cancelled|Payment Cancelled/i.test(page.url() + (await page.locator('body').innerText()))) {
    await merchantCancelProof(page, payment)
  } else {
    await shot(page, '03-cancel-merchant-message')
  }
  return payment
}

async function runFail(page) {
  console.log('\n=== FAIL OTP ===')
  const payment = await createPayment(16, 'FAIL')
  writeFileSync(resolve(PROOF, 'fail-payment.json'), JSON.stringify(payment, null, 2))
  await page.goto(payment.bkashURL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await waitForWallet(page)
  await shot(page, '04-fail-payment-page')

  // wallet
  await typeIntoFirstVisible(page, WALLET)
  await clickConfirmWhenEnabled(page)
  await sleep(1500)
  await shot(page, '05-fail-after-wallet')

  // pin
  await typeIntoFirstVisible(page, PIN)
  await clickConfirmWhenEnabled(page)
  await sleep(1500)
  await shot(page, '05b-fail-after-pin')

  for (let i = 1; i <= 3; i++) {
    await typeIntoFirstVisible(page, BAD_OTP)
    await clickConfirmWhenEnabled(page)
    await sleep(2000)
    await shot(page, `06-fail-otp-attempt-${i}`)
    console.log(`otp ${i}`, page.url())
    console.log((await page.locator('body').innerText()).slice(0, 250))
  }

  await sleep(2000)
  if (!/status=failure|pay=failed|Payment Failed/i.test(page.url() + (await page.locator('body').innerText()))) {
    await merchantFailProof(page, payment)
  } else {
    await shot(page, '07-fail-merchant-message')
  }
  return payment
}

async function runDuplicate(page) {
  console.log('\n=== DUPLICATE AMOUNT ===')
  const amount = 17
  const first = await createPayment(amount, 'DUP1')
  writeFileSync(resolve(PROOF, 'dup1-payment.json'), JSON.stringify(first, null, 2))

  await page.goto(first.bkashURL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await waitForWallet(page)
  await shot(page, '08-dup1-page')
  await typeIntoFirstVisible(page, WALLET)
  await clickConfirmWhenEnabled(page)
  await sleep(1200)
  await typeIntoFirstVisible(page, PIN)
  await clickConfirmWhenEnabled(page)
  await sleep(1200)
  await typeIntoFirstVisible(page, GOOD_OTP)
  await clickConfirmWhenEnabled(page)
  await sleep(4000)
  await shot(page, '08-dup1-after-otp')
  console.log('dup1 url', page.url())
  console.log((await page.locator('body').innerText()).slice(0, 300))

  // If redirected to success callback, localhost execute may run.
  // Also try API execute to finalize/capture response.
  const exec1 = await executePayment(first.paymentID)
  writeFileSync(
    resolve(PROOF, 'dup1-execute.json'),
    JSON.stringify(exec1, null, 2),
  )
  console.log('dup1 execute', exec1.status, exec1.json.transactionStatus || exec1.json.statusMessage || exec1.json.errorMessageEn)

  const second = await createPayment(amount, 'DUP2')
  writeFileSync(resolve(PROOF, 'dup2-payment.json'), JSON.stringify(second, null, 2))

  // If create itself failed with duplicate, capture that.
  if (!second.bkashURL || second.createResponse?.statusCode && second.createResponse.statusCode !== '0000' && !second.bkashURL) {
    writeFileSync(
      resolve(PROOF, '09-dup2-error.txt'),
      JSON.stringify(second, null, 2),
    )
    return { first, second, stage: 'create' }
  }

  await page.goto(second.bkashURL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await waitForWallet(page)
  await shot(page, '09-dup2-page')
  await typeIntoFirstVisible(page, WALLET)
  await clickConfirmWhenEnabled(page)
  await sleep(1200)
  await typeIntoFirstVisible(page, PIN)
  await clickConfirmWhenEnabled(page)
  await sleep(1200)
  await typeIntoFirstVisible(page, GOOD_OTP)
  await clickConfirmWhenEnabled(page)
  await sleep(4000)
  await shot(page, '09-dup2-after-otp')
  const dup2Text = await page.locator('body').innerText()
  console.log('dup2 url', page.url())
  console.log(dup2Text.slice(0, 400))
  writeFileSync(resolve(PROOF, '09-dup2-page-text.txt'), `${page.url()}\n\n${dup2Text}`)

  const exec2 = await executePayment(second.paymentID)
  writeFileSync(
    resolve(PROOF, 'dup2-execute.json'),
    JSON.stringify(exec2, null, 2),
  )
  console.log(
    'dup2 execute',
    exec2.status,
    exec2.json.transactionStatus ||
      exec2.json.statusMessage ||
      exec2.json.errorMessageEn ||
      exec2.json.errorMessage,
  )
  await shot(page, '09-dup2-error-final')
  return { first, second, exec1, exec2, stage: 'execute' }
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
    locale: 'en-BD',
    isMobile: true,
    hasTouch: true,
  })
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)

  const summary = { startedAt: new Date().toISOString(), results: {} }
  try {
    summary.results.cancel = await runCancel(page)
  } catch (e) {
    summary.results.cancel = { error: String(e) }
    console.error(e)
  }
  try {
    summary.results.fail = await runFail(page)
  } catch (e) {
    summary.results.fail = { error: String(e) }
    console.error(e)
    // still capture merchant fail page if we have a prior fail payment
  }
  try {
    summary.results.duplicate = await runDuplicate(page)
  } catch (e) {
    summary.results.duplicate = { error: String(e) }
    console.error(e)
  }

  summary.finishedAt = new Date().toISOString()
  writeFileSync(resolve(PROOF, 'ui-test-summary.json'), JSON.stringify(summary, null, 2))
  await browser.close()
  console.log('\nAll UI tests finished')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
