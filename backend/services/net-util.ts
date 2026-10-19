/**
 * Sanitizes a host field that may contain a full URL like
 * "ftp://user:pass@176.57.169.250:50561" or "sftp://host/path".
 * Returns just the hostname/IP (e.g. "176.57.169.250").
 */
export function sanitizeHost(input?: string): string {
  if (!input) return ''
  let h = input.trim()
  // strip protocol (ftp://, sftp://, etc.)
  h = h.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
  // strip credentials (user:pass@)
  const atIdx = h.lastIndexOf('@')
  if (atIdx !== -1) h = h.slice(atIdx + 1)
  // strip path
  h = h.split('/')[0]
  // strip port suffix
  h = h.split(':')[0]
  return h.trim()
}

/**
 * Resolves the best host to use for a connection: a sanitized custom host,
 * falling back to the server's main IP.
 */
export function resolveHost(customHost: string | undefined, fallbackIp: string): string {
  const clean = sanitizeHost(customHost)
  return clean || fallbackIp
}
