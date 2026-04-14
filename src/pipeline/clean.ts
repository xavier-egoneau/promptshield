import * as cheerio from 'cheerio'
import type { CleanResult, RemovedElement, Signal } from '../types.js'
import { runPatterns } from './detect.js'

function isHiddenByStyle(style: string): boolean {
  return (
    /display\s*:\s*none/i.test(style) ||
    /visibility\s*:\s*hidden/i.test(style) ||
    /opacity\s*:\s*0(\s|;|$)/i.test(style) ||
    /font-size\s*:\s*0/i.test(style)
  )
}

function isWhiteOnWhite(style: string): boolean {
  return /color\s*:\s*(white|#fff|#ffffff)\b/i.test(style)
}

const CONTENT_ATTRS = ['alt', 'aria-label', 'aria-description', 'title', 'placeholder', 'data-content']

export function clean(html: string): CleanResult {
  const $ = cheerio.load(html)
  const removed: RemovedElement[] = []
  const attrSignals: Signal[] = []

  // ── Scripts — analyser les JSON-LD avant suppression ────────────────────────
  $('script').each((_, el) => {
    const type = $(el).attr('type') ?? ''
    if (type === 'application/ld+json') {
      const raw = $(el).html() ?? ''
      const sigs = runPatterns(raw.replace(/\s+/g, ' ').trim(), 'meta')
      if (sigs.length > 0) {
        removed.push({
          type: 'script',
          tag: 'script[type=application/ld+json]',
          reason: 'JSON-LD contient des patterns suspects',
          content_preview: raw.slice(0, 80),
        })
        attrSignals.push(...sigs.map((s) => ({ ...s, pattern: `${s.pattern} (JSON-LD)` })))
      } else {
        removed.push({ type: 'script', tag: 'script[type=application/ld+json]', reason: '<script> supprimé' })
      }
    } else {
      removed.push({ type: 'script', tag: 'script', reason: '<script> supprimé' })
    }
    $(el).remove()
  })

  // ── Autres balises dangereuses ───────────────────────────────────────────────
  const dangerTags = ['style', 'noscript', 'iframe', 'object', 'embed'] as const
  for (const tag of dangerTags) {
    $(tag).each((_, el) => {
      removed.push({ type: tag, tag, reason: `<${tag}> supprimé` })
      $(el).remove()
    })
  }

  // ── Commentaires HTML — analyser le contenu avant suppression ───────────────
  $('*').contents().each((_, node) => {
    if (node.type === 'comment') {
      const text = (node as cheerio.CommentNode).data?.trim() ?? ''
      const sigs = text.length > 3 ? runPatterns(text, 'html_comment') : []
      removed.push({
        type: 'comment',
        reason: 'commentaire HTML supprimé',
        content_preview: text.slice(0, 80) || undefined,
      })
      if (sigs.length > 0) attrSignals.push(...sigs)
      $(node).remove()
    }
  })

  // ── Éléments cachés — analyser le contenu avant suppression ─────────────────
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') ?? ''
    const isHidden = isHiddenByStyle(style)
    const isWhite = !isHidden && isWhiteOnWhite(style)
    if (!isHidden && !isWhite) return

    const text = $(el).text().trim()
    const reason = isHidden
      ? `élément caché (${style.trim().slice(0, 60)})`
      : `texte potentiellement invisible (couleur blanche)`

    removed.push({
      type: 'hidden_element',
      tag: el.tagName ?? undefined,
      reason,
      content_preview: text.slice(0, 80) || undefined,
    })

    if (text.length > 3) {
      const sigs = runPatterns(text, 'hidden_element')
      if (sigs.length > 0) attrSignals.push(...sigs)
    }

    $(el).remove()
  })

  // ── Attributs porteurs de contenu (alt, aria-label, title…) ─────────────────
  $('*').each((_, el) => {
    for (const attr of CONTENT_ATTRS) {
      const val = $(el).attr(attr)
      if (!val) continue
      const sigs = runPatterns(val, 'meta')
      if (sigs.length > 0) {
        attrSignals.push(...sigs.map((s) => ({ ...s, pattern: `${s.pattern} (attr [${attr}])` })))
        $(el).attr(attr, '[contenu neutralisé]')
      }
    }
  })

  const cleanedHtml = $.html()
  const cleanedText = $.text().replace(/\s+/g, ' ').trim()

  return { cleanedHtml, cleanedText, removed, attrSignals }
}
