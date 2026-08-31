import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { TARGET_LOCALES, RTL_LOCALES, BUDGET, localeFiles, loadLocale,
         layoutChunk, read, bytes, has, flatKeys } from './lib/site.mjs'

test('every supported locale ships a bundle', () => {
  const found = localeFiles().map(f => f.replace(/\.json$/, '')).sort()
  assert.deepEqual(found, [...TARGET_LOCALES].sort())
})

test('every locale bundle is valid JSON', () => {
  const bad = []
  for (const f of localeFiles()) {
    try { JSON.parse(read(`locales/${f}`)) } catch (e) { bad.push(`${f}: ${e.message}`) }
  }
  assert.deepEqual(bad, [])
})

test('every locale exposes the same key set as en', () => {
  const en = Object.keys(flatKeys(loadLocale('en'))).sort()
  const drift = {}
  for (const code of TARGET_LOCALES) {
    if (code === 'en') continue
    const keys = Object.keys(flatKeys(loadLocale(code))).sort()
    const missing = en.filter(k => !keys.includes(k))
    const extra = keys.filter(k => !en.includes(k))
    if (missing.length || extra.length) drift[code] = { missing: missing.length, extra: extra.length }
  }
  assert.deepEqual(drift, {})
})

test('Tagalog is fully removed', () => {
  assert.ok(!has('locales/tl.json'), 'locales/tl.json still present')
  assert.ok(!read(layoutChunk()).includes('code:"tl"'), 'tl still offered in the language picker')
})

test('locale bundles are not inlined into the layout chunk', () => {
  const size = bytes(layoutChunk())
  assert.ok(size <= BUDGET.layoutChunkBytes,
    `layout chunk is ${size} bytes, budget ${BUDGET.layoutChunkBytes}`)
})

test('locales are fetched at runtime', () => {
  assert.match(read(layoutChunk()), /\/locales\//)
})

test('no locale bundle exceeds its byte budget', () => {
  const over = localeFiles()
    .map(f => [f, bytes(`locales/${f}`)])
    .filter(([, n]) => n > BUDGET.localeFileBytes)
  assert.deepEqual(over, [])
})

test('Arabic is the only RTL locale and is declared', () => {
  const src = read(layoutChunk())
  const m = src.match(/=\["ar"\]/)
  assert.ok(m, 'RTL locale list not found')
  assert.deepEqual(RTL_LOCALES, ['ar'])
})

test('the inlined English bundle matches locales/en.json', () => {
  const m = read(layoutChunk())
    .match(/let d=JSON\.parse\(('(?:\\.|[^'\\])*')\),g=\{en:\{translation:d\}\}/)
  assert.ok(m, 'inlined English bundle not found')
  assert.deepEqual(JSON.parse(vm.runInNewContext(m[1])), loadLocale('en'))
})
