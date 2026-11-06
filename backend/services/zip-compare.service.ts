import axios from 'axios'
import { Readable } from 'stream'
import yauzl from 'yauzl'

// Only ZIP directory metadata is fetched, never the complete mod payload.
const BLOCK = 256 * 1024
const LIMIT = 8 * 1024 * 1024

async function readRange(url: string, range: string): Promise<{ data: Buffer; start: number; total: number }> {
  const response = await axios.get(url, {
    headers: { Range: range, 'Accept-Encoding': 'identity' },
    responseType: 'stream', timeout: 10000, decompress: false,
    validateStatus: () => true
  })
  const stream = response.data as Readable
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(String(response.headers['content-range'] || ''))
  if (response.status !== 206 || !match) {
    stream.destroy()
    throw new Error('Server ne podržava djelomičnu provjeru ZIP-a')
  }
  const [start, end, total] = match.slice(1).map(Number)
  if (![start, end, total].every(Number.isSafeInteger) || start > end || end >= total || end - start + 1 > BLOCK) {
    stream.destroy()
    throw new Error('Neispravan raspon ZIP-a')
  }
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of stream) {
    const buffer = Buffer.from(chunk)
    size += buffer.length
    if (size > end - start + 1) {
      stream.destroy()
      throw new Error('Prevelik odgovor za provjeru ZIP-a')
    }
    chunks.push(buffer)
  }
  if (size !== end - start + 1) throw new Error('Nepotpun odgovor za provjeru ZIP-a')
  return { data: Buffer.concat(chunks), start, total }
}

class HttpZipReader extends yauzl.RandomAccessReader {
  private blocks: Array<{ start: number; data: Buffer }>
  private transferred: number
  constructor(private url: string, private total: number, tail: { start: number; data: Buffer }) {
    super()
    this.blocks = [tail]
    this.transferred = tail.data.length
  }

  _readStreamForRange(start: number, end: number): Readable {
    const self = this
    return Readable.from((async function* () {
      let block = self.blocks.find((item) => item.start <= start && item.start + item.data.length >= end)
      if (!block) {
        if (end - start > BLOCK || self.transferred + BLOCK > LIMIT) throw new Error('ZIP direktorij je prevelik za brzu provjeru')
        const stop = Math.min(self.total, Math.max(end, start + BLOCK))
        const result = await readRange(self.url, `bytes=${start}-${stop - 1}`)
        if (result.start !== start || result.total !== self.total || result.data.length !== stop - start) {
          throw new Error('ZIP se promijenio tijekom provjere')
        }
        block = result
        self.blocks.push(block)
        self.transferred += block.data.length
      }
      yield block.data.subarray(start - block.start, end - block.start)
    })())
  }
}

function manifest(zip: yauzl.ZipFile): Promise<string> {
  return new Promise((resolve, reject) => {
    const entries: string[] = []
    const names = new Set<string>()
    zip.on('error', (err) => { zip.close(); reject(err) })
    zip.on('entry', (entry: yauzl.Entry) => {
      if (!entry.fileName.endsWith('/')) {
        if (names.has(entry.fileName) || entry.isEncrypted()) {
          zip.close()
          reject(new Error('Nepodržan ZIP sadržaj'))
          return
        }
        names.add(entry.fileName)
        entries.push(JSON.stringify([entry.fileName, entry.uncompressedSize, entry.crc32]))
      }
      zip.readEntry()
    })
    zip.on('end', () => {
      zip.close()
      if (!entries.length) reject(new Error('Prazan ZIP'))
      else resolve(entries.sort().join('\n'))
    })
    zip.readEntry()
  })
}

export async function compareRemoteZip(url: string, localPath: string): Promise<boolean> {
  const tail = await readRange(url, 'bytes=-65577')
  if (tail.start + tail.data.length !== tail.total) throw new Error('Neispravan kraj ZIP-a')
  const remoteZip = await new Promise<yauzl.ZipFile>((resolve, reject) => {
    yauzl.fromRandomAccessReader(new HttpZipReader(url, tail.total, tail), tail.total,
      { lazyEntries: true }, (err, zip) => err ? reject(err) : resolve(zip))
  })
  const remote = await manifest(remoteZip)
  const localZip = await new Promise<yauzl.ZipFile>((resolve, reject) => {
    yauzl.open(localPath, { lazyEntries: true }, (err, zip) => err ? reject(err) : resolve(zip))
  })
  return remote === await manifest(localZip)
}
