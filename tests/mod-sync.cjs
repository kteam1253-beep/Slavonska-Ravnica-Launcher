const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function fixture(compare = async () => true) {
  const receipts = new Map()
  const database = {
    getDb: () => ({ prepare: () => ({
      get: (server, file) => ({ known_hash: receipts.get(`${server}/${file}`) }),
      run: (server, file, hash) => receipts.set(`${server}/${file}`, hash)
    }) }),
    generateId: () => 'new-id'
  }
  const source = fs.readFileSync('backend/services/mod-sync.service.ts', 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true
  } }).outputText
  const exports = {}
  vm.runInNewContext(compiled, { exports, Buffer, require: (name) => {
    if (name.includes('database/database')) return database
    if (name === './zip-compare.service') return { compareRemoteZip: compare }
    if (name === './log.service') return { logService: { info() {}, warning() {} } }
    if (name.startsWith('./') || name === 'yauzl') return {}
    return require(name)
  } })
  const service = new exports.ModSyncService()
  service.calculateHash = async () => 'local-content'
  const server = { fileName: 'Mod.zip', hash: 'opaque-server-hash', version: '1.0.0', size: 0 }
  const local = { fileName: 'Mod.zip', path: 'Mod.zip', version: '1.0.0', size: 100 }
  return { service, server, local, receipts }
}

test('matching version and legacy hash do not falsely confirm an opaque hash', async () => {
  const { service, server, local, receipts } = fixture()
  receipts.set('server/mod.zip', server.hash)
  assert.equal(await service.getUpdateStatus('server', server, local), 'UPDATE')
  assert.equal(receipts.get('server/mod.zip'), server.hash)
})

test('existing matching ZIP is confirmed without downloading the mod', async () => {
  let calls = 0
  const { service, server, local } = fixture(async () => { calls++; return true })
  server.path = 'https://example.invalid/mod.zip'
  assert.equal(await service.getUpdateStatus('server', server, local), 'OK')
  assert.equal(await service.getUpdateStatus('server', server, local), 'OK')
  assert.equal(calls, 1)
})

test('different ZIP needs an update, unavailable verification does not', async () => {
  const different = fixture(async () => false)
  different.server.path = 'https://example.invalid/mod.zip'
  assert.equal(await different.service.getUpdateStatus('server', different.server, different.local), 'UPDATE')
  const unavailable = fixture(async () => { throw new Error('Range unsupported') })
  unavailable.server.path = 'https://example.invalid/mod.zip'
  assert.equal(await unavailable.service.getUpdateStatus('server', unavailable.server, unavailable.local), 'GREŠKA')
  assert.equal(unavailable.receipts.size, 0)
})

test('download receipt accepts installed content and detects server or local changes', async () => {
  const { service, server, local } = fixture()
  await service.recordDownloadedMod('server', server.fileName, server.hash, local.path)
  assert.equal(await service.getUpdateStatus('server', server, local), 'OK')
  assert.equal(await service.getUpdateStatus('server', { ...server, hash: 'new-content' }, local), 'UPDATE')
  service.calculateHash = async () => 'modified-local-content'
  assert.equal(await service.getUpdateStatus('server', server, local), 'UPDATE')
})

test('sync retains IDs used by downloads and recognizes missing files', async () => {
  const { service, server, local } = fixture()
  service.getModsFromDb = () => [{ fileName: server.fileName, id: 'queued-mod-id' }]
  const missing = await service.compareMods('server', [server], [], '.')
  assert.equal(missing[0].id, 'queued-mod-id')
  assert.equal(missing[0].status, 'FALI')
  const present = await service.compareMods('server', [server], [local], '.')
  assert.equal(present[0].id, 'queued-mod-id')
  assert.equal(present[0].status, 'UPDATE')
})
