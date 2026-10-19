import axios, { type AxiosResponse } from 'axios'
import type { GameServer, FsPanelMod, FsPanelState } from '../../src/shared/types'
import { sanitizeHost } from './net-util'

type PanelAction = 'start' | 'stop' | 'restart'

interface HtmlInput {
  name: string
  value: string
  type: string
  id: string
  checked: boolean
  html: string
}

interface HtmlForm {
  name: string
  action: string
  method: string
  body: string
  inputs: HtmlInput[]
}

interface PanelSession {
  baseUrl: string
  cookie: string
}

/**
 * Controls the official GIANTS dedicated-server web interface. GIANTS does not
 * expose these mutations through its read-only Web API feed, so we authenticate
 * as a dedicated low-privilege web user and submit the same HTML forms as the UI.
 */
export class FsPanelService {
  async getState(server: GameServer): Promise<FsPanelState> {
    if (!this.isConfigured(server)) return { configured: false, status: 'unknown', mods: [] }

    const session = await this.login(server)
    const indexHtml = await this.get(session, '/index.html?lang=en')

    return {
      configured: true,
      status: this.readStatus(indexHtml),
      mods: this.readMods(indexHtml)
    }
  }

  async executeAction(server: GameServer, action: PanelAction): Promise<void> {
    const session = await this.login(server)
    const path = '/index.html?lang=en'
    const html = await this.get(session, path)
    const form = this.findActionForm(html, action)
    if (!form) throw new Error(`GIANTS panel nema dostupnu akciju: ${action}`)

    await this.submitForm(session, path, form, (input) => {
      if (input.type !== 'submit') {
        return !['checkbox', 'radio', 'option'].includes(input.type) || input.checked
      }
      return this.matchesAction(input, action)
    })

    if (action !== 'restart') {
      const expected = action === 'start' ? 'running' : 'stopped'
      for (let attempt = 0; attempt < 20; attempt++) {
        await sleep(1000)
        const nextHtml = await this.get(session, path)
        if (this.readStatus(nextHtml) === expected) return
      }
      throw new Error(action === 'start'
        ? 'GIANTS panel nije potvrdio pokretanje servera'
        : 'GIANTS panel nije potvrdio zaustavljanje servera')
    }
  }

  async saveActiveMods(server: GameServer, activeModIds: string[]): Promise<void> {
    const session = await this.login(server)
    const path = '/index.html?lang=en'
    const desired = new Set(activeModIds.map(decodeURIComponentSafe))

    let html = await this.get(session, path)
    if (this.readStatus(html) === 'running') throw new Error('Prvo zaustavi server pa spremi aktivne modove')

    const active = new Set(this.readMods(html).filter((mod) => mod.active).map((mod) => decodeURIComponentSafe(mod.id)))
    const deactivate = [...active].filter((filename) => !desired.has(filename))
    if (deactivate.length) {
      await this.submitModForm(session, path, html, 'ActiveMods', deactivate, /deactivate|disable|remove|deaktiv/i)
      html = await this.get(session, path)
    }

    const activeAfterRemoval = new Set(this.readMods(html).filter((mod) => mod.active).map((mod) => decodeURIComponentSafe(mod.id)))
    const activate = [...desired].filter((filename) => !activeAfterRemoval.has(filename))
    if (activate.length) {
      await this.submitModForm(session, path, html, 'InactiveMods', activate, /activate|enable|add|aktiv/i)
      html = await this.get(session, path)
    }

    const confirmed = new Set(this.readMods(html).filter((mod) => mod.active).map((mod) => decodeURIComponentSafe(mod.id)))
    const missing = [...desired].filter((filename) => !confirmed.has(filename))
    const extra = [...confirmed].filter((filename) => !desired.has(filename))
    if (missing.length || extra.length) throw new Error('GIANTS panel nije potvrdio promjenu aktivnih modova')
  }

  private async submitModForm(
    session: PanelSession,
    path: string,
    html: string,
    formName: 'ActiveMods' | 'InactiveMods',
    filenames: string[],
    buttonPattern: RegExp
  ): Promise<void> {
    const form = this.parseForms(html).find((candidate) => candidate.name === formName)
    if (!form) throw new Error('GIANTS panel nije vratio obrazac za aktivaciju modova')

    const wanted = new Set(filenames.map(normalizeFilename))
    // In the GIANTS panel the checkbox itself does not always contain the ZIP
    // filename. It can be held by the surrounding modSelection row instead.
    // Match against the row first, then fall back to checkbox attributes used by
    // older panel versions.
    const selectedInputs = new Set<HtmlInput>()
    for (const row of parseModRows(form.body)) {
      const filename = rowFilename(row)
      if (!filename || !wanted.has(normalizeFilename(filename))) continue
      const checkbox = form.inputs.find((input) => input.type === 'checkbox' && row.includes(input.html))
      if (checkbox) selectedInputs.add(checkbox)
    }
    for (const input of form.inputs) {
      if (input.type !== 'checkbox') continue
      if ([...inputFilenames(input)].some((filename) => wanted.has(normalizeFilename(filename)))) {
        selectedInputs.add(input)
      }
    }
    if (selectedInputs.size !== wanted.size) {
      throw new Error('GIANTS panel nije ponudio kontrole za odabrane modove; osvježi Panel i pokušaj ponovno')
    }

    const actionButton = form.inputs.find((input) =>
      input.type === 'submit' && buttonPattern.test(`${input.name} ${input.value}`)
    ) ?? form.inputs.find((input) => input.type === 'submit')
    if (!actionButton) throw new Error('GIANTS panel nije ponudio gumb za promjenu modova')

    await this.submitForm(session, path, form, (input) => {
      if (input.type === 'submit') return input === actionButton
      if (input.type === 'checkbox') return selectedInputs.has(input)
      if (input.type === 'radio' || input.type === 'option') return input.checked
      return true
    })
  }

  private isConfigured(server: GameServer): boolean {
    return !!(server.webAdminUsername?.trim() && server.webAdminPassword)
  }

  private baseUrl(server: GameServer): string {
    const host = server.ip || sanitizeHost(server.ftpHost)
    if (!host) throw new Error('IP adresa FS web panela nije konfigurirana')
    const port = Number(server.webStatsPort || 8080)
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Neispravan port FS web panela')
    return `http://${host}:${port}`
  }

  private async login(server: GameServer): Promise<PanelSession> {
    if (!this.isConfigured(server)) {
      throw new Error('Uredi server i unesi Panel korisnika i Panel lozinku')
    }

    const baseUrl = this.baseUrl(server)
    const body = new URLSearchParams({
      username: server.webAdminUsername?.trim() || '',
      password: server.webAdminPassword || '',
      login: 'Login'
    })
    const response = await axios.post<string>(`${baseUrl}/index.html?lang=en`, body.toString(), {
      timeout: 12000,
      responseType: 'text',
      transformResponse: [(data) => data],
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    const cookie = this.readCookie(response)
    if (!cookie) throw new Error('GIANTS panel nije prihvatio prijavu (nema session cookieja)')

    const session = { baseUrl, cookie }
    const html = response.status >= 300
      ? await this.get(session, response.headers.location || '/index.html?lang=en')
      : String(response.data)
    if (this.isLoginPage(html)) throw new Error('Neispravno korisničko ime ili lozinka GIANTS panela')
    return session
  }

  private readCookie(response: AxiosResponse): string {
    const cookies = response.headers['set-cookie']
    return Array.isArray(cookies) ? cookies.map((cookie) => cookie.split(';')[0]).join('; ') : ''
  }

  private async get(session: PanelSession, path: string): Promise<string> {
    const url = new URL(path, `${session.baseUrl}/`).toString()
    const response = await axios.get<string>(url, {
      timeout: 12000,
      responseType: 'text',
      transformResponse: [(data) => data],
      headers: { Cookie: session.cookie }
    })
    this.updateCookie(session, response)
    const html = String(response.data)
    if (this.isLoginPage(html)) throw new Error('GIANTS panel sesija je odbijena')
    return html
  }

  private async submitForm(
    session: PanelSession,
    currentPath: string,
    form: HtmlForm,
    include: (input: HtmlInput) => boolean
  ): Promise<void> {
    const body = new URLSearchParams()
    for (const input of form.inputs) {
      if (input.name && include(input)) body.append(input.name, input.value)
    }
    const target = new URL(form.action || currentPath, `${session.baseUrl}${currentPath}`).toString()
    const response = await axios.request<string>({
      method: form.method === 'get' ? 'GET' : 'POST',
      url: target,
      params: form.method === 'get' ? body : undefined,
      data: form.method === 'get' ? undefined : body.toString(),
      timeout: 15000,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        Cookie: session.cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: new URL(currentPath, `${session.baseUrl}/`).toString()
      }
    })
    this.updateCookie(session, response)
    if (response.status >= 400) throw new Error(`GIANTS panel je odbio zahtjev (${response.status})`)
  }

  private readStatus(html: string): FsPanelState['status'] {
    if (this.findActionForm(html, 'stop') || this.findActionForm(html, 'restart')) return 'running'
    if (this.findActionForm(html, 'start')) return 'stopped'
    return 'unknown'
  }

  private findActionForm(html: string, action: PanelAction): HtmlForm | undefined {
    return this.parseForms(html).find((form) => form.inputs.some((input) =>
      input.type === 'submit' && this.matchesAction(input, action)
    ))
  }

  private matchesAction(input: HtmlInput, action: PanelAction): boolean {
    const haystack = `${input.name} ${input.value}`.toLowerCase()
    const patterns: Record<PanelAction, RegExp> = {
      start: /\b(start|serverstart|pokreni|starten)\b/i,
      stop: /\b(stop|serverstop|zaustavi|stopp)\b/i,
      restart: /\b(restart|serverrestart|ponovno|neustart)\b/i
    }
    return patterns[action].test(haystack)
  }

  private readMods(html: string): FsPanelMod[] {
    const mods = new Map<string, FsPanelMod>()
    for (const form of this.parseForms(html)) {
      if (form.name !== 'ActiveMods' && form.name !== 'InactiveMods') continue
      for (const row of parseModRows(form.body)) {
        const filename = rowFilename(row)
        if (!filename) continue
        const id = encodeURIComponent(filename)
        mods.set(id, {
          id,
          name: rowField(row, 'Name') || filename,
          active: form.name === 'ActiveMods'
        })
      }
    }
    return [...mods.values()].sort((a, b) => a.name.localeCompare(b.name))
  }

  private parseForms(html: string): HtmlForm[] {
    const forms: HtmlForm[] = []
    for (const match of html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
      const formAttrs = match[1]
      const body = match[2]
      const inputs: HtmlInput[] = []
      for (const inputMatch of body.matchAll(/<input\b([^>]*)>/gi)) {
        const raw = inputMatch[0]
        inputs.push({
          name: decodeHtml(attr(raw, 'name') || ''),
          value: decodeHtml(attr(raw, 'value') || ''),
          type: (attr(raw, 'type') || 'text').toLowerCase(),
          id: decodeHtml(attr(raw, 'id') || ''),
          checked: /\bchecked(?:\s*=|\s|>)/i.test(raw),
          html: raw
        })
      }
      for (const buttonMatch of body.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
        const raw = buttonMatch[0]
        inputs.push({
          name: decodeHtml(attr(raw, 'name') || ''),
          value: decodeHtml(attr(raw, 'value') || stripHtml(buttonMatch[2])),
          type: (attr(raw, 'type') || 'submit').toLowerCase(),
          id: decodeHtml(attr(raw, 'id') || ''),
          checked: false,
          html: raw
        })
      }
      for (const selectMatch of body.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
        const selectHtml = selectMatch[0]
        const selectName = decodeHtml(attr(selectHtml, 'name') || '')
        const selectId = decodeHtml(attr(selectHtml, 'id') || '')
        const multiple = /\bmultiple(?:\s*=|\s|>)/i.test(selectHtml)
        const options = [...selectMatch[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)]
        const hasSelected = options.some((option) => /\bselected(?:\s*=|\s|>)/i.test(option[0]))
        options.forEach((option, index) => {
          const raw = option[0]
          inputs.push({
            name: selectName,
            value: decodeHtml(attr(raw, 'value') || stripHtml(option[2])),
            type: 'option',
            id: `${selectId}:${index}`,
            checked: /\bselected(?:\s*=|\s|>)/i.test(raw) || (!multiple && !hasSelected && index === 0),
            html: raw
          })
        })
      }
      for (const textareaMatch of body.matchAll(/<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/gi)) {
        const raw = textareaMatch[0]
        inputs.push({
          name: decodeHtml(attr(raw, 'name') || ''),
          value: decodeHtml(textareaMatch[2]),
          type: 'textarea',
          id: decodeHtml(attr(raw, 'id') || ''),
          checked: false,
          html: raw
        })
      }
      forms.push({
        name: decodeHtml(attr(formAttrs, 'name') || ''),
        action: decodeHtml(attr(formAttrs, 'action') || ''),
        method: (attr(formAttrs, 'method') || 'get').toLowerCase(),
        body,
        inputs
      })
    }
    return forms
  }

  private isLoginPage(html: string): boolean {
    return /<input\b[^>]*name=["']username["']/i.test(html) && /<input\b[^>]*name=["']password["']/i.test(html)
  }

  private updateCookie(session: PanelSession, response: AxiosResponse): void {
    const fresh = this.readCookie(response)
    if (!fresh) return
    const values = new Map<string, string>()
    for (const pair of `${session.cookie}; ${fresh}`.split(';')) {
      const trimmed = pair.trim()
      const separator = trimmed.indexOf('=')
      if (separator > 0) values.set(trimmed.slice(0, separator), trimmed.slice(separator + 1))
    }
    session.cookie = [...values].map(([name, value]) => `${name}=${value}`).join('; ')
  }
}

function attr(html: string, name: string): string | undefined {
  return html.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1]
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function stripHtml(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

export const fsPanelService = new FsPanelService()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseModRows(formBody: string): string[] {
  const starts = [...formBody.matchAll(/<div\b[^>]*class=["'][^"']*\bmodSelection-(?:active|inactive)\b[^"']*["'][^>]*>/gi)]
  return starts.map((match, index) => formBody.slice(
    match.index,
    index + 1 < starts.length ? starts[index + 1].index : formBody.length
  ))
}

function rowField(row: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = row.match(new RegExp(
    `<div\\b[^>]*>\\s*${escaped}\\s*<\\/div>\\s*<div\\b[^>]*>([\\s\\S]*?)<\\/div>`,
    'i'
  ))
  return match ? stripHtml(match[1]).replace(/\.{3}$/, '').trim() : ''
}

function rowFilename(row: string): string {
  const openingTag = row.match(/^<div\b[^>]*>/i)?.[0] || ''
  const exactId = decodeHtml(attr(openingTag, 'id') || '')
  if (/\.(?:zip|dlc)$/i.test(exactId)) return exactId
  const checkbox = row.match(/<input\b[^>]*type=["']checkbox["'][^>]*>/i)?.[0] || ''
  for (const candidate of [attr(checkbox, 'value'), attr(checkbox, 'id'), attr(checkbox, 'name')]) {
    const value = decodeHtml(candidate || '')
    if (/\.(?:zip|dlc)$/i.test(value)) return value
  }
  return rowField(row, 'Filename')
}

function inputFilenames(input: HtmlInput): Set<string> {
  const values = [input.name, input.value, input.id].map(decodeURIComponentSafe)
  return new Set(values.filter((value) => /\.(?:zip|dlc)$/i.test(value)))
}

function normalizeFilename(value: string): string {
  return value.trim().toLowerCase()
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
