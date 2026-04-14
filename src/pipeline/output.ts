import type { ShieldResult, Signal, RemovedElement } from '../types.js'

interface OutputParams {
  source: string
  title: string | null
  cleanedText: string
  signals: Signal[]
  removed: RemovedElement[]
  risk_score: number
  risk_level: ShieldResult['risk_level']
}

/**
 * Neutralise le tag fermant `</external_content>` s'il apparaît littéralement dans le texte.
 * Un attaquant pourrait l'injecter pour sortir prématurément du bloc non-fiable.
 * Le zero-width space (U+200B) brise la reconnaissance du tag sans altérer la lisibilité.
 */
function sanitizeForWrapping(text: string): string {
  return text.replace(/<\/external_content>/gi, '<\u200B/external_content>')
}

function buildWrappedContent(cleanedText: string, risk_level: ShieldResult['risk_level'], signals: Signal[]): string {
  const signalTypes = [...new Set(signals.map((s) => s.type))].join(',')
  const attrs = [
    `risk="${risk_level}"`,
    signalTypes ? `signals="${signalTypes}"` : null,
  ].filter(Boolean).join(' ')

  return `<external_content ${attrs}>\n${sanitizeForWrapping(cleanedText)}\n</external_content>`
}

export function buildOutput(params: OutputParams): ShieldResult {
  return {
    source: params.source,
    risk_score: params.risk_score,
    risk_level: params.risk_level,
    signals: params.signals,
    removed: params.removed,
    cleaned_text: params.cleanedText,
    wrapped_content: buildWrappedContent(params.cleanedText, params.risk_level, params.signals),
    metadata: {
      title: params.title,
      url: params.source,
      processed_at: new Date().toISOString(),
    },
  }
}
