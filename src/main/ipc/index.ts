import { registerAuthHandlers } from './auth.ipc'
import { registerServerHandlers } from './servers.ipc'
import { registerModHandlers } from './mods.ipc'
import { registerSettingsHandlers } from './settings.ipc'
import { registerDownloadHandlers } from './download.ipc'
import { registerUploadHandlers } from './upload.ipc'
import { registerAdminHandlers } from './admin.ipc'
import { registerLogHandlers } from './log.ipc'
import { registerWindowHandlers } from './window.ipc'
import { registerPanelHandlers } from './panel.ipc'
import { registerSowingTableHandlers } from './sowing-tables.ipc'

export function registerAllHandlers(): void {
  registerAuthHandlers()
  registerServerHandlers()
  registerModHandlers()
  registerSettingsHandlers()
  registerDownloadHandlers()
  registerUploadHandlers()
  registerAdminHandlers()
  registerLogHandlers()
  registerWindowHandlers()
  registerPanelHandlers()
  registerSowingTableHandlers()
}
