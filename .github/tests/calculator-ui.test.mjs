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

const CALCS = ['precision-parts', 'vehicle-level', 'vehicle-parts', 'hero-weapon',
  'hero-stars', 'hero-equipment', 'vehicle-chips']

before(async () => {
  if (!available) return
  server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' })
  browser = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox',
    `--remote-debugging-port=${CDP}`, '--user-data-dir=/tmp/dws-calc-profile', 'about:blank'], { stdio: 'ignore' })
  await wait(3500)
})
after(() => { server?.kill(); browser?.kill() })

async function open (slug, { locale = 'en', calc = null, width = 390 } = {}) {
  const url = `http://127.0.0.1:${PORT}/calculator/${slug}/`
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
  await wait(1500)
  const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.value
  const setup = [`localStorage.setItem('i18nextLng',${JSON.stringify(locale)})`]
  if (calc) setup.push(`localStorage.setItem('dws-calc-${slug}',${JSON.stringify(JSON.stringify(calc))})`)
  await ev(setup.join(';'))
  await send('Page.reload'); await wait(2400)
  const out = await ev(`JSON.stringify({
    totals:document.getElementById('totals').innerText.replace(/\\s+/g,' '),
    rows:document.querySelectorAll('#rows > div').length,
    title:document.getElementById('title').textContent,
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    dir:document.documentElement.dir})`)
  await fetch(`http://127.0.0.1:${CDP}/json/close/${tab.id}`); ws.close()
  return { ...JSON.parse(out), logs }
}
const digits = s => (s.match(/[\d,]{2,}/g) || []).map(x => +x.replace(/,/g, ''))

for (const slug of CALCS) {
  test(`${slug} boots clean with no sideways scroll at 390px`, { skip: !available && 'Chrome not installed' }, async () => {
    const r = await open(slug)
    assert.deepEqual(r.logs, [], `console errors on ${slug}`)
    assert.ok(r.rows >= 1, 'no rows rendered')
    assert.ok(r.title.length > 3, 'title not set')
    assert.equal(r.overflow, 0, 'page scrolls sideways on a phone')
  })
}

test('precision parts reference query still totals 2,600', { skip: !available && 'Chrome not installed' }, async () => {
  const r = await open('precision-parts', { calc: { rows: [{ id: '400000', from: 5, to: 6 }, { id: '403000', from: 1, to: 2 }], have: {}, open: true } })
  assert.ok(digits(r.totals).includes(2600), `expected 2600 in "${r.totals}"`)
})

test('vehicle level 296 to 350 totals 2,955,130 gears', { skip: !available && 'Chrome not installed' }, async () => {
  const r = await open('vehicle-level', { calc: { rows: [{ id: null, from: 296, to: 350 }], have: {}, open: true } })
  assert.ok(digits(r.totals).includes(2955130), `expected 2955130 in "${r.totals}"`)
})

test('hero stars 3 to 5 totals 800 fragments', { skip: !available && 'Chrome not installed' }, async () => {
  const r = await open('hero-stars', { calc: { rows: [{ id: null, from: 3, to: 5 }], have: {}, open: true } })
  assert.ok(digits(r.totals).includes(800), `expected 800 in "${r.totals}"`)
})

test('Arabic flips to RTL without overflowing', { skip: !available && 'Chrome not installed' }, async () => {
  const r = await open('vehicle-parts', { locale: 'ar' })
  assert.equal(r.dir, 'rtl')
  assert.equal(r.overflow, 0)
  assert.deepEqual(r.logs, [])
})
