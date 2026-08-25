import { test } from 'node:test'
import assert from 'node:assert/strict'
import { read, has, TARGET_LOCALES } from './lib/site.mjs'

const load = () => JSON.parse(read('data/precision-parts.json'))

test('precision parts dataset is published', () => {
  assert.ok(has('data/precision-parts.json'))
})

test('all 16 part-consuming buildings are present', () => {
  assert.equal(load().buildings.length, 16)
})

test('every building has 10 industry bands', () => {
  const bad = load().buildings.filter(b => b.bands.length !== 10).map(b => b.id)
  assert.deepEqual(bad, [])
})

test('building totals reconcile with the documented grand total', () => {
  const d = load()
  const sum = d.buildings.reduce((n, b) => n + b.total, 0)
  assert.equal(sum, 135000)
  assert.equal(d.grandTotal, 135000)
})

test('each band total equals parts per level times five', () => {
  const bad = []
  for (const b of load().buildings)
    for (const band of b.bands)
      if (band.perLevel * 5 !== band.total) bad.push(`${b.id} band ${band.band}`)
  assert.deepEqual(bad, [])
})

test('the reference query resolves to 2600 parts', () => {
  const d = load()
  const cost = (id, from, to) => d.buildings.find(b => b.id === id).bands
    .filter(x => x.band > from && x.band <= to)
    .reduce((n, x) => n + x.total, 0)
  assert.equal(cost('400000', 5, 6), 1500)
  assert.equal(cost('403000', 1, 2), 1100)
  assert.equal(cost('400000', 5, 6) + cost('403000', 1, 2), 2600)
})

test('every building is named in every supported locale', () => {
  const d = load()
  const gaps = []
  for (const b of d.buildings)
    for (const loc of TARGET_LOCALES)
      if (!b.names?.[loc]) gaps.push(`${b.id}/${loc}`)
  assert.deepEqual(gaps, [])
})

test('building labels are unique within each locale', () => {
  const d = load()
  const clashes = []
  for (const loc of TARGET_LOCALES) {
    const seen = new Map()
    for (const b of d.buildings) {
      const n = b.names[loc]
      if (seen.has(n)) clashes.push(`${loc}: "${n}" on ${seen.get(n)} and ${b.id}`)
      seen.set(n, b.id)
    }
  }
  assert.deepEqual(clashes, [])
})
