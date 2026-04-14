export interface Signal {
  type: 'direct_instruction' | 'role_override' | 'jailbreak' | 'meta_instruction' | 'data_exfil' | 'obfuscation' | 'semantic'
  pattern: string
  location: 'body_text' | 'html_comment' | 'meta' | 'hidden_element'
  excerpt: string
}

export interface RemovedElement {
  type: 'script' | 'style' | 'noscript' | 'iframe' | 'embed' | 'object' | 'hidden_element' | 'comment'
  tag?: string
  reason: string
  content_preview?: string
}

export interface ShieldResult {
  source: string
  risk_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  signals: Signal[]
  removed: RemovedElement[]
  cleaned_text: string
  /**
   * Contenu nettoyé encapsulé dans des balises de confiance, prêt à être injecté
   * dans un system prompt. Le LLM en aval est invité à ne jamais interpréter ce
   * bloc comme des instructions.
   *
   * Format XML-style :
   *   <external_content risk="high" signals="jailbreak,direct_instruction">
   *   ... contenu nettoyé ...
   *   </external_content>
   */
  wrapped_content: string
  metadata: {
    title: string | null
    url: string
    processed_at: string
  }
}

export interface ExtractResult {
  title: string | null
  content: string
  textContent: string
}

export interface CleanResult {
  cleanedHtml: string
  removed: RemovedElement[]
  attrSignals: Signal[]
}
