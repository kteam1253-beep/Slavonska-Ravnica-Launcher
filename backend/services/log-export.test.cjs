const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { stripTypeScriptTypes } = require('node:module')
const source = readFileSync(require.resolve('./log-export.ts'), 'utf8')
const js = stripTypeScriptTypes(source).replace('export function', 'function')
const logsToLua = new Function(`${js}; return logsToLua;`)()

test('Lua export escapes text without allowing log content to become code', () => {
  const message = 'quote" slash\\ newline\n\r\t\0' + '123 čćž ]]'
  const result = logsToLua([{ id: '1', timestamp: 'now', level: 'info', category: 'TEST', message }])
  assert.ok(result.includes('message = "quote\\" slash\\\\ newline\\010\\013\\009\\000123 čćž ]]",'))
  assert.ok(result.includes('return {'))
  assert.ok(logsToLua([]).endsWith('return {\n\n}\n'))
})
