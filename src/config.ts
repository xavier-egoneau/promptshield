import type { Signal } from './types.js'

export type SignalWeights = Record<Signal['type'], number>

export interface ShieldConfig {
  /** Poids par type de signal (contribue au risk_score). */
  signalWeights: SignalWeights
}

export const DEFAULT_CONFIG: ShieldConfig = {
  signalWeights: {
    data_exfil: 50,
    direct_instruction: 40,
    jailbreak: 35,
    role_override: 30,
    meta_instruction: 25,
    obfuscation: 30,
    semantic: 45,
  },
}

export function mergeConfig(overrides?: Partial<ShieldConfig>): ShieldConfig {
  if (!overrides) return DEFAULT_CONFIG
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    signalWeights: {
      ...DEFAULT_CONFIG.signalWeights,
      ...(overrides.signalWeights ?? {}),
    },
  }
}
