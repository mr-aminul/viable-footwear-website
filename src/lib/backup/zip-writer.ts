import { createReadStream, createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { deflateRawSync } from 'node:zlib'
import { once } from 'node:events'
import path from 'node:path'
import os from 'node:os'
import { randomBytes } from 'node:crypto'

/** CRC-32 (ISO 3309) — used by the ZIP format. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

export function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

type ZipEntry = {
  name: string
  offset: number
  method: 0 | 8
  crc: number
  compressedSize: number
  uncompressedSize: number
}

function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear())
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date:
      ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

function u16(n: number): Buffer {
  const b = Buffer.alloc(2)
  b.writeUInt16LE(n >>> 0, 0)
  return b
}

function u32(n: number): Buffer {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n >>> 0, 0)
  return b
}

/**
 * Streams a ZIP to a temp file (local headers first, central directory last).
 * Keeps large media off the Node heap as much as practical.
 */
export class ZipFileWriter {
  readonly filePath: string
  private stream: ReturnType<typeof createWriteStream>
  private offset = 0
  private entries: ZipEntry[] = []
  private closed = false
  private readonly stamp: { time: number; date: number }

  private constructor(filePath: string) {
    this.filePath = filePath
    this.stream = createWriteStream(filePath)
    this.stamp = dosDateTime(new Date())
  }

  static async create(prefix = 'viable-backup'): Promise<ZipFileWriter> {
    const filePath = path.join(
      os.tmpdir(),
      `${prefix}-${Date.now()}-${randomBytes(4).toString('hex')}.zip`,
    )
    return new ZipFileWriter(filePath)
  }

  private async write(chunk: Buffer): Promise<void> {
    if (this.closed) throw new Error('ZIP writer is closed.')
    if (!this.stream.write(chunk)) {
      await once(this.stream, 'drain')
    }
    this.offset += chunk.length
  }

  /** Add a file from an in-memory buffer (JSON dumps, media objects). */
  async addBuffer(entryName: string, data: Buffer): Promise<void> {
    const name = safeZipPath(entryName)
    const nameBuf = Buffer.from(name, 'utf8')
    const crc = crc32(data)
    // Skip deflate for large/already-compressed media — saves CPU and RAM.
    const skipDeflate = data.length > 256 * 1024
    let method: 0 | 8 = 0
    let payload = data
    if (!skipDeflate) {
      const compressed = deflateRawSync(data, { level: 6 })
      if (compressed.length < data.length) {
        method = 8
        payload = compressed
      }
    }

    const localOffset = this.offset
    await this.write(u32(0x04034b50))
    await this.write(u16(20))
    await this.write(u16(0))
    await this.write(u16(method))
    await this.write(u16(this.stamp.time))
    await this.write(u16(this.stamp.date))
    await this.write(u32(crc))
    await this.write(u32(payload.length))
    await this.write(u32(data.length))
    await this.write(u16(nameBuf.length))
    await this.write(u16(0))
    await this.write(nameBuf)
    await this.write(payload)

    this.entries.push({
      name,
      offset: localOffset,
      method,
      crc,
      compressedSize: payload.length,
      uncompressedSize: data.length,
    })
  }

  /** Add UTF-8 text as a file. */
  async addText(entryName: string, text: string): Promise<void> {
    await this.addBuffer(entryName, Buffer.from(text, 'utf8'))
  }

  async finalize(): Promise<void> {
    if (this.closed) return
    const centralStart = this.offset

    for (const entry of this.entries) {
      const nameBuf = Buffer.from(entry.name, 'utf8')
      await this.write(u32(0x02014b50))
      await this.write(u16(20))
      await this.write(u16(20))
      await this.write(u16(0))
      await this.write(u16(entry.method))
      await this.write(u16(this.stamp.time))
      await this.write(u16(this.stamp.date))
      await this.write(u32(entry.crc))
      await this.write(u32(entry.compressedSize))
      await this.write(u32(entry.uncompressedSize))
      await this.write(u16(nameBuf.length))
      await this.write(u16(0))
      await this.write(u16(0))
      await this.write(u16(0))
      await this.write(u16(0))
      await this.write(u32(0))
      await this.write(u32(entry.offset))
      await this.write(nameBuf)
    }

    const centralSize = this.offset - centralStart
    await this.write(u32(0x06054b50))
    await this.write(u16(0))
    await this.write(u16(0))
    await this.write(u16(this.entries.length))
    await this.write(u16(this.entries.length))
    await this.write(u32(centralSize))
    await this.write(u32(centralStart))
    await this.write(u16(0))

    this.closed = true
    this.stream.end()
    await once(this.stream, 'finish')
  }

  async cleanup(): Promise<void> {
    try {
      if (!this.closed) {
        this.stream.destroy()
        this.closed = true
      }
      await unlink(this.filePath)
    } catch {
      // Temp cleanup is best-effort.
    }
  }
}

/** Read a finished zip for HTTP streaming. */
export function openZipReadStream(filePath: string) {
  return createReadStream(filePath)
}

/** Keep zip entry paths inside the archive root (no `..` escapes). */
export function safeZipPath(...parts: string[]): string {
  return parts
    .join('/')
    .replace(/\\/g, '/')
    .split('/')
    .filter((p) => p && p !== '.' && p !== '..')
    .join('/')
}
