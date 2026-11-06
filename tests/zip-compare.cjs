const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const http = require('node:http')
const vm = require('node:vm')
const ts = require('typescript')

const exported = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('backend/services/zip-compare.service.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText, { exports: exported, require, Buffer })

function zip(content) {
  const name = Buffer.from('modDesc.xml')
  let crc = 0xffffffff
  for (const byte of content) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  crc = (crc ^ 0xffffffff) >>> 0
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50)
  local.writeUInt16LE(20, 4)
  local.writeUInt32LE(crc, 14)
  local.writeUInt32LE(content.length, 18)
  local.writeUInt32LE(content.length, 22)
  local.writeUInt16LE(name.length, 26)
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50)
  central.writeUInt16LE(20, 4)
  central.writeUInt16LE(20, 6)
  central.writeUInt32LE(crc, 16)
  central.writeUInt32LE(content.length, 20)
  central.writeUInt32LE(content.length, 24)
  central.writeUInt16LE(name.length, 28)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50)
  end.writeUInt16LE(1, 8)
  end.writeUInt16LE(1, 10)
  end.writeUInt32LE(central.length + name.length, 12)
  end.writeUInt32LE(local.length + name.length + content.length, 16)
  return Buffer.concat([local, name, content, central, name, end])
}

test('compares existing mods using ranges, detects same-size changes, and rejects unavailable verification', async () => {
  let archive = zip(Buffer.alloc(1024 * 1024, 65))
  let mode = 'range'
  let bytes = 0
  const server = http.createServer((req, res) => {
    if (mode === 'unsupported') { res.writeHead(200); res.end(archive); return }
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '')
    assert.ok(range)
    const start = range[1] ? Number(range[1]) : Math.max(0, archive.length - Number(range[2]))
    const end = range[1] ? Math.min(Number(range[2]), archive.length - 1) : archive.length - 1
    const data = archive.subarray(start, end + 1)
    bytes += data.length
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${archive.length}`, 'Content-Length': data.length })
    res.end(data)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-zip-test-'))
  const local = path.join(directory, 'mod.zip')
  const url = `http://127.0.0.1:${server.address().port}/mod.zip`
  try {
    fs.writeFileSync(local, archive)
    assert.equal(await exported.compareRemoteZip(url, local), true)
    assert.ok(bytes < archive.length / 10, `Downloaded ${bytes} of ${archive.length} bytes`)
    // A maximum-length ZIP comment forces a separate directory range read.
    archive.writeUInt16LE(65535, archive.length - 2)
    archive = Buffer.concat([archive, Buffer.alloc(65535, 32)])
    assert.equal(await exported.compareRemoteZip(url, local), true)
    fs.writeFileSync(local, zip(Buffer.alloc(1024 * 1024, 66)))
    assert.equal(await exported.compareRemoteZip(url, local), false)
    fs.writeFileSync(local, 'invalid zip')
    await assert.rejects(exported.compareRemoteZip(url, local))
    mode = 'unsupported'
    await assert.rejects(exported.compareRemoteZip(url, local), /djelomičnu/)
  } finally {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
    fs.unlinkSync(local)
    fs.rmdirSync(directory)
  }
})
