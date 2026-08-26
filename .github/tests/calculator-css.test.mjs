import { test } from 'node:test'
import assert from 'node:assert/strict'
import { read, walk } from './lib/site.mjs'

const SHARED = '_next/static/css/203636aecdefe762.css'
const SHELL = 'calculator/shell.css'

test('every utility class the calculators use is actually defined', () => {
  const css = read(SHARED) + read(SHELL)
  const pages = walk('calculator', f => f.endsWith('.html'))
  const sources = pages.map(read).concat([read('calculator/app.js')])

  const used = new Set()
  for (const src of sources) {
    for (const m of src.matchAll(/class(?:Name)?\s*=\s*["'`]([^"'`]+)["'`]/g))
      m[1].split(/\s+/).filter(Boolean).forEach(c => used.add(c))
    for (const m of src.matchAll(/className\s*=\s*'([^']+)'/g))
      m[1].split(/\s+/).filter(Boolean).forEach(c => used.add(c))
  }
  const esc = c => c.replace(/([.:/[\]()])/g, '\\$1')
  const missing = [...used].filter(c => !css.includes('.' + esc(c))).sort()
  assert.deepEqual(missing, [], 'classes with no rule anywhere (Tailwind purged them)')
})

test('every calculator page loads the shared shell', () => {
  const bad = walk('calculator', f => f.endsWith('index.html'))
    .filter(f => !read(f).includes('/calculator/shell.css'))
  assert.deepEqual(bad, [])
})
