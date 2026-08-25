import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, layoutChunk } from '../tests/lib/site.mjs'

const RENAME = { zh: 'zh', tl: null }
const ORDER = ['en', 'ko', 'zh', 'ja', 'id', 'tl', 'ar']

const path = join(ROOT, layoutChunk())
let src = readFileSync(path, 'utf8')

if (src.includes('/locales/')) {
  console.log('already patched; nothing to do')
  process.exit(0)
}

function literalAt(s, start) {
  let i = start, out = ''
  while (i < s.length) {
    const c = s[i]
    if (c === '\\') { out += s[i] + s[i + 1]; i += 2; continue }
    if (c === "'") break
    out += c; i++
  }
  return { raw: out, end: i }
}

const lits = []
const re = /JSON\.parse\('/g
let m
while ((m = re.exec(src)) !== null) {
  const { raw, end } = literalAt(src, re.lastIndex)
  lits.push({ raw, start: m.index, end })
  re.lastIndex = end
}
if (lits.length !== ORDER.length) throw new Error(`expected ${ORDER.length} bundles, found ${lits.length}`)

mkdirSync(join(ROOT, 'locales'), { recursive: true })
const written = []
lits.forEach((lit, i) => {
  const code = ORDER[i]
  const target = code in RENAME ? RENAME[code] : code
  if (target === null) return
  const obj = JSON.parse(eval("'" + lit.raw + "'"))
  writeFileSync(join(ROOT, 'locales', `${target}.json`), JSON.stringify(obj, null, 1) + '\n')
  written.push(target)
})

const enLit = lits[0].raw
const declStart = src.indexOf("let d=JSON.parse('")
const initAnchor = ';l.Ay.isInitialized||'
const declEnd = src.indexOf(initAnchor, declStart)
if (declStart < 0 || declEnd < 0) throw new Error('declaration span not found')
src = src.slice(0, declStart) + `let d=JSON.parse('${enLit}'),g={en:{translation:d}}` + src.slice(declEnd)

const INIT = 'l.Ay.isInitialized||l.Ay.use(c.A).use(s.r9).init({resources:g,fallbackLng:"en",interpolation:{escapeValue:!1},detection:{order:["localStorage","navigator"],caches:["localStorage"]}});'
if (!src.includes(INIT)) throw new Error('init call not found')
const LOADER = 'l.Ay.isInitialized||(l.Ay.use(c.A).use(s.r9).init({resources:g,fallbackLng:"en",interpolation:{escapeValue:!1},detection:{order:["localStorage","navigator"],caches:["localStorage"]}}),function(){var L=l.Ay,C={en:1},N=function(x){return x==="tl"||!x?"en":x},F=function(x){x=N(x);return C[x]?Promise.resolve(x):fetch("/locales/"+x+".json").then(function(r){return r.ok?r.json():null}).then(function(j){if(j)L.addResourceBundle(x,"translation",j,!0,!0);C[x]=1;return x}).catch(function(){return x})},O=L.changeLanguage.bind(L);L.changeLanguage=function(x){var a=[].slice.call(arguments,1);return F(x).then(function(y){return O.apply(null,[y].concat(a))})};var k=N(L.language);if(!C[k])F(k).then(function(){L.emit("languageChanged",k)})}());'
src = src.replace(INIT, LOADER)

const PICKER = /let d=\[\{code:"en",name:"English"\}[^\]]*\];/
if (!PICKER.test(src)) throw new Error('language picker array not found')
const picker = written.map(c => {
  const name = { en: 'English', ko: '한국어', ja: '日本語', zh: '简体中文', id: 'Bahasa Indonesia', ar: 'اللغة العربية' }[c]
  return `{code:"${c}",name:"${name}"}`
}).join(',')
src = src.replace(PICKER, `let d=[${picker}];`)

writeFileSync(path, src)
console.log('locales written:', written.join(', '))
console.log('layout chunk:', readFileSync(path, 'utf8').length, 'bytes')
