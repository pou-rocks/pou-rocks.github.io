import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { chunks, htmlFiles, read, has, layoutChunk } from './lib/site.mjs'

const ROUTES = ['planner', 'events', 'guides', 'hive-map', 'hive-map/generator',
  'guides/formation1-power-optimization', 'guides/hero-information',
  'guides/hero-orange-equipments', 'guides/hero-skills-and-levels']

test('every chunk parses as valid JavaScript', () => {
  const broken = []
  for (const f of chunks()) {
    try { new vm.Script(read(f), { filename: f }) }
    catch (e) { broken.push(`${f}: ${e.message}`) }
  }
  assert.deepEqual(broken, [])
})

test('.nojekyll is present', () => {
  assert.ok(has('.nojekyll'), '_next/ is dropped by Jekyll without it')
})

test('every route emits an index.html', () => {
  const missing = ROUTES.filter(r => !has(`${r}/index.html`))
  assert.deepEqual(missing, [])
})

test('buildId is identical across every rendered page', () => {
  const ids = new Set()
  for (const f of htmlFiles()) {
    const m = read(f).match(/<!--([A-Za-z0-9_-]{15,})-->/)
    if (m) ids.add(m[1])
  }
  assert.equal(ids.size, 1, `expected one buildId, saw ${[...ids].join(', ')}`)
})

test('every asset referenced by a rendered page exists', () => {
  const missing = new Set()
  for (const f of htmlFiles()) {
    for (const m of read(f).matchAll(/(?:href|src)="(\/[^"]+)"/g)) {
      const p = decodeURIComponent(m[1]).replace(/^\//, '')
      if (!p.startsWith('_next/') && !/\.(png|jpg|svg|ico)$/.test(p)) continue
      if (!has(p)) missing.add(p)
    }
  }
  assert.deepEqual([...missing], [])
})

test('layout chunk is the only place nav is defined', () => {
  assert.ok(read(layoutChunk()).includes('href:"/hive-map/generator"'))
})
