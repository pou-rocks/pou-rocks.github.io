import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

export const TARGET_LOCALES = [
  'en', 'ko', 'ja', 'zh', 'zh-Hant', 'ar', 'id', 'th',
  'vi', 'tr', 'de', 'fr', 'es', 'pt', 'it', 'ru',
]

export const RTL_LOCALES = ['ar']

export const BUDGET = {
  layoutChunkBytes: 48 * 1024,
  localeFileBytes: 16 * 1024,
}

export function walk(dir, filter, acc = []) {
  const base = join(ROOT, dir)
  if (!existsSync(base)) return acc
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    const rel = join(dir, entry.name)
    if (entry.isDirectory()) walk(rel, filter, acc)
    else if (filter(rel)) acc.push(rel)
  }
  return acc
}

export const chunks = () => walk('_next/static', f => f.endsWith('.js'))
export const htmlFiles = () => walk('.', f => f.endsWith('.html') && !f.startsWith('.github'))
export const read = rel => readFileSync(join(ROOT, rel), 'utf8')
export const bytes = rel => statSync(join(ROOT, rel)).size
export const has = rel => existsSync(join(ROOT, rel))

export function localeFiles() {
  if (!has('locales')) return []
  return readdirSync(join(ROOT, 'locales')).filter(f => f.endsWith('.json'))
}

export function loadLocale(code) {
  return JSON.parse(read(join('locales', `${code}.json`)))
}

export function layoutChunk() {
  const hit = chunks().find(f => /app\/layout-[0-9a-f]+\.js$/.test(f))
  if (!hit) throw new Error('layout chunk not found')
  return hit
}

export function flatKeys(obj, prefix = '', acc = {}) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) flatKeys(v, `${prefix}${k}.`, acc)
    else acc[`${prefix}${k}`] = v
  }
  return acc
}
