import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { ROOT } from './lib/site.mjs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 8903, CDP = 9334
const available = existsSync(CHROME)
let server, browser
const wait = ms => new Promise(r => setTimeout(r, ms))

before(async () => {
  if (!available) return
  server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' })
  browser = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox',
    `--remote-debugging-port=${CDP}`, '--user-data-dir=/tmp/dws-calc-profile', 'about:blank'], { stdio: 'ignore' })
  await wait(3500)
})
after(() => { server?.kill(); browser?.kill() })

async function session (state, width = 390) {
  const url = `http://127.0.0.1:${PORT}/calculator/precision-parts/`
  const tab = await (await fetch(`http://127.0.0.1:${CDP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json()
  const ws = new WebSocket(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map(); const logs = []
  const send = (m, p = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
  await new Promise(r => ws.addEventListener('open', r))
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push(m.params.args.map(a => a.value ?? a.description).join(' '))
    if (m.method === 'Runtime.exceptionThrown') logs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
  })
  await send('Runtime.enable'); await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: width < 600 })
  await wait(1800)
  const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.value
  await ev(`localStorage.setItem('i18nextLng','${state.locale}');localStorage.setItem('dws-precision-calc',${JSON.stringify(JSON.stringify(state.calc))})`)
  await send('Page.reload'); await wait(2600)
  const out = await ev(`JSON.stringify({total:document.getElementById('total').textContent,unit:document.getElementById('totalUnit').textContent,short:document.getElementById('short').textContent,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,dir:document.documentElement.dir,firstName:(document.querySelector('#rows select')||{}).selectedOptions?.[0]?.textContent||''})`)
  await fetch(`http://127.0.0.1:${CDP}/json/close/${tab.id}`); ws.close()
  return { ...JSON.parse(out), logs }
}

const REF = { rows: [{ id: '400000', from: 5, to: 6 }, { id: '403000', from: 1, to: 2 }], have: '1500', open: true }

test('reference query totals 2,600 in the browser', { skip: !available && 'Chrome not installed' }, async () => {
  const r = await session({ locale: 'en', calc: REF })
  assert.deepEqual(r.logs, [])
  assert.equal(r.total.replace(/[^0-9]/g, ''), '2600')
  assert.equal(r.unit, 'Precision Part')
  assert.match(r.short, /1,100|1100/)
})

test('no horizontal overflow at 390px', { skip: !available && 'Chrome not installed' }, async () => {
  const r = await session({ locale: 'en', calc: { ...REF, rows: REF.rows.concat([{ id: '797000', from: 0, to: 10 }]) } })
  assert.equal(r.overflow, 0, 'page scrolls sideways on a phone')
})

test('localises building names and flips to RTL for Arabic', { skip: !available && 'Chrome not installed' }, async () => {
  const ko = await session({ locale: 'ko', calc: REF })
  assert.equal(ko.firstName, '와치타워')
  assert.deepEqual(ko.logs, [])
  const ar = await session({ locale: 'ar', calc: REF })
  assert.equal(ar.dir, 'rtl')
  assert.equal(ar.overflow, 0, 'RTL layout overflows on a phone')
})
