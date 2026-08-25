import { test } from 'node:test'
import assert from 'node:assert/strict'
import { read } from './lib/site.mjs'

const PAGE = 'calculator/precision-parts/index.html'
const SCRIPT = 'calculator/precision-parts/calculator.js'
const SHARED = '_next/static/css/203636aecdefe762.css'

test('every utility class the calculator uses is actually defined', () => {
  const html = read(PAGE), js = read(SCRIPT)
  const shared = read(SHARED)
  const local = html.slice(html.indexOf('<style>'), html.indexOf('</style>'))
  const css = shared + local

  const used = new Set()
  for (const src of [html, js]) {
    for (const m of src.matchAll(/class(?:Name)?\s*=\s*["']([^"']+)["']/g))
      m[1].split(/\s+/).filter(Boolean).forEach(c => used.add(c))
  }
  const esc = c => c.replace(/([.:/[\]()])/g, '\\$1')
  const missing = [...used].filter(c => !css.includes('.' + esc(c))).sort()
  assert.deepEqual(missing, [], 'classes with no rule anywhere (Tailwind purged them)')
})
