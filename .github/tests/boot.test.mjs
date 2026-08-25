import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { ROOT, localeFiles } from './lib/site.mjs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 8901
const CDP = 9333
const available = existsSync(CHROME)
let server, browser

const wait = ms => new Promise(r => setTimeout(r, ms))

before(async () => {
  if (!available) return
  server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'],
    { cwd: ROOT, stdio: 'ignore' })
  browser = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox',
    `--remote-debugging-port=${CDP}`, '--user-data-dir=/tmp/dws-boot-profile', 'about:blank'],
    { stdio: 'ignore' })
  await wait(3500)
})

after(() => { server?.kill(); browser?.kill() })

async function render(path, code) {
  const tab = await (await fetch(`http://127.0.0.1:${CDP}/json/new?${encodeURIComponent(`http://127.0.0.1:${PORT}${path}`)}`, { method: 'PUT' })).json()
  const ws = new WebSocket(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map(); const logs = []
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  await new Promise(r => ws.addEventListener('open', r))
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
      logs.push(m.params.args.map(a => a.value ?? a.description).join(' '))
    if (m.method === 'Runtime.exceptionThrown')
      logs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
  })
  await send('Runtime.enable'); await send('Page.enable')
  await wait(2000)
  await send('Runtime.evaluate', { expression: `localStorage.setItem('i18nextLng',${JSON.stringify(code)});localStorage.setItem('dws-planner-storage',JSON.stringify({state:{language:${JSON.stringify(code)},timezone:'UTC',theme:'gold',displaySettings:{timelineMode:'server'}},version:0}))` })
  await send('Page.reload')
  await wait(5000)
  const out = await send('Runtime.evaluate', { returnByValue: true, expression: `JSON.stringify({text:document.body.innerText.replace(/\\s+/g,' '),dir:document.documentElement.dir,sel:(document.getElementById('language-select')||{}).value})` })
  await fetch(`http://127.0.0.1:${CDP}/json/close/${tab.id}`); ws.close()
  return { ...JSON.parse(out.result.value), logs }
}

for (const file of localeFiles()) {
  const code = file.replace(/\.json$/, '')
  test(`/planner/ boots and renders in ${code}`, { skip: !available && 'Chrome not installed' }, async () => {
    const r = await render('/planner/', code)
    assert.deepEqual(r.logs, [], `console errors in ${code}`)
    assert.ok(r.text.length > 200, `looks like the loading skeleton (${r.text.length} chars)`)
    assert.equal(r.sel, code, 'language picker did not settle on the active locale')
    assert.equal(r.dir, code === 'ar' ? 'rtl' : 'ltr')
  })
}
