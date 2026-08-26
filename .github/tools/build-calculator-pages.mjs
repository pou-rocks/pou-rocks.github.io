import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../tests/lib/site.mjs'

export const CALCULATORS = [
  { slug: 'precision-parts', label: 'Precision Parts', blurb: 'Parts to raise industrial buildings between industry levels.' },
  { slug: 'vehicle-level',   label: 'Vehicle Level',   blurb: 'Gears to raise your vehicle, with the real per-press count.' },
  { slug: 'vehicle-parts',   label: 'Vehicle Parts',   blurb: 'Titanium and Blueprints across the six vehicle parts.' },
  { slug: 'hero-weapon',     label: 'Hero Weapon',     blurb: 'Exclusive weapon fragments for each of the 18 heroes.' },
  { slug: 'hero-stars',      label: 'Hero Stars',      blurb: 'Fragments to take a hero from one star level to another.' },
  { slug: 'hero-equipment',  label: 'Hero Equipment',  blurb: 'Power Cores, Boost Ore and DX-Blueprints for gear.' },
  { slug: 'vehicle-chips',   label: 'Vehicle Chips',   blurb: 'Duplicate chips needed to star up a microchip.' },
]

const HEAD = (title) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · DWS Planner</title>
<link rel="icon" href="/favicon.png">
<link rel="stylesheet" href="/_next/static/css/203636aecdefe762.css">
<link rel="stylesheet" href="/calculator/shell.css">
</head>`

const HEADER = `<header class="glass border-b border-dark-border sticky top-0 z-50">
  <div class="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
    <a href="/calculator/" class="flex items-center gap-2 group shrink-0" aria-label="All calculators">
      <span class="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
        <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </span>
      <span id="backLabel" class="text-lg font-bold text-gradient hidden sm:inline"></span>
    </a>
    <label class="sr-only" for="lang">Language</label>
    <select id="lang" class="bg-dark-card text-theme-text text-sm rounded-md border border-dark-border px-2 py-1"></select>
  </div>
</header>`

const page = (c) => `${HEAD(c.label)}
<body class="bg-dark-bg text-theme-text" data-calc="${c.slug}">
${HEADER}
<main class="max-w-3xl mx-auto px-4 py-6 pb-56">
  <h1 id="title" class="text-2xl sm:text-3xl font-bold mb-1">${c.label}</h1>
  <p id="subtitle" class="text-theme-muted text-sm mb-6">${c.blurb}</p>

  <div id="rows" class="space-y-3"></div>

  <div class="flex flex-wrap gap-2 mt-4">
    <button id="add" class="px-4 py-3 rounded-lg bg-accent text-accent-text text-sm font-semibold hover:opacity-90 transition"></button>
    <button id="reset" class="px-4 py-3 rounded-lg bg-dark-card border border-dark-border text-sm text-theme-muted hover:bg-dark-card-hover transition"></button>
  </div>

  <section class="glass-card mt-6">
    <h2 id="ownedLabel" class="text-xs uppercase tracking-wide text-theme-muted mb-2"></h2>
    <div id="have"></div>
  </section>

  <section class="mt-6">
    <button id="toggleBreak" class="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-dark-card border border-dark-border text-sm hover:bg-dark-card-hover transition" aria-expanded="false" aria-controls="breakdown">
      <span></span>
      <svg id="chev" class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
    </button>
    <div id="breakdown" hidden class="mt-3 overflow-x-auto"></div>
  </section>

  <p id="meta" class="text-xs text-theme-muted mt-8"></p>
</main>

<div class="fixed bottom-0 inset-x-0 glass border-t border-dark-border">
  <div class="max-w-3xl mx-auto px-4 py-3">
    <div id="totalLabel" class="text-xs uppercase tracking-wide text-theme-muted mb-1"></div>
    <div id="totals" class="space-y-1"></div>
    <div id="extra" class="text-xs text-theme-muted mt-1"></div>
  </div>
</div>

<script src="/calculator/app.js"></script>
</body>
</html>
`

const hub = () => `${HEAD('Calculators')}
<body class="bg-dark-bg text-theme-text">
<header class="glass border-b border-dark-border sticky top-0 z-50">
  <div class="max-w-3xl mx-auto px-4 h-16 flex items-center gap-2">
    <a href="/planner/" class="flex items-center gap-2 group shrink-0" aria-label="Back to DWS Planner">
      <span class="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
        <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </span>
      <span class="text-lg font-bold text-gradient">DWS Planner</span>
    </a>
  </div>
</header>
<main class="max-w-3xl mx-auto px-4 py-6">
  <h1 id="hubTitle" class="text-2xl sm:text-3xl font-bold mb-6"></h1>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
${CALCULATORS.map(c => `    <a href="/calculator/${c.slug}/" class="glass-card block hover:glow-gold transition" data-slug="${c.slug}">
      <div class="font-semibold" data-label>${c.label}</div>
    </a>`).join('\n')}
  </div>
  <p id="hubNote" class="text-xs text-theme-muted mt-8"></p>
</main>
<script src="/calculator/hub.js"></script>
</body>
</html>
`

const old = join(ROOT, 'calculator/precision-parts/calculator.js')
if (existsSync(old)) rmSync(old)

for (const c of CALCULATORS) {
  const dir = join(ROOT, 'calculator', c.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), page(c))
}
writeFileSync(join(ROOT, 'calculator', 'index.html'), hub())
console.log(`wrote hub + ${CALCULATORS.length} calculator pages`)
