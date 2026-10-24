const { version } = require('../../package.json')

module.exports = async function announce({ github, context, core }) {
  const webhook = process.env.DISCORD_RELEASE_WEBHOOK_URL
  if (!webhook) {
    core.warning('Add the DISCORD_RELEASE_WEBHOOK_URL repository secret to enable Discord announcements.')
    return
  }
  const tag = context.ref.startsWith('refs/tags/')
    ? context.ref.slice('refs/tags/'.length)
    : `v${version}`
  const { data: release } = await github.rest.repos.getReleaseByTag({ ...context.repo, tag })
  if (release.draft || release.prerelease) {
    core.info('Skipping draft or prerelease.')
    return
  }
  const assets = await github.paginate(github.rest.repos.listReleaseAssets, {
    ...context.repo, release_id: release.id, per_page: 100
  })
  const installer = assets.find(asset =>
    asset.name === `SlavonskaRavnica-Setup-${version}.exe` &&
    asset.state === 'uploaded' && asset.size > 0)
  if (!installer) throw new Error(`Uploaded Setup installer missing from ${tag}; no announcement sent.`)

  const logo = `https://raw.githubusercontent.com/${context.repo.owner}/${context.repo.repo}/${encodeURIComponent(tag)}/assets/icons/logo.png`
  const notes = (release.body || '').trim()
  const heading = `🚀 **SR Launcher — ažuriranje ${tag}**\n\n**Što je novo:**\n`
  const instructions = '\n\n**Već imaš launcher?**\nPokreni ga i prihvati ponuđeno ažuriranje.\n\n**Prva instalacija?**\nKlikni **Preuzmi launcher**, pokreni instalaciju i prijavi se putem Discorda. Launcher će automatski dohvatiti podatke servera.'
  const maxNotesLength = 2000 - heading.length - instructions.length
  const fullNotes = notes || 'Dostupna je nova verzija launchera. Preuzmi je putem gumba ispod.'
  const changelog = fullNotes.length > maxNotesLength
    ? `${fullNotes.slice(0, maxNotesLength - 1).replace(/[\uD800-\uDBFF]$/, '')}…`
    : fullNotes
  const payload = {
    username: 'Slavonska Ravnica',
    avatar_url: logo,
    allowed_mentions: { parse: [] },
    content: `${heading}${changelog}${instructions}`,
    flags: 4,
    components: [{ type: 1, components: [{
      type: 2, style: 5, label: 'Preuzmi launcher', url: installer.browser_download_url
    }] }]
  }
  const endpoint = new URL(webhook)
  if (endpoint.protocol !== 'https:' || endpoint.hostname !== 'discord.com' ||
      !endpoint.pathname.startsWith('/api/webhooks/')) {
    throw new Error('Invalid Discord webhook configuration.')
  }
  endpoint.searchParams.set('wait', 'true')
  endpoint.searchParams.set('with_components', 'true')
  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(20000)
    })
  } catch {
    throw new Error('Discord announcement request failed; check the channel before rerunning to avoid duplicates.')
  }
  if (!response.ok) throw new Error(`Discord announcement failed (HTTP ${response.status}).`)
  core.info(`Discord announcement sent for ${tag}: ${installer.name}`)
}
