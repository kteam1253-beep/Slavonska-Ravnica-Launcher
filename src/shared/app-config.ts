// ============================================================
// Distribution config
// ------------------------------------------------------------
// Set BACKEND_URL to your deployed auth/config backend (no trailing slash) to enable
// zero-config distribution: players just install and log in, no secrets in the app.
//
//   export const BACKEND_URL = 'https://slavonska-ravnica-launcher-production.up.railway.app'
//
// Leave it empty ('') to use the LOCAL Discord configuration instead
// (Settings > Discord) — useful for the admin/dev machine.
// ============================================================

export const BACKEND_URL = 'https://slavonska-ravnica-launcher-production.up.railway.app'

export const isBackendMode = (): boolean => BACKEND_URL.trim().length > 0
