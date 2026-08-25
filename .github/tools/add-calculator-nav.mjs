import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, layoutChunk } from '../tests/lib/site.mjs'

const path = join(ROOT, layoutChunk())
let src = readFileSync(path, 'utf8')

if (src.includes('nav.calculator')) { console.log('already patched'); process.exit(0) }

const ICON = '(0,n.jsx)("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:(0,n.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M9 7h6m-6 4h6m-6 4h2M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"})})'
const CHEV = '(0,n.jsx)("svg",{className:"w-3 h-3 opacity-70",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:(0,n.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M19 9l-7 7-7-7"})})'
const HREF = '/calculator/precision-parts/'

const DESKTOP = ',(0,n.jsxs)("div",{className:"relative group flex items-center",children:[' +
  `(0,n.jsx)("a",{href:"${HREF}",className:"relative inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-theme-muted hover:text-theme-text hover:bg-dark-card-hover",children:` +
  `(0,n.jsxs)("span",{className:"flex items-center gap-2",children:[${ICON},e("nav.calculator","Calculator"),${CHEV}]})}),` +
  '(0,n.jsx)("div",{className:"absolute left-0 top-full pt-2 hidden group-hover:block min-w-[220px] z-50",children:' +
  '(0,n.jsx)("div",{className:"glass glass-border rounded-lg p-1 shadow-xl",children:' +
  `(0,n.jsx)("a",{href:"${HREF}",className:"block px-3 py-2 rounded-md text-sm transition-colors text-theme-muted hover:text-theme-text hover:bg-dark-card-hover",children:e("nav.precision_parts","Precision Parts")})})})]})`

const MOBILE = ',(0,n.jsxs)("div",{children:[' +
  '(0,n.jsx)("div",{className:"px-4 py-3 rounded-lg text-sm font-medium text-theme-muted",children:' +
  `(0,n.jsxs)("span",{className:"flex items-center gap-3",children:[${ICON},e("nav.calculator","Calculator")]})}),` +
  `(0,n.jsx)("a",{href:"${HREF}",className:"ml-4 block px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-theme-muted hover:text-theme-text hover:bg-dark-card-hover",children:e("nav.precision_parts","Precision Parts")})]})`

const GUIDES = 'e("nav.guides","Guides")]})})]})'
const DESK_TAIL = ',(0,n.jsxs)("div",{className:"hidden md:flex items-center gap-3"'
const MOB_TAIL = ',(0,n.jsxs)("div",{className:"border-t border-dark-border pt-4 space-y-3"'

let done = 0
for (const [tail, block] of [[DESK_TAIL, DESKTOP], [MOB_TAIL, MOBILE]]) {
  const needle = GUIDES + tail
  if (!src.includes(needle)) throw new Error(`anchor not found: ${tail.slice(0, 60)}`)
  src = src.replace(needle, 'e("nav.guides","Guides")]})})' + block + ']})' + tail)
  done++
}
writeFileSync(path, src)
console.log(`patched ${done} nav locations; chunk now ${src.length} bytes`)
