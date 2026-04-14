import type { Signal, ShieldResult } from '../types.js'
import type { SignalWeights } from '../config.js'
import { DEFAULT_CONFIG } from '../config.js'

function riskLevel(score: number): ShieldResult['risk_level'] {
  if (score >= 75) return 'critical'
  if (score >= 50) return 'high'
  if (score >= 25) return 'medium'
  return 'low'
}

export function score(
  signals: Signal[],
  weights: SignalWeights = DEFAULT_CONFIG.signalWeights,
): { risk_score: number; risk_level: ShieldResult['risk_level'] } {
  const seenTypes = new Set<Signal['type']>()
  let total = 0
  for (const signal of signals) {
    if (!seenTypes.has(signal.type)) {
      total += weights[signal.type] ?? 0
      seenTypes.add(signal.type)
    }
  }
  const risk_score = Math.min(total, 100)
  return { risk_score, risk_level: riskLevel(total) }
}
