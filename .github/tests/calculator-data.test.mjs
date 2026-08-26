import { test } from 'node:test'
import assert from 'node:assert/strict'
import { read, has, TARGET_LOCALES } from './lib/site.mjs'

const load = f => JSON.parse(read(`data/${f}.json`))
const FILES = ['precision-parts', 'vehicle', 'hero-weapons', 'hero-stars', 'hero-equipment', 'vehicle-chips']

test('every calculator dataset is published and parses', () => {
  const bad = FILES.filter(f => !has(`data/${f}.json`))
  assert.deepEqual(bad, [])
  FILES.forEach(f => JSON.parse(read(`data/${f}.json`)))
})

test('vehicle levelling reconciles with the documented total', () => {
  const d = load('vehicle').level
  assert.equal(d.cumulative.length, 500)
  assert.equal(d.cumulative[499], 23035170)
  assert.equal(d.total, 23035170)
  assert.ok(d.costIsPerPress)
  assert.notEqual(d.naiveSum, d.total)
})

test('vehicle level cost equals presses times per-press cost', () => {
  const d = load('vehicle').level
  const bad = []
  for (let i = 0; i < 500; i++) {
    const step = i === 0 ? d.cumulative[0] : d.cumulative[i] - d.cumulative[i - 1]
    if (step !== d.gearsPerPress[i] * d.presses[i]) bad.push(i + 1)
  }
  assert.deepEqual(bad.slice(0, 5), [])
})

test('vehicle parts reconcile across six slots', () => {
  const p = load('vehicle').parts
  assert.equal(p.slots.length, 6)
  const ti = p.titanium.slice(0, 66).reduce((a, b) => a + b, 0)
  const bp = p.blueprint.slice(0, 66).reduce((a, b) => a + b, 0)
  assert.equal(ti * 6, p.allSlotsTotals.titanium_alloy)
  assert.equal(bp * 6, p.allSlotsTotals.design_blueprint)
})

test('hero weapon ladder reconciles to 3,915 fragments', () => {
  const d = load('hero-weapons')
  assert.equal(d.weapons.length, 18)
  assert.equal(d.levels.length, 53)
  assert.equal(d.levels[52].cumulative, 3915)
  assert.equal(d.total, 3915)
})

test('hero stars reconcile to 955 fragments', () => {
  const d = load('hero-stars')
  assert.equal(d.bands.length, 5)
  assert.equal(d.bands.reduce((n, b) => n + b.total, 0), 955)
  assert.equal(d.bands[4].cumulative, 955)
  assert.ok(d.caveat)
})

test('hero star bands charge the last tick at the next band rate, except band 0', () => {
  const b = load('hero-stars').bands
  for (let i = 1; i < b.length - 1; i++)
    assert.equal(b[i].tickCosts[4], b[i + 1].tickCosts[0], `band ${i} tail`)
  assert.notEqual(b[0].tickCosts[4], b[1].tickCosts[0],
    'band 0 is the documented exception; if this ever matches, dws-wiki should be updated')
})

test('hero equipment promote and upgrade reconcile', () => {
  const d = load('hero-equipment')
  const r = d.promote.rows
  assert.equal(r.length, 37)
  assert.equal(r.reduce((n, x) => n + x.powerCore, 0), d.promote.totals.power_core)
  assert.equal(r.reduce((n, x) => n + x.boostOre, 0), d.promote.totals.boost_ore)
  assert.equal(r.reduce((n, x) => n + x.dxBlueprint, 0), d.promote.totals.dx_blueprint)
  assert.equal(d.upgrade.curves.length, 5)
  for (const c of d.upgrade.curves)
    assert.equal(c.costPerLevel.reduce((a, b) => a + b, 0), c.total, `quality ${c.quality}`)
})

test('every chip ladder reaches 10 stars at 500 duplicates', () => {
  const d = load('vehicle-chips')
  assert.equal(d.chips.length, 32)
  assert.ok(d.ladders.length >= 2)
  for (const l of d.ladders) {
    assert.equal(l.stars.length, 10)
    assert.equal(l.stars[9].cumulative, 500, `${l.colour} ladder`)
  }
})

test('localized name maps cover every supported locale', () => {
  const gaps = []
  const check = (label, entries) => {
    for (const e of entries)
      for (const loc of TARGET_LOCALES)
        if (!e.names || !e.names[loc]) gaps.push(`${label}/${e.id || e.group || e.slot}/${loc}`)
  }
  check('weapon', load('hero-weapons').weapons)
  check('chip', load('vehicle-chips').chips)
  check('partSlot', load('vehicle').parts.slots)
  assert.deepEqual(gaps.slice(0, 8), [])
})
