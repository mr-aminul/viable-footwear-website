import { createReadStream, statSync } from 'node:fs'
import { Readable } from 'node:stream'
import { getStaffSession } from '@/lib/auth/session'
import { createShopBackupZip } from '@/lib/backup/create-backup'

export const dynamic = 'force-dynamic'
/** Allow long builds when media volume is large (Node / self-hosted). */
export const maxDuration = 300

export async function GET() {
  const session = await getStaffSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.profile.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 })
  }

  let cleanup: (() => Promise<void>) | null = null

  try {
    const backup = await createShopBackupZip()
    cleanup = backup.cleanup
    const size = statSync(backup.filePath).size
    const nodeStream = createReadStream(backup.filePath)

    nodeStream.on('close', () => {
      void backup.cleanup()
    })
    nodeStream.on('error', () => {
      void backup.cleanup()
    })

    const webStream = Readable.toWeb(nodeStream) as ReadableStream

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': String(size),
        'Content-Disposition': `attachment; filename="${backup.filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (cleanup) await cleanup()
    const message =
      error instanceof Error ? error.message : 'Backup failed.'
    console.error('[admin/backup]', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
