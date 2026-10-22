import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import {
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_VIDEO_BUCKET,
} from '@/lib/catalog/constants'
import { createServiceClient } from '@/lib/db/admin'
import type { Database } from '@/lib/db/database.types'
import {
  getObjectBuffer,
  isObjectStoreConfigured,
  listObjectKeys,
} from '@/lib/media/object-store'
import { SITE_MEDIA_BUCKET } from '@/lib/website/constants'
import { ZipFileWriter, safeZipPath } from '@/lib/backup/zip-writer'

export const BACKUP_TABLES = [
  'profiles',
  'categories',
  'products',
  'product_media',
  'product_variants',
  'campaigns',
  'promo_codes',
  'integration_settings',
  'site_pages',
  'site_daily_visitors',
  'orders',
  'order_items',
  'payment_attempts',
] as const satisfies ReadonlyArray<keyof Database['public']['Tables']>

export const BACKUP_BUCKETS = [
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_VIDEO_BUCKET,
  SITE_MEDIA_BUCKET,
] as const

const PAGE_SIZE = 1000

export type BackupManifest = {
  createdAt: string
  rootFolder: string
  tables: Record<string, number>
  buckets: Record<string, { files: number; errors: string[] }>
  publicImages: { files: number; errors: string[] }
  notes: string[]
}

async function exportTableRows(
  table: (typeof BACKUP_TABLES)[number],
): Promise<unknown[]> {
  const db = createServiceClient()
  const rows: unknown[] = []
  let from = 0

  for (;;) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await db
      .from(table)
      .select('*')
      .range(from, to)

    if (error) {
      throw new Error(`Failed to export table "${table}": ${error.message}`)
    }

    const batch = (data ?? []) as unknown[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

async function walkPublicImages(
  dir: string,
  baseDir: string,
): Promise<string[]> {
  const out: string[] = []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await walkPublicImages(full, baseDir)))
      continue
    }
    if (!entry.isFile()) continue
    out.push(path.relative(baseDir, full))
  }
  return out
}

/**
 * Build a dated zip: database JSON + object storage + public/images.
 * Returns the temp zip path; caller must stream then cleanup.
 */
export async function createShopBackupZip(): Promise<{
  filePath: string
  filename: string
  manifest: BackupManifest
  cleanup: () => Promise<void>
}> {
  const createdAt = new Date()
  const stamp = createdAt.toISOString().slice(0, 10)
  const rootFolder = `Viable-Backup-${stamp}`
  const filename = `viable-backup-${stamp}.zip`

  const zip = await ZipFileWriter.create('viable-backup')
  const notes: string[] = []
  const tables: Record<string, number> = {}
  const buckets: BackupManifest['buckets'] = {}
  const publicImages: BackupManifest['publicImages'] = {
    files: 0,
    errors: [],
  }

  try {
    for (const table of BACKUP_TABLES) {
      const rows = await exportTableRows(table)
      tables[table] = rows.length
      await zip.addText(
        safeZipPath(rootFolder, 'database', `${table}.json`),
        JSON.stringify(rows, null, 2),
      )
    }

    if (isObjectStoreConfigured()) {
      for (const bucket of BACKUP_BUCKETS) {
        const bucketErrors: string[] = []
        let fileCount = 0
        let keys: string[] = []
        try {
          keys = await listObjectKeys(bucket)
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'List failed'
          bucketErrors.push(message)
          notes.push(`Could not list bucket "${bucket}": ${message}`)
          buckets[bucket] = { files: 0, errors: bucketErrors }
          continue
        }

        for (const key of keys) {
          try {
            const body = await getObjectBuffer(bucket, key)
            await zip.addBuffer(
              safeZipPath(rootFolder, 'object-storage', bucket, key),
              body,
            )
            fileCount += 1
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Download failed'
            bucketErrors.push(`${key}: ${message}`)
          }
        }
        buckets[bucket] = { files: fileCount, errors: bucketErrors }
      }
    } else {
      notes.push(
        'Object storage credentials are not configured — media buckets skipped.',
      )
      for (const bucket of BACKUP_BUCKETS) {
        buckets[bucket] = { files: 0, errors: ['not configured'] }
      }
    }

    const publicRoot = path.join(process.cwd(), 'public', 'images')
    const relFiles = await walkPublicImages(publicRoot, publicRoot)
    for (const rel of relFiles) {
      try {
        const full = path.join(publicRoot, rel)
        const info = await stat(full)
        if (!info.isFile()) continue
        const body = await readFile(full)
        await zip.addBuffer(
          safeZipPath(rootFolder, 'public-images', rel),
          body,
        )
        publicImages.files += 1
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Read failed'
        publicImages.errors.push(`${rel}: ${message}`)
      }
    }

    const manifest: BackupManifest = {
      createdAt: createdAt.toISOString(),
      rootFolder,
      tables,
      buckets,
      publicImages,
      notes,
    }

    await zip.addText(
      safeZipPath(rootFolder, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
    )

    await zip.addText(
      safeZipPath(rootFolder, 'README.txt'),
      [
        'Viable Footwear — shop backup',
        '',
        `Created: ${manifest.createdAt}`,
        '',
        'Folders:',
        '  database/         — every table as JSON',
        '  object-storage/   — product + site media from MinIO',
        '  public-images/    — files from public/images',
        '',
        'This zip may contain payment keys and customer data.',
        'Keep it private. Do not email it or upload it publicly.',
        '',
        'Not included (keep separately):',
        '  - Website source code (GitHub)',
        '  - Server .env secret file',
        '  - Domain registrar login',
        '',
        notes.length ? `Notes:\n${notes.map((n) => `  - ${n}`).join('\n')}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )

    await zip.finalize()

    return {
      filePath: zip.filePath,
      filename,
      manifest,
      cleanup: () => zip.cleanup(),
    }
  } catch (error) {
    await zip.cleanup()
    throw error
  }
}
