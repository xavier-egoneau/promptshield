import type { Signal } from '../types.js'

interface PatternDef {
  type: Signal['type']
  pattern: RegExp
  label: string
}

const PATTERNS: PatternDef[] = [
  // direct_instruction
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
  // role_override
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
  // jailbreak
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
  // data_exfil
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
]

// Caractères zero-width qui servent à dissimuler du texte
const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\u2060\uFEFF\u00AD]/g

// RTL override (U+202E) — retourne l'ordre visuel du texte
const RTL_OVERRIDE = /\u202E/

// Base64 blocks suffisamment longs pour contenir une instruction cachée (≥ 40 chars)
const BASE64_BLOCK = /[A-Za-z0-9+/]{40,}={0,2}/g

// Table de translittération des homoglyphes Cyrilliques → Latin les plus courants
const HOMOGLYPH_MAP: Record<string, string> = {
  '\u0430': 'a', // а → a
  '\u0435': 'e', // е → e
  '\u043E': 'o', // о → o
  '\u0440': 'r', // р → r
  '\u0441': 'c', // с → c
  '\u0443': 'u', // у → u
  '\u0445': 'x', // х → x
  '\u0456': 'i', // і → i
  '\u0406': 'I', // І → I
  '\u04CF': 'i', // ӏ → l/i
  '\u0410': 'A', // А → A
  '\u0412': 'B', // В → B
  '\u0415': 'E', // Е → E
  '\u041A': 'K', // К → K
  '\u041C': 'M', // М → M
  '\u041D': 'H', // Н → H
  '\u041E': 'O', // О → O
  '\u0420': 'P', // Р → P
  '\u0421': 'C', // С → C
  '\u0422': 'T', // Т → T
  '\u0425': 'X', // Х → X
}

function normalizeHomoglyphs(text: string): string {
  return text
    .split('')
    .map((c) => HOMOGLYPH_MAP[c] ?? c)
    .join('')
}

function stripZeroWidth(text: string): string {
  return text.replace(ZERO_WIDTH_CHARS, '')
}

function excerpt(text: string, match: RegExpExecArray): string {
  const start = Math.max(0, match.index - 30)
  const end = Math.min(text.length, match.index + match[0].length + 50)
  const raw = text.slice(start, end).replace(/\s+/g, ' ').trim()
  return raw.slice(0, 120)
}

function decodeBase64Safe(b64: string): string | null {
  try {
    return Buffer.from(b64, 'base64').toString('utf-8')
  } catch {
    return null
  }
}

/**
 * Applique les patterns heuristiques sur un texte et retourne les signaux trouvés.
 * Peut être appelé depuis clean.ts pour analyser le contenu des éléments supprimés.
 */
export function runPatterns(text: string, location: Signal['location']): Signal[] {
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

export function detect(rawText: string): Signal[] {
  const signals: Signal[] = []

  // 1. Détecter le RTL override avant toute normalisation
  if (RTL_OVERRIDE.test(rawText)) {
    signals.push({
      type: 'obfuscation',
      pattern: 'RTL override character (U+202E)',
      location: 'body_text',
      excerpt: rawText.replace(/\s+/g, ' ').trim().slice(0, 120),
    })
  }

  // 2. Détecter les zero-width chars (hors RTL override déjà traité)
  if (ZERO_WIDTH_CHARS.test(rawText)) {
    signals.push({
      type: 'obfuscation',
      pattern: 'zero-width characters',
      location: 'body_text',
      excerpt: rawText.replace(/\s+/g, ' ').trim().slice(0, 120),
    })
  }

  // 3. Détecter et tenter de décoder les blocs base64
  const base64Matches = [...rawText.matchAll(BASE64_BLOCK)]
  for (const match of base64Matches) {
    const decoded = decodeBase64Safe(match[0])
    if (decoded && decoded.length > 10 && /[a-z]{3,}/i.test(decoded)) {
      // Vérifier si le contenu décodé est suspect
      const isInstructionDecoded = PATTERNS.some((p) => p.pattern.test(decoded))
      signals.push({
        type: 'obfuscation',
        pattern: `base64 block (decoded: "${decoded.slice(0, 60)}")`,
        location: 'body_text',
        excerpt: match[0].slice(0, 60),
      })
      if (isInstructionDecoded) {
        // Ajouter aussi le signal d'injection sur le texte décodé
        for (const { type, pattern, label } of PATTERNS) {
          const re = new RegExp(pattern.source, pattern.flags)
          const m = re.exec(decoded)
          if (m) {
            signals.push({
              type,
              pattern: `${label} (base64-encoded)`,
              location: 'body_text',
              excerpt: decoded.slice(0, 120),
            })
            break
          }
        }
      }
    }
  }

  // 4. Normaliser : retirer zero-width, normaliser homoglyphes, puis appliquer les patterns
  const normalized = normalizeHomoglyphs(stripZeroWidth(rawText))

  for (const { type, pattern, label } of PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags)
    const match = re.exec(normalized)
    if (match) {
      signals.push({
        type,
        pattern: label,
        location: 'body_text',
        excerpt: excerpt(normalized, match),
      })
    }
  }

  return signals
}
