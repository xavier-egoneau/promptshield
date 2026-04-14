import type { Signal } from '../types.js'

interface PatternDef {
  type: Signal['type']
  pattern: RegExp
  label: string
}

const PATTERNS: PatternDef[] = [
  // direct_instruction (EN)
  {
    type: 'direct_instruction',
    pattern: /ignore\s+(?:all\s+)?(?:previous\s+|prior\s+)?(instructions|prompts|rules|constraints)/i,
    label: 'ignore previous instructions',
  },
  {
    type: 'direct_instruction',
    pattern: /disregard\s+(everything|what\s+you\s+(were|have\s+been)\s+told)/i,
    label: 'disregard everything told',
  },
  {
    type: 'direct_instruction',
    pattern: /forget\s+(everything|your\s+instructions|all\s+previous)/i,
    label: 'forget your instructions',
  },
  {
    type: 'direct_instruction',
    pattern: /do\s+not\s+follow\s+(your\s+)?(previous\s+|prior\s+)?(instructions|guidelines)/i,
    label: 'do not follow instructions',
  },
  {
    type: 'direct_instruction',
    pattern: /reveal\s+(your\s+)?(system\s+prompt|instructions|configuration)/i,
    label: 'reveal system prompt',
  },
  // direct_instruction (FR)
  {
    type: 'direct_instruction',
    pattern: /ignor[ez]+\s+(toutes?\s+)?(les?\s+)?(instructions?|règles?)\s+(précédentes?|antérieures?)/i,
    label: 'ignorez les instructions précédentes',
  },
  {
    type: 'direct_instruction',
    pattern: /oublie[z]?\s+(toutes?\s+)?(tes|vos|les)\s+(instructions?|règles?)/i,
    label: 'oublie tes instructions',
  },
  {
    type: 'direct_instruction',
    pattern: /révèle[z]?\s+(ton|votre)\s+(prompt\s+système|system\s+prompt|configuration)/i,
    label: 'révèle ton system prompt',
  },
  // role_override (EN)
  {
    type: 'role_override',
    pattern: /you\s+are\s+now\s+[a-z]/i,
    label: 'you are now',
  },
  {
    type: 'role_override',
    pattern: /act\s+as\s+(a\s+|an\s+|the\s+)\w/i,
    label: 'act as',
  },
  {
    type: 'role_override',
    pattern: /pretend\s+(to\s+be|you\s+are)/i,
    label: 'pretend to be',
  },
  {
    type: 'role_override',
    pattern: /your\s+(new\s+)?role\s+is/i,
    label: 'your role is',
  },
  {
    type: 'role_override',
    pattern: /from\s+now\s+on\s+(you\s+are|act|behave)/i,
    label: 'from now on',
  },
  {
    type: 'role_override',
    pattern: /operating\s+in\s+unrestricted\s+mode/i,
    label: 'operating in unrestricted mode',
  },
  // role_override (FR)
  {
    type: 'role_override',
    pattern: /tu\s+es\s+(maintenant|désormais)\s+[a-zàéèêëïîôùûü]/i,
    label: 'tu es maintenant',
  },
  {
    type: 'role_override',
    pattern: /agis?\s+(comme|en\s+tant\s+que)\s+(un[e]?\s+|le\s+|la\s+)?\w/i,
    label: 'agis comme',
  },
  {
    type: 'role_override',
    pattern: /ton\s+(nouveau\s+)?rôle\s+est/i,
    label: 'ton rôle est',
  },
  // jailbreak (EN)
  {
    type: 'jailbreak',
    pattern: /\bDAN\b/,
    label: 'DAN',
  },
  {
    type: 'jailbreak',
    pattern: /without\s+(any\s+)?(restrictions|limits|filters|guidelines|constraints)/i,
    label: 'without restrictions',
  },
  {
    type: 'jailbreak',
    pattern: /developer\s+mode/i,
    label: 'developer mode',
  },
  {
    type: 'jailbreak',
    pattern: /\bjailbreak\b/i,
    label: 'jailbreak',
  },
  {
    type: 'jailbreak',
    pattern: /bypass\s+(your\s+)?(safety|filter|restriction|guideline)/i,
    label: 'bypass safety',
  },
  {
    type: 'jailbreak',
    pattern: /no\s+content\s+(policy|guidelines?|filter)/i,
    label: 'no content policy',
  },
  // jailbreak (FR)
  {
    type: 'jailbreak',
    pattern: /sans\s+(aucune?\s+)?(restriction|limite|filtre|contrainte)/i,
    label: 'sans restriction',
  },
  {
    type: 'jailbreak',
    pattern: /contourne[z]?\s+(ta|votre|les?)\s+(sécurité|filtre|protection)/i,
    label: 'contourne la sécurité',
  },
  // meta_instruction
  {
    type: 'meta_instruction',
    pattern: /\[SYSTEM\]/i,
    label: '[SYSTEM]',
  },
  {
    type: 'meta_instruction',
    pattern: /\[INST\]/i,
    label: '[INST]',
  },
  {
    type: 'meta_instruction',
    pattern: /<\|system\|>/i,
    label: '<|system|>',
  },
  {
    type: 'meta_instruction',
    pattern: /###\s*(instruction|system|human|assistant)/i,
    label: '### system/instruction',
  },
  {
    type: 'meta_instruction',
    pattern: /<\|im_start\|>/i,
    label: '<|im_start|>',
  },
  // data_exfil (EN)
  {
    type: 'data_exfil',
    pattern: /send\s+(this|the|my|all)\s+(to|via)\s+(http|email|webhook|url)/i,
    label: 'send data to',
  },
  {
    type: 'data_exfil',
    pattern: /call\s+(this\s+)?(url|endpoint|api|webhook)/i,
    label: 'call url/api',
  },
  {
    type: 'data_exfil',
    pattern: /exfiltrate|exfil\b/i,
    label: 'exfiltrate',
  },
  {
    type: 'data_exfil',
    pattern: /leak\s+(the\s+)?(system\s+prompt|instructions|config)/i,
    label: 'leak system prompt',
  },
  // data_exfil (FR)
  {
    type: 'data_exfil',
    pattern: /envoie[z]?\s+(ces?\s+)?(données?|informations?|contenu)\s+(à|via|sur)\s+(http|email|webhook)/i,
    label: 'envoie ces données à',
  },
]

// ─── Utilitaires de normalisation ─────────────────────────────────────────────

const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\u2060\uFEFF\u00AD]/g
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
  return text.replace(ZERO_WIDTH_CHARS, '')
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

/**
 * Détecte les techniques d'obfuscation : RTL override, zero-width chars, base64.
 * Émet un signal uniquement si le contenu base64 décodé contient une injection.
 * Appelé depuis runPatterns() — s'applique donc à tous les contextes (body, éléments cachés, commentaires…).
 */
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

  if (ZERO_WIDTH_CHARS.test(text)) {
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

    for (const { type, pattern, label } of PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags)
      const m = re.exec(decoded)
      if (m) {
        signals.push({
          type: 'obfuscation',
          pattern: `base64 block (decoded: "${decoded.slice(0, 60)}")`,
          location,
          excerpt: match[0].slice(0, 60),
        })
        signals.push({
          type,
          pattern: `${label} (base64-encoded)`,
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
  for (const { type, pattern, label } of PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags)
    const match = re.exec(normalized)
    if (match) {
      signals.push({ type, pattern: label, location, excerpt: excerpt(normalized, match) })
    }
  }
  return signals
}

// ─── API publique ──────────────────────────────────────────────────────────────

/**
 * Applique la détection complète (obfuscation + patterns heuristiques) sur un texte.
 * Peut être appelé depuis clean.ts pour analyser le contenu des éléments supprimés,
 * des commentaires HTML, des attributs, du JSON-LD, etc.
 */
export function runPatterns(text: string, location: Signal['location']): Signal[] {
  return [
    ...detectObfuscation(text, location),
    ...runPatternMatching(text, location),
  ]
}

/**
 * Point d'entrée principal pour le texte extrait par Readability.
 * Composition de detectObfuscation + runPatternMatching sur 'body_text'.
 */
export function detect(rawText: string): Signal[] {
  return runPatterns(rawText, 'body_text')
}
