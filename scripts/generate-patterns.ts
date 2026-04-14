#!/usr/bin/env tsx
/**
 * Generates src/pipeline/patterns-i18n.ts from patterns/locales/*.json.
 * Run with: npm run generate:patterns
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

interface LocaleEntry {
  locale: string
  name: string
  franc_code: string
  patterns: Array<{
    type: string
    source: string
    flags: string
    label: string
  }>
}

const ROOT = resolve(import.meta.dirname, '..')
const LOCALES_DIR = join(ROOT, 'patterns', 'locales')
const OUTPUT = join(ROOT, 'src', 'pipeline', 'patterns-i18n.ts')

const files = readdirSync(LOCALES_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()

const locales: LocaleEntry[] = files.map((f) =>
  JSON.parse(readFileSync(join(LOCALES_DIR, f), 'utf-8')) as LocaleEntry,
)

// Validate each locale has required fields
for (const locale of locales) {
  if (!locale.franc_code) throw new Error(`Missing franc_code in locale ${locale.locale}`)
  for (const p of locale.patterns) {
    // Validate the regex compiles
    try {
      new RegExp(p.source, p.flags)
    } catch (e) {
      throw new Error(`Invalid regex in ${locale.locale}: source="${p.source}" flags="${p.flags}" — ${e}`)
    }
  }
}

function serializePattern(p: { type: string; source: string; flags: string; label: string }): string {
  const flagsArg = p.flags ? `, '${p.flags}'` : ''
  // Escape backticks in source for template literal safety
  const safeSource = p.source.replace(/\\/g, '\\\\').replace(/`/g, '\\`')
  return `  { type: '${p.type}', re: new RegExp(\`${safeSource}\`${flagsArg}), label: '${p.label.replace(/'/g, "\\'")}' }`
}

const mapEntries = locales
  .map((locale) => {
    const patterns = locale.patterns.map(serializePattern).join(',\n')
    return `  ['${locale.franc_code}', [\n${patterns},\n  ]]`
  })
  .join(',\n')

const allPatterns = locales
  .flatMap((locale) => locale.patterns)
  .map(serializePattern)
  .join(',\n')

const output = `// GENERATED — do not edit. Run: npm run generate:patterns
// Source: patterns/locales/*.json

import type { Signal } from '../types.js'

export interface PatternDef {
  type: Signal['type']
  re: RegExp
  label: string
}

export const I18N_PATTERNS = new Map<string, PatternDef[]>([
${mapEntries},
])

export const ALL_PATTERNS: PatternDef[] = [
${allPatterns},
]
`

writeFileSync(OUTPUT, output, 'utf-8')
console.log(`Generated ${OUTPUT} (${locales.length} locales, ${locales.reduce((n, l) => n + l.patterns.length, 0)} patterns total)`)
