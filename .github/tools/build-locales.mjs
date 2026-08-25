import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, TARGET_LOCALES, layoutChunk } from '../tests/lib/site.mjs'

const data = JSON.parse(readFileSync(join(ROOT, '.github/data/game-terms.json'), 'utf8'))
const base = JSON.parse(readFileSync(join(ROOT, 'locales/en.json'), 'utf8'))

const setPath = (obj, path, value) => {
  const parts = path.split('.')
  let cur = obj
  for (const p of parts.slice(0, -1)) {
    if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {}
    cur = cur[p]
  }
  cur[parts.at(-1)] = value
}

const report = []
for (const code of TARGET_LOCALES) {
  const file = join(ROOT, 'locales', `${code}.json`)
  const fresh = !existsSync(file)
  const bundle = fresh ? structuredClone(base) : JSON.parse(readFileSync(file, 'utf8'))

  bundle.language_name = data.endonyms[code] ?? bundle.language_name

  let applied = 0, fellBack = 0
  for (const [key, entry] of Object.entries(data.terms)) {
    const term = entry.locales[code]
    if (term) { setPath(bundle, key, term); applied++ }
    else if (fresh) fellBack++
  }
  writeFileSync(file, JSON.stringify(bundle, null, 1) + '\n')
  report.push({ code, source: fresh ? 'new' : 'existing', applied, fellBack })
}

const path = join(ROOT, layoutChunk())
let src = readFileSync(path, 'utf8')
const PICKER = /let d=\[\{code:"en",name:"English"\}[^\]]*\];/
if (!PICKER.test(src)) throw new Error('language picker array not found')
const picker = TARGET_LOCALES.map(c => `{code:"${c}",name:"${data.endonyms[c]}"}`).join(',')
src = src.replace(PICKER, `let d=[${picker}];`)
writeFileSync(path, src)

console.table(report)
console.log('picker entries:', TARGET_LOCALES.length)
