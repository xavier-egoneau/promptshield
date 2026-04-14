import type { Signal } from '../types.js'

interface PatternDef {
  type: Signal['type']
  re: RegExp
  label: string
}

const PATTERNS: PatternDef[] = [
  // direct_instruction (EN)
  { type: 'direct_instruction', re: /ignore\s+(?:all\s+)?(?:previous\s+|prior\s+)?(instructions|prompts|rules|constraints)/i, label: 'ignore previous instructions' },
  { type: 'direct_instruction', re: /disregard\s+(everything|what\s+you\s+(were|have\s+been)\s+told)/i, label: 'disregard everything told' },
  { type: 'direct_instruction', re: /forget\s+(everything|your\s+instructions|all\s+previous)/i, label: 'forget your instructions' },
  { type: 'direct_instruction', re: /do\s+not\s+follow\s+(your\s+)?(previous\s+|prior\s+)?(instructions|guidelines)/i, label: 'do not follow instructions' },
  { type: 'direct_instruction', re: /reveal\s+(your\s+)?(system\s+prompt|instructions|configuration)/i, label: 'reveal system prompt' },
  // direct_instruction (FR) — flag u pour folding Unicode sur accents
  { type: 'direct_instruction', re: /ignor[ez]+\s+(toutes?\s+)?(les?\s+)?(instructions?|règles?)\s+(précédentes?|antérieures?)/iu, label: 'ignorez les instructions précédentes' },
  { type: 'direct_instruction', re: /oublie[z]?\s+(toutes?\s+)?(tes|vos|les)\s+(instructions?|règles?)/iu, label: 'oublie tes instructions' },
  { type: 'direct_instruction', re: /révèle[z]?\s+(ton|votre)\s+(prompt\s+système|system\s+prompt|configuration)/iu, label: 'révèle ton system prompt' },
  // role_override (EN)
  { type: 'role_override', re: /you\s+are\s+now\s+[a-z]/i, label: 'you are now' },
  { type: 'role_override', re: /act\s+as\s+(a\s+|an\s+|the\s+)\w/i, label: 'act as' },
  { type: 'role_override', re: /pretend\s+(to\s+be|you\s+are)/i, label: 'pretend to be' },
  { type: 'role_override', re: /your\s+(new\s+)?role\s+is/i, label: 'your role is' },
  { type: 'role_override', re: /from\s+now\s+on\s+(you\s+are|act|behave)/i, label: 'from now on' },
  { type: 'role_override', re: /operating\s+in\s+unrestricted\s+mode/i, label: 'operating in unrestricted mode' },
  // role_override (FR)
  { type: 'role_override', re: /tu\s+es\s+(maintenant|désormais)\s+[a-zàéèêëïîôùûü]/iu, label: 'tu es maintenant' },
  { type: 'role_override', re: /agis?\s+(comme|en\s+tant\s+que)\s+(un[e]?\s+|le\s+|la\s+)?\w/iu, label: 'agis comme' },
  { type: 'role_override', re: /ton\s+(nouveau\s+)?rôle\s+est/iu, label: 'ton rôle est' },
  // jailbreak (EN)
  { type: 'jailbreak', re: /\bDAN\b/, label: 'DAN' },
  { type: 'jailbreak', re: /without\s+(any\s+)?(restrictions|limits|filters|guidelines|constraints)/i, label: 'without restrictions' },
  { type: 'jailbreak', re: /developer\s+mode/i, label: 'developer mode' },
  { type: 'jailbreak', re: /\bjailbreak\b/i, label: 'jailbreak' },
  { type: 'jailbreak', re: /bypass\s+(your\s+)?(safety|filter|restriction|guideline)/i, label: 'bypass safety' },
  { type: 'jailbreak', re: /no\s+content\s+(policy|guidelines?|filter)/i, label: 'no content policy' },
  // jailbreak (FR)
  { type: 'jailbreak', re: /sans\s+(aucune?\s+)?(restriction|limite|filtre|contrainte)/iu, label: 'sans restriction' },
  { type: 'jailbreak', re: /contourne[z]?\s+(ta|votre|les?)\s+(sécurité|filtre|protection)/iu, label: 'contourne la sécurité' },
  // meta_instruction
  { type: 'meta_instruction', re: /\[SYSTEM\]/i, label: '[SYSTEM]' },
  { type: 'meta_instruction', re: /\[INST\]/i, label: '[INST]' },
  { type: 'meta_instruction', re: /<\|system\|>/i, label: '<|system|>' },
  { type: 'meta_instruction', re: /###\s*(instruction|system|human|assistant)/i, label: '### system/instruction' },
  { type: 'meta_instruction', re: /<\|im_start\|>/i, label: '<|im_start|>' },
  // data_exfil (EN)
  { type: 'data_exfil', re: /send\s+(this|the|my|all)\s+(to|via)\s+(http|email|webhook|url)/i, label: 'send data to' },
  { type: 'data_exfil', re: /call\s+(this\s+)?(url|endpoint|api|webhook)/i, label: 'call url/api' },
  { type: 'data_exfil', re: /exfiltrate|exfil\b/i, label: 'exfiltrate' },
  { type: 'data_exfil', re: /leak\s+(the\s+)?(system\s+prompt|instructions|config)/i, label: 'leak system prompt' },
  // data_exfil (FR)
  { type: 'data_exfil', re: /envoie[z]?\s+(ces?\s+)?(données?|informations?|contenu)\s+(à|via|sur)\s+(http|email|webhook)/iu, label: 'envoie ces données à' },
]

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

function detectObfuscation(text: string, location: Signal['location']): Signal[] {
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

    // Fix 3 — utiliser def.re.exec() directement, sans new RegExp()
    for (const def of PATTERNS) {
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

function runPatternMatching(text: string, location: Signal['location']): Signal[] {
  const signals: Signal[] = []
  const normalized = normalizeHomoglyphs(stripZeroWidth(text))
  // Fix 3 — def.re.exec() directement, pas new RegExp(def.re.source, def.re.flags)
  for (const def of PATTERNS) {
    const match = def.re.exec(normalized)
    if (match) {
      signals.push({ type: def.type, pattern: def.label, location, excerpt: excerpt(normalized, match) })
    }
  }
  return signals
}

// ─── API publique ──────────────────────────────────────────────────────────────

export function runPatterns(text: string, location: Signal['location']): Signal[] {
  return [
    ...detectObfuscation(text, location),
    ...runPatternMatching(text, location),
  ]
}

export function detect(rawText: string): Signal[] {
  return runPatterns(rawText, 'body_text')
}
