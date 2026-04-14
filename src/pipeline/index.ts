import { extract } from './extract.js'
import { clean } from './clean.js'
import { detect } from './detect.js'
import { semanticClassify } from './classify.js'
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
  //    Passer source comme baseUrl pour que Readability ait le bon domaine.
  const extracted = extract(cleaned.cleanedHtml, source)

  // 3. Détecter les signaux dans le texte Readability + fusionner les signaux d'attributs.
  const textSignals = detect(extracted.textContent)
  const heuristicSignals = [...cleaned.attrSignals, ...textSignals]

  // 4. Passe sémantique optionnelle via LLM local (si PROMPTSHIELD_LLM_ENDPOINT est défini).
  //    Point 1 — Skip si le score heuristique dépasse le seuil : le LLM n'apporte rien
  //    quand les heuristiques ont déjà détecté une injection à haute confiance.
  //    Seuil configurable via PROMPTSHIELD_LLM_SKIP_THRESHOLD (défaut : 50).
  const skipThreshold = parseInt(process.env.PROMPTSHIELD_LLM_SKIP_THRESHOLD ?? '50', 10)
  const { risk_score: heuristicScore } = score(heuristicSignals, config.signalWeights)
  const semanticSignals =
    heuristicScore < skipThreshold ? await semanticClassify(extracted.textContent) : []

  const signals = [...heuristicSignals, ...semanticSignals]

  // 5. Scorer avec les poids configurables.
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
