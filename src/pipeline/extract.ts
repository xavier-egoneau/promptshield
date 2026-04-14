import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import type { ExtractResult } from '../types.js'

export function extract(html: string): ExtractResult {
  const dom = new JSDOM(html, { url: 'https://localhost/' })
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
