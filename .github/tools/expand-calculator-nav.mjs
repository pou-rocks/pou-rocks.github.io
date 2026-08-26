import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, layoutChunk } from '../tests/lib/site.mjs'
import { CALCULATORS } from './build-calculator-pages.mjs'

const path = join(ROOT, layoutChunk())
let src = readFileSync(path, 'utf8')

const key = s => 'nav.calc_' + s.replace(/-/g, '_')

const DESK_OLD = '(0,n.jsx)("a",{href:"/calculator/precision-parts/",className:"block px-3 py-2 rounded-md text-sm transition-colors text-theme-muted hover:text-theme-text hover:bg-dark-card-hover",children:e("nav.precision_parts","Precision Parts")})'
const MOB_OLD = '(0,n.jsx)("a",{href:"/calculator/precision-parts/",className:"ml-4 block px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-theme-muted hover:text-theme-text hover:bg-dark-card-hover",children:e("nav.precision_parts","Precision Parts")})'

if (!src.includes(DESK_OLD) || !src.includes(MOB_OLD)) {
  if (src.includes(key('vehicle_level'))) { console.log('already expanded'); process.exit(0) }
  throw new Error('calculator nav anchors not found')
}

const deskItems = CALCULATORS.map(c =>
  `(0,n.jsx)("a",{href:"/calculator/${c.slug}/",className:"block px-3 py-2 rounded-md text-sm transition-colors text-theme-muted hover:text-theme-text hover:bg-dark-card-hover",children:e("${key(c.slug)}","${c.label}")},"${c.slug}")`
).join(',')
const mobItems = CALCULATORS.map(c =>
  `(0,n.jsx)("a",{href:"/calculator/${c.slug}/",className:"ml-4 block px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-theme-muted hover:text-theme-text hover:bg-dark-card-hover",children:e("${key(c.slug)}","${c.label}")},"${c.slug}")`
).join(',')

src = src.replace(DESK_OLD, `(0,n.jsxs)(n.Fragment,{children:[${deskItems}]})`)
src = src.replace(MOB_OLD, `(0,n.jsxs)(n.Fragment,{children:[${mobItems}]})`)
src = src.split('href:"/calculator/precision-parts/",className:"relative inline-flex').join('href:"/calculator/",className:"relative inline-flex')

writeFileSync(path, src)
console.log(`nav now lists ${CALCULATORS.length} calculators; chunk ${src.length} bytes`)
