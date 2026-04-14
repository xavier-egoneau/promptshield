import { franc } from 'franc'
import type { Signal } from '../types.js'
import { ALL_PATTERNS, I18N_PATTERNS } from './patterns-i18n.js'
import type { PatternDef } from './patterns-i18n.js'

// ─── Utilitaires de normalisation ─────────────────────────────────────────────

// Fix 1 — deux constantes distinctes :
//   ZERO_WIDTH_RE  (sans g) pour .test() — stateless, pas de lastIndex
//   ZERO_WIDTH_GLOBAL (avec g) pour .replace() — usage inline
const ZERO_WIDTH_RE = /[\u200B\u200C\u200D\u2060\uFEFF\u00AD]/
const ZERO_WIDTH_GLOBAL = /[\u200B\u200C\u200D\u2060\uFEFF\u00AD]/g

// RTL override — pas de flag g, .test() est stateless
const RTL_OVERRIDE = /\u202E/

const BASE64_BLOCK = /[A-Za-z0-9+/]{40,}={0,2}/g

const HOMOGLYPH_MAP: Record<string, string> = {
  '\u0430': 'a', '\u0435': 'e', '\u043E': 'o', '\u0440': 'r', '\u0441': 'c',
  '\u0443': 'u', '\u0445': 'x', '\u0456': 'i', '\u0406': 'I', '\u04CF': 'i',
  '\u0410': 'A', '\u0412': 'B', '\u0415': 'E', '\u041A': 'K', '\u041C': 'M',
  '\u041D': 'H', '\u041E': 'O', '\u0420': 'P', '\u0421': 'C', '\u0422': 'T',
  '\u0425': 'X',
}

function normalizeHomoglyphs(text: string): string {
  return text.split('').map((c) => HOMOGLYPH_MAP[c] ?? c).join('')
}

function stripZeroWidth(text: string): string {
  return text.replace(ZERO_WIDTH_GLOBAL, '')
}

function excerpt(text: string, match: RegExpExecArray): string {
  const start = Math.max(0, match.index - 30)
  const end = Math.min(text.length, match.index + match[0].length + 50)
  return text.slice(start, end).replace(/\s+/g, ' ').trim().slice(0, 120)
}

function decodeBase64Safe(b64: string): string | null {
  try {
    return Buffer.from(b64, 'base64').toString('utf-8')
  } catch {
    return null
  }
}

// ─── Détection d'obfuscation ───────────────────────────────────────────────────

function detectObfuscation(text: string, location: Signal['location'], patterns: PatternDef[]): Signal[] {
  const signals: Signal[] = []

  if (RTL_OVERRIDE.test(text)) {
    signals.push({
      type: 'obfuscation',
      pattern: 'RTL override character (U+202E)',
      location,
      excerpt: text.replace(/\s+/g, ' ').trim().slice(0, 120),
    })
  }

  // Fix 1 — ZERO_WIDTH_RE sans flag g pour .test() stateless
  if (ZERO_WIDTH_RE.test(text)) {
    signals.push({
      type: 'obfuscation',
      pattern: 'zero-width characters',
      location,
      excerpt: text.replace(/\s+/g, ' ').trim().slice(0, 120),
    })
  }

  // Base64 : signal uniquement si le contenu décodé contient une injection
  for (const match of text.matchAll(new RegExp(BASE64_BLOCK.source, 'g'))) {
    const decoded = decodeBase64Safe(match[0])
    if (!decoded || decoded.length <= 10 || !/[a-z]{3,}/i.test(decoded)) continue

    for (const def of patterns) {
      const m = def.re.exec(decoded)
      if (m) {
        signals.push({
          type: 'obfuscation',
          pattern: `base64 block (decoded: "${decoded.slice(0, 60)}")`,
          location,
          excerpt: match[0].slice(0, 60),
        })
        signals.push({
          type: def.type,
          pattern: `${def.label} (base64-encoded)`,
          location,
          excerpt: decoded.slice(0, 120),
        })
        break
      }
    }
  }

  return signals
}

// ─── Correspondance de patterns heuristiques ──────────────────────────────────

function runPatternMatching(text: string, location: Signal['location'], patterns: PatternDef[]): Signal[] {
  const signals: Signal[] = []
  const normalized = normalizeHomoglyphs(stripZeroWidth(text))
  for (const def of patterns) {
    const match = def.re.exec(normalized)
    if (match) {
      signals.push({ type: def.type, pattern: def.label, location, excerpt: excerpt(normalized, match) })
    }
  }
  return signals
}

function deduplicatePatterns(patterns: PatternDef[]): PatternDef[] {
  const seen = new Set<string>()
  return patterns.filter((p) => {
    const key = `${p.type}:${p.label}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ─── API publique ──────────────────────────────────────────────────────────────

// Pour les snippets courts (éléments cachés, commentaires, attributs) :
// on ne peut pas détecter la langue de 5 mots → ALL_PATTERNS couvre tout
export function runPatterns(text: string, location: Signal['location']): Signal[] {
  return [
    ...detectObfuscation(text, location, ALL_PATTERNS),
    ...runPatternMatching(text, location, ALL_PATTERNS),
  ]
}

// Double passe : EN toujours + langue locale si détectée et différente de EN
export function detect(rawText: string): Signal[] {
  const enPatterns = I18N_PATTERNS.get('eng') ?? []

  const detectedLang = franc(rawText, { minLength: 50 })
  const localePatterns =
    detectedLang !== 'eng' && detectedLang !== 'und'
      ? (I18N_PATTERNS.get(detectedLang) ?? [])
      : []

  const combined = deduplicatePatterns([...enPatterns, ...localePatterns])

  return [
    ...detectObfuscation(rawText, 'body_text', combined),
    ...runPatternMatching(rawText, 'body_text', combined),
  ]
}
