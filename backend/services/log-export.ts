import type { LogEntry } from '../../src/shared/types'

function luaString(value: string): string {
  return '"' + value.replace(/[\\"\x00-\x1f\x7f]/g, (char) => {
    if (char === '\\') return '\\\\'
    if (char === '"') return '\\"'
    return '\\' + char.charCodeAt(0).toString().padStart(3, '0')
  }) + '"'
}

export function logsToLua(logs: LogEntry[]): string {
  const rows = logs.map((entry) => {
    const fields = ['id', 'timestamp', 'level', 'category', 'message'] as const
    return '  {\n' + fields.map((key) => `    ${key} = ${luaString(entry[key])},`).join('\n') + '\n  },'
  })
  return '-- SR Launcher logs (oldest first; up to 500 recent entries)\nreturn {\n' + rows.join('\n') + '\n}\n'
}
