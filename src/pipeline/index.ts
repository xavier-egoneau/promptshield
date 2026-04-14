import { extract } from './extract.js'
import { clean } from './clean.js'
import { detect } from './detect.js'
import { score } from './score.js'
import { buildOutput } from './output.js'
import type { ShieldResult } from '../types.js'
import { mergeConfig } from '../config.js'
import type { ShieldConfig } from '../config.js'

export async function runPipeline(
  html: string,
  source: string,
  configOverrides?: Partial<ShieldConfig>,
): Promise<ShieldResult> {
  const config = mergeConfig(configOverrides)

  // 1. Nettoyer le HTML brut en premier — avant Readability —
  //    pour capturer les éléments cachés avec leurs styles intacts.
  const cleaned = clean(html)

  // 2. Extraire le contenu principal depuis le HTML déjà nettoyé.
  const extracted = extract(cleaned.cleanedHtml)

  // 3. Détecter les signaux dans le texte Readability + fusionner les signaux d'attributs.
  const textSignals = detect(extracted.textContent)
  const signals = [...cleaned.attrSignals, ...textSignals]

  // 4. Scorer avec les poids configurables.
  const { risk_score, risk_level } = score(signals, config.signalWeights)

  return buildOutput({
    source,
    title: extracted.title,
    cleanedText: extracted.textContent,
    signals,
    removed: cleaned.removed,
    risk_score,
    risk_level,
  })
}
