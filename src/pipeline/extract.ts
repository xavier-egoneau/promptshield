import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import type { ExtractResult } from '../types.js'

export function extract(html: string, baseUrl = 'https://localhost/'): ExtractResult {
  // baseUrl est transmis à JSDOM pour que Readability resolve les liens relatifs
  // correctement et score la pertinence du contenu avec le bon domaine.
  // Fallback 'localhost' pour le HTML inline sans URL connue.
  const url = baseUrl.startsWith('http') ? baseUrl : 'https://localhost/'
  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (article) {
    return {
      title: article.title || null,
      content: article.content,
      textContent: article.textContent.replace(/\s+/g, ' ').trim(),
    }
  }

  // Fallback : body complet
  const body = dom.window.document.body
  const textContent = body ? body.textContent ?? '' : ''
  return {
    title: dom.window.document.title || null,
    content: body ? body.innerHTML : html,
    textContent: textContent.replace(/\s+/g, ' ').trim(),
  }
}
