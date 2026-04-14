import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { fetchUrl } from '../pipeline/fetch.js'
import { extract } from '../pipeline/extract.js'

interface UrlEntry {
  url: string
  category: string
  note: string
}

interface ManifestEntry {
  url: string
  category: string
  note: string
  filename: string
  title: string | null
  crawled_at: string
  error?: string
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function crawlCleanCorpus(urlsFile: string, outputDir: string): Promise<void> {
  const entries: UrlEntry[] = JSON.parse(readFileSync(urlsFile, 'utf-8'))
  const cleanDir = join(outputDir, 'clean')

  if (!existsSync(cleanDir)) mkdirSync(cleanDir, { recursive: true })

  const manifest: ManifestEntry[] = []

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const filename = `${sha256(entry.url)}.html`
    const filePath = join(cleanDir, filename)

    process.stdout.write(`[${i + 1}/${entries.length}] ${entry.url} ... `)

    try {
      const { html, finalUrl } = await fetchUrl(entry.url)
      writeFileSync(filePath, html, 'utf-8')

      const extracted = extract(html)
      manifest.push({
        url: finalUrl,
        category: entry.category,
        note: entry.note,
        filename,
        title: extracted.title,
        crawled_at: new Date().toISOString(),
      })
      console.log(`✓ (${Math.round(html.length / 1024)} KB)`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`✗ ${msg}`)
      manifest.push({
        url: entry.url,
        category: entry.category,
        note: entry.note,
        filename,
        title: null,
        crawled_at: new Date().toISOString(),
        error: msg,
      })
    }

    // Délai poli entre les requêtes
    if (i < entries.length - 1) await sleep(500)
  }

  const manifestPath = join(cleanDir, 'manifest.json')
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

  const ok = manifest.filter((e) => !e.error).length
  const fail = manifest.filter((e) => e.error).length
  console.log(`\nCrawl terminé — ${ok} succès, ${fail} erreurs`)
  console.log(`Manifest sauvegardé : ${manifestPath}`)
}
