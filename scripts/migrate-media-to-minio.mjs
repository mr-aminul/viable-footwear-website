#!/usr/bin/env node
/**
 * Copy product/site media from Supabase Storage → VPS MinIO.
 *
 * Requires MEDIA_S3_* env + NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * Supabase must not be egress-locked (402) or downloads will fail.
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-media-to-minio.mjs --from-csv scripts/media-manifest.csv
 *   node --env-file=.env.local scripts/migrate-media-to-minio.mjs --from-html https://viable.inventivelab.bd/
 *   node --env-file=.env.local scripts/migrate-media-to-minio.mjs
 */

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const BUCKETS = ['product-images', 'product-videos', 'site-media']

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing env ${name}`)
  return value
}

function s3() {
  return new S3Client({
    region: process.env.MEDIA_S3_REGION?.trim() || 'us-east-1',
    endpoint: required('MEDIA_S3_ENDPOINT'),
    forcePathStyle: process.env.MEDIA_S3_FORCE_PATH_STYLE !== 'false',
    credentials: {
      accessKeyId: required('MEDIA_S3_ACCESS_KEY'),
      secretAccessKey: required('MEDIA_S3_SECRET_KEY'),
    },
  })
}

async function listFromSupabaseApi(bucket) {
  const base = required('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')
  const key = required('SUPABASE_SERVICE_ROLE_KEY')
  const out = []
  const queue = ['']

  while (queue.length > 0) {
    const prefix = queue.pop()
    const res = await fetch(`${base}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefix, limit: 1000 }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`List ${bucket}/${prefix} failed (${res.status}): ${body}`)
    }
    const rows = await res.json()
    for (const row of rows) {
      const name = row.name
      if (!name) continue
      const path = prefix ? `${prefix}${name}` : name
      // Folders from Supabase listing often have id null and no metadata.
      if (row.id == null && !row.metadata) {
        queue.push(`${path}/`)
        continue
      }
      out.push(path)
    }
  }
  return out
}

async function listFromCsv(filePath) {
  const fs = await import('node:fs/promises')
  const text = await fs.readFile(filePath, 'utf8')
  /** @type {Map<string, Set<string>>} */
  const byBucket = new Map(BUCKETS.map((b) => [b, new Set()]))
  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue
    const comma = line.indexOf(',')
    if (comma < 0) continue
    const bucket = line.slice(0, comma).trim()
    const path = line.slice(comma + 1).trim().replace(/^"|"$/g, '')
    if (byBucket.has(bucket) && path) byBucket.get(bucket).add(path)
  }
  return byBucket
}

async function listFromHtml(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTML fetch failed ${res.status}`)
  const html = await res.text()
  const re =
    /(?:storage\/v1\/object\/public\/|s3\.storage\.inventivelab\.bd\/)?(product-images|product-videos|site-media)\/([a-zA-Z0-9._\-\/]+\.(?:webp|jpg|jpeg|png|gif|mp4|webm))/g
  /** @type {Map<string, Set<string>>} */
  const byBucket = new Map(BUCKETS.map((b) => [b, new Set()]))
  for (const match of html.matchAll(re)) {
    byBucket.get(match[1])?.add(match[2].replace(/\\+$/, ''))
  }
  return byBucket
}

async function objectExists(client, bucket, key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch {
    return false
  }
}

async function downloadFromSupabase(bucket, path) {
  const base = required('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')
  const key = required('SUPABASE_SERVICE_ROLE_KEY')
  const url = `${base}/storage/v1/object/authenticated/${bucket}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
  })
  if (!res.ok) {
    // Fallback to public URL shape (same bytes when project is healthy).
    const pub = `${base}/storage/v1/object/public/${bucket}/${path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`
    const pubRes = await fetch(pub)
    if (!pubRes.ok) {
      const body = await res.text()
      throw new Error(`${res.status} ${body.slice(0, 200)}`)
    }
    return {
      body: Buffer.from(await pubRes.arrayBuffer()),
      contentType: pubRes.headers.get('content-type') || 'application/octet-stream',
    }
  }
  return {
    body: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get('content-type') || 'application/octet-stream',
  }
}

async function migrateBucket(client, bucket, paths) {
  let ok = 0
  let skipped = 0
  let failed = 0
  for (const path of paths) {
    if (await objectExists(client, bucket, path)) {
      skipped += 1
      continue
    }
    try {
      const file = await downloadFromSupabase(bucket, path)
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: path,
          Body: file.body,
          ContentType: file.contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      )
      ok += 1
      process.stdout.write(`✔ ${bucket}/${path}\n`)
    } catch (error) {
      failed += 1
      const message = error instanceof Error ? error.message : String(error)
      process.stderr.write(`✖ ${bucket}/${path} — ${message}\n`)
    }
  }
  return { ok, skipped, failed }
}

async function main() {
  const htmlFlag = process.argv.indexOf('--from-html')
  const csvFlag = process.argv.indexOf('--from-csv')
  const htmlUrl =
    htmlFlag >= 0
      ? process.argv[htmlFlag + 1] || 'https://viable.inventivelab.bd/'
      : null
  const csvPath =
    csvFlag >= 0
      ? process.argv[csvFlag + 1] || 'scripts/media-manifest.csv'
      : null

  const client = s3()
  /** @type {Map<string, string[]>} */
  const work = new Map(BUCKETS.map((b) => [b, []]))

  if (csvPath) {
    console.log(`Collecting paths from CSV: ${csvPath}`)
    const fromCsv = await listFromCsv(csvPath)
    for (const [bucket, set] of fromCsv) {
      work.set(bucket, [...set].sort())
      console.log(`  ${bucket}: ${set.size}`)
    }
  } else if (htmlUrl) {
    console.log(`Collecting paths from HTML: ${htmlUrl}`)
    const fromHtml = await listFromHtml(htmlUrl)
    for (const [bucket, set] of fromHtml) {
      work.set(bucket, [...set].sort())
    }
  } else {
    console.log('Listing paths from Supabase Storage API…')
    for (const bucket of BUCKETS) {
      const paths = await listFromSupabaseApi(bucket)
      work.set(bucket, paths.sort())
      console.log(`  ${bucket}: ${paths.length}`)
    }
  }

  let totalOk = 0
  let totalSkip = 0
  let totalFail = 0
  for (const bucket of BUCKETS) {
    const paths = work.get(bucket) || []
    console.log(`\nMigrating ${bucket} (${paths.length} objects)…`)
    const result = await migrateBucket(client, bucket, paths)
    totalOk += result.ok
    totalSkip += result.skipped
    totalFail += result.failed
  }

  console.log(
    `\nDone. uploaded=${totalOk} skipped=${totalSkip} failed=${totalFail}`,
  )
  if (totalFail > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
