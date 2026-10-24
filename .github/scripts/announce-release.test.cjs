const assert = require('node:assert/strict')
const { test } = require('node:test')
const announce = require('./announce-release.cjs')
const { version } = require('../../package.json')

test('announcement selects the uploaded installer and skips unavailable releases', async () => {
  const oldFetch = global.fetch
  const oldWebhook = process.env.DISCORD_RELEASE_WEBHOOK_URL
  const sent = []
  process.env.DISCORD_RELEASE_WEBHOOK_URL = 'https://discord.com/api/webhooks/test/test'
  global.fetch = async (url, options) => {
    assert.equal(url.searchParams.get('with_components'), 'true')
    sent.push(JSON.parse(options.body))
    return { ok: true }
  }
  const release = { id: 1, draft: false, prerelease: false, body: 'Ispravci' }
  let assets = [
    { name: 'portable.exe', state: 'uploaded', size: 10 },
    { name: `SlavonskaRavnica-Setup-${version}.exe`, state: 'uploaded', size: 10,
      browser_download_url: 'https://example.com/setup.exe' }
  ]
  const args = {
    github: {
      rest: { repos: { getReleaseByTag: async () => ({ data: release }), listReleaseAssets() {} } },
      paginate: async () => assets
    },
    context: { ref: `refs/tags/v${version}`, repo: { owner: 'test', repo: 'test' } },
    core: { info() {}, warning() {} }
  }
  try {
    await announce(args)
    assert.equal(sent[0].components[0].components[0].url, 'https://example.com/setup.exe')
    assert.deepEqual(sent[0].allowed_mentions.parse, [])
    assert.equal(sent[0].embeds, undefined)
    assert.ok(sent[0].content.includes('Ispravci'))
    release.body = 'Duga bilješka. '.repeat(500)
    await announce(args)
    assert.ok(sent[1].content.length <= 2000)
    assert.ok(sent[1].content.endsWith('podatke servera.'))
    assets = []
    await assert.rejects(() => announce(args), /installer missing/)
    release.prerelease = true
    await announce(args)
    delete process.env.DISCORD_RELEASE_WEBHOOK_URL
    await announce(args)
    assert.equal(sent.length, 2)
  } finally {
    global.fetch = oldFetch
    if (oldWebhook === undefined) delete process.env.DISCORD_RELEASE_WEBHOOK_URL
    else process.env.DISCORD_RELEASE_WEBHOOK_URL = oldWebhook
  }
})
