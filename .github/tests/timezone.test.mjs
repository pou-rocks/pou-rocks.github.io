import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { ROOT, TARGET_LOCALES, loadLocale, layoutChunk, read, flatKeys } from './lib/site.mjs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 8905, CDP = 9336
const available = existsSync(CHROME)
let server, browser
const wait = ms => new Promise(r => setTimeout(r, ms))

const PINNED = ['UTC', 'Asia/Seoul', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Manila',
  'Asia/Jakarta', 'Asia/Dubai', 'America/New_York', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Australia/Sydney']

const REGIONS = ['Africa', 'America', 'Antarctica', 'Arctic', 'Asia', 'Atlantic',
  'Australia', 'Europe', 'Indian', 'Pacific']

function renameTable () {
  const m = read(layoutChunk()).match(/tzRenamed=(\{.*?\}),tzByRegion/)
  assert.ok(m, 'rename table not found in the layout chunk')
  return JSON.parse(m[1])
}

test('the picker is built from the platform zone database, not a hard-coded list', () => {
  assert.match(read(layoutChunk()), /supportedValuesOf/)
})

test('the twelve familiar zones stay pinned', () => {
  const src = read(layoutChunk())
  const absent = PINNED.filter(z => !src.includes(`"${z}"`))
  assert.deepEqual(absent, [])
})

test('the selected zone is always offered, even outside the database', () => {
  assert.match(read(layoutChunk()), /resolvedOptions\(\)\.timeZone/)
})

test('every zone label carries its UTC offset', () => {
  assert.match(read(layoutChunk()), /timeZoneName:"shortOffset"/)
})

test('the select cannot outgrow its row', () => {
  const src = read(layoutChunk())
  const m = src.match(/id:"timezone-select"[\s\S]*?className:"([^"]+)"/)
  assert.ok(m, 'timezone select className not found')
  for (const cls of ['min-w-0', 'truncate']) assert.match(m[1], new RegExp(cls))
})

test('renamed cities are relabelled, since ICU still prefers the legacy IANA name', () => {
  const t = renameTable()
  assert.equal(t['Asia/Calcutta'], 'Kolkata')
  assert.equal(t['Europe/Kiev'], 'Kyiv')
  assert.equal(t['Asia/Saigon'], 'Ho Chi Minh City')
  const stale = Object.entries(t).filter(([z, name]) => z.endsWith(`/${name.replace(/ /g, '_')}`))
  assert.deepEqual(stale, [], 'entries that rename a zone to its own name')
})

test('every region has a group label in every locale', () => {
  const want = ['common', ...REGIONS.map(r => r.toLowerCase())]
    .map(k => `timezone_groups.${k}`)
  const drift = {}
  for (const code of TARGET_LOCALES) {
    const keys = flatKeys(loadLocale(code))
    const missing = want.filter(k => !keys[k])
    if (missing.length) drift[code] = missing
  }
  assert.deepEqual(drift, {})
})

test('group labels are translated, not copied from English', () => {
  const en = flatKeys(loadLocale('en'))
  const want = ['common', ...REGIONS.map(r => r.toLowerCase())]
    .map(k => `timezone_groups.${k}`)
  const untranslated = {}
  for (const code of ['ko', 'ja', 'ru', 'th', 'ar', 'zh']) {
    const keys = flatKeys(loadLocale(code))
    const same = want.filter(k => keys[k] === en[k])
    if (same.length) untranslated[code] = same
  }
  assert.deepEqual(untranslated, {})
})

before(async () => {
  if (!available) return
  server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'],
    { cwd: ROOT, stdio: 'ignore' })
  browser = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox',
    `--remote-debugging-port=${CDP}`, '--user-data-dir=/tmp/dws-tz-profile', 'about:blank'],
    { stdio: 'ignore' })
  await wait(3500)
})
after(() => { server?.kill(); browser?.kill() })

async function open ({ zone = 'UTC', stored = null, locale = 'en', width = 1200, drawer = false } = {}) {
  const url = `http://127.0.0.1:${PORT}/planner/`
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
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
  await send('Network.setCacheDisabled', { cacheDisabled: true })
  await send('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: width < 600 })
  await send('Emulation.setTimezoneOverride', { timezoneId: zone })
  await wait(1500)
  const state = { language: locale, ...(stored ? { timezone: stored } : {}) }
  const seed = `localStorage.setItem('i18nextLng',${JSON.stringify(locale)});`
    + `localStorage.setItem('dws-planner-storage',${JSON.stringify(JSON.stringify({ state, version: 0 }))})`
  await send('Runtime.evaluate', { expression: `localStorage.clear();${seed}` })
  await send('Page.reload')
  await wait(5000)
  if (drawer) {
    await send('Runtime.evaluate', { expression: 'document.querySelector("header button.md\\\\:hidden")?.click()' })
    await wait(800)
  }
  const probe = `(() => {
    const s = document.querySelectorAll('select#timezone-select')
    const el = [...s].find(x => x.offsetParent !== null) || s[0]
    if (!el) return JSON.stringify({ missing: true })
    return JSON.stringify({
      value: el.value,
      detected: Intl.DateTimeFormat().resolvedOptions().timeZone,
      selectedText: el.selectedIndex >= 0 ? el.options[el.selectedIndex].text : null,
      count: el.options.length,
      groups: [...el.querySelectorAll('optgroup')].map(g => g.label),
      groupOptions: Object.fromEntries([...el.querySelectorAll('optgroup')]
        .map(g => [g.label, [...g.children].map(o => o.text)])),
      values: [...el.options].map(o => o.value),
      texts: [...el.options].map(o => o.text),
      width: el.getBoundingClientRect().width,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    })
  })()`
  const out = await send('Runtime.evaluate', { returnByValue: true, expression: probe })
  await fetch(`http://127.0.0.1:${CDP}/json/close/${tab.id}`); ws.close()
  return { ...JSON.parse(out.result.value), logs }
}

const skip = !available && 'Chrome not installed'

test('the picker offers the whole world', { skip }, async () => {
  const r = await open()
  assert.deepEqual(r.logs, [])
  assert.ok(r.count >= 400, `only ${r.count} zones offered`)
  const missing = ['America/Chicago', 'Europe/Berlin', 'Africa/Lagos', 'America/Sao_Paulo',
    'Pacific/Auckland', 'Asia/Karachi', 'America/Buenos_Aires', 'America/Indiana/Knox']
    .filter(z => !r.values.includes(z))
  assert.deepEqual(missing, [])
})

test('zones are grouped by region with the familiar twelve on top', { skip }, async () => {
  const r = await open()
  const en = flatKeys(loadLocale('en'))
  assert.deepEqual(r.groups, ['common', ...REGIONS.map(x => x.toLowerCase())]
    .map(k => en[`timezone_groups.${k}`]))
  assert.equal(r.values.slice(0, PINNED.length).join(), PINNED.join())
})

test('every option shows its UTC offset', { skip }, async () => {
  const r = await open()
  const bare = r.texts.filter(t => !/\(GMT([+-]\d{1,2}(:\d\d)?)?\)$/.test(t))
  assert.deepEqual(bare, [])
})

test('renamed cities render under their modern name', { skip }, async () => {
  const r = await open()
  const label = z => r.texts[r.values.indexOf(z)]
  for (const [zone, name] of Object.entries(renameTable())) {
    if (!r.values.includes(zone)) continue
    assert.match(label(zone), new RegExp(`^${name} \\(`), `${zone} still shows a legacy name`)
  }
  assert.ok(r.values.includes('Asia/Calcutta'))
  assert.match(label('Asia/Calcutta'), /^Kolkata /)
})

test('renamed cities sort under their modern name', { skip }, async () => {
  const r = await open()
  const asia = r.groupOptions.Asia
  const at = name => asia.findIndex(t => t.startsWith(`${name} (`))
  assert.ok(at('Kolkata') > 0, 'Kolkata missing from the Asia group')
  assert.ok(at('Kabul') < at('Kolkata'), 'Kolkata sorts before Kabul')
  assert.ok(at('Kolkata') < at('Kuwait'), 'Kolkata sorts after Kuwait')
})

test('the detected zone is preselected, never blank', { skip }, async () => {
  const r = await open({ zone: 'Asia/Kolkata' })
  assert.equal(r.value, r.detected, 'select did not settle on the detected zone')
  assert.match(r.selectedText, /Kolkata/)
})

test('a stored zone the database omits is still offered', { skip }, async () => {
  const r = await open({ zone: 'UTC', stored: 'Asia/Kolkata' })
  assert.equal(r.value, 'Asia/Kolkata')
  assert.match(r.selectedText, /Kolkata/, 'selected option rendered blank')
})

test('the drawer does not scroll sideways at 390px', { skip }, async () => {
  const r = await open({ zone: 'Antarctica/DumontDUrville', width: 390, drawer: true })
  assert.deepEqual(r.logs, [])
  assert.ok(r.pageOverflow <= 0, `page overflows by ${r.pageOverflow}px`)
  assert.ok(r.width <= 390, `select is ${Math.round(r.width)}px wide`)
})

test('group headings follow the reader\'s language', { skip }, async () => {
  for (const code of ['ko', 'ar']) {
    const r = await open({ locale: code })
    assert.equal(r.groups[0], flatKeys(loadLocale(code))['timezone_groups.common'],
      `group headings not localized in ${code}`)
  }
})
