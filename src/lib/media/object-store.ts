import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

export type ObjectStoreUploadInput = {
  bucket: string
  path: string
  body: Buffer
  contentType: string
  cacheControl?: string
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is not configured.`)
  }
  return value
}

/** True when VPS MinIO credentials are present (preferred media origin). */
export function isObjectStoreConfigured(): boolean {
  return Boolean(
    process.env.MEDIA_S3_ENDPOINT?.trim() &&
      process.env.MEDIA_S3_ACCESS_KEY?.trim() &&
      process.env.MEDIA_S3_SECRET_KEY?.trim(),
  )
}

/** Public base for object URLs, e.g. https://s3.storage.inventivelab.bd */
export function mediaPublicBaseUrl(): string | null {
  const explicit = process.env.MEDIA_PUBLIC_BASE_URL?.replace(/\/$/, '')
  if (explicit) return explicit
  const endpoint = process.env.MEDIA_S3_ENDPOINT?.replace(/\/$/, '')
  return endpoint || null
}

let cachedClient: S3Client | null = null

function s3Client(): S3Client {
  if (cachedClient) return cachedClient
  cachedClient = new S3Client({
    region: process.env.MEDIA_S3_REGION?.trim() || 'us-east-1',
    endpoint: requiredEnv('MEDIA_S3_ENDPOINT'),
    forcePathStyle: process.env.MEDIA_S3_FORCE_PATH_STYLE !== 'false',
    credentials: {
      accessKeyId: requiredEnv('MEDIA_S3_ACCESS_KEY'),
      secretAccessKey: requiredEnv('MEDIA_S3_SECRET_KEY'),
    },
  })
  return cachedClient
}

/** Upload bytes to MinIO (or compatible S3). */
export async function uploadObject(
  input: ObjectStoreUploadInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.path.replace(/^\/+/, ''),
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: input.cacheControl ?? 'public, max-age=31536000, immutable',
      }),
    )
    return { ok: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Object upload failed.'
    return { ok: false, error: message }
  }
}

/** Delete one object. Missing keys are ignored. */
export async function deleteObject(
  bucket: string,
  path: string,
): Promise<void> {
  const key = path.replace(/^\/+/, '')
  if (!key || key.startsWith('http') || key.startsWith('/')) return
  try {
    await s3Client().send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    )
  } catch {
    // Best-effort — DB row may already be gone.
  }
}

/** Delete many objects in one bucket (chunks of 1000). */
export async function deleteObjects(
  bucket: string,
  paths: string[],
): Promise<void> {
  const keys = paths
    .map((path) => path.replace(/^\/+/, ''))
    .filter((key) => key && !key.startsWith('http') && !key.startsWith('/'))
  if (keys.length === 0) return

  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000)
    try {
      await s3Client().send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: chunk.map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
      )
    } catch {
      // Best-effort cleanup.
    }
  }
}
