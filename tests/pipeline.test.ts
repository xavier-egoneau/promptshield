import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { runPipeline } from '../src/pipeline/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = resolve(__dirname, '../fixtures')

function readFixture(level: string, file: string): string {
  return readFileSync(resolve(fixturesDir, level, file), 'utf-8')
}

// ─── Niveau 1 : injections grossières ───────────────────────────────────────

describe('niveau 1 — injections grossières et explicites', () => {
  it('basic-ignore-instructions : score ≥ 40 et signal direct_instruction', async () => {
    const html = readFixture('level-1', 'basic-ignore-instructions.html')
    const result = await runPipeline(html, 'fixture/level-1/basic-ignore-instructions.html')

    expect(result.risk_score).toBeGreaterThanOrEqual(40)
    expect(result.signals.some((s) => s.type === 'direct_instruction')).toBe(true)
    // Les injections visibles restent dans cleaned_text (on les détecte, on ne les supprime pas).
    // Le consommateur sait via signals qu'elles ne doivent pas être traitées comme des instructions.
  })

  it('role-override : score ≥ 30 et signal jailbreak ou role_override', async () => {
    const html = readFixture('level-1', 'role-override.html')
    const result = await runPipeline(html, 'fixture/level-1/role-override.html')

    expect(result.risk_score).toBeGreaterThanOrEqual(30)
    const types = result.signals.map((s) => s.type)
    expect(types.some((t) => t === 'jailbreak' || t === 'role_override')).toBe(true)
  })

  it('direct-jailbreak : score ≥ 35 et signal jailbreak', async () => {
    const html = readFixture('level-1', 'direct-jailbreak.html')
    const result = await runPipeline(html, 'fixture/level-1/direct-jailbreak.html')

    expect(result.risk_score).toBeGreaterThanOrEqual(35)
    expect(result.signals.some((s) => s.type === 'jailbreak')).toBe(true)
  })
})

// ─── Niveau 2 : injections déguisées ────────────────────────────────────────

describe('niveau 2 — injections déguisées dans du contenu légitime', () => {
  it('disguised-in-article : score ≥ 25 et signaux direct_instruction ou role_override', async () => {
    const html = readFixture('level-2', 'disguised-in-article.html')
    const result = await runPipeline(html, 'fixture/level-2/disguised-in-article.html')

    expect(result.risk_score).toBeGreaterThanOrEqual(25)
    const types = result.signals.map((s) => s.type)
    expect(types.some((t) => t === 'direct_instruction' || t === 'role_override')).toBe(true)
  })

  it('fake-system-prompt : score ≥ 25 et signal meta_instruction', async () => {
    const html = readFixture('level-2', 'fake-system-prompt.html')
    const result = await runPipeline(html, 'fixture/level-2/fake-system-prompt.html')

    expect(result.risk_score).toBeGreaterThanOrEqual(25)
    expect(result.signals.some((s) => s.type === 'meta_instruction')).toBe(true)
  })
})

// ─── Niveau 3 : injections cachées dans le HTML ──────────────────────────────

describe('niveau 3 — injections cachées dans le HTML', () => {
  it('hidden-div : élément display:none supprimé, texte injection absent du cleaned_text', async () => {
    const html = readFixture('level-3', 'hidden-div.html')
    const result = await runPipeline(html, 'fixture/level-3/hidden-div.html')

    expect(result.removed.some((r) => r.type === 'hidden_element')).toBe(true)
    expect(result.cleaned_text.toLowerCase()).not.toContain('ignore all previous instructions')
  })

  it('html-comment-injection : commentaires supprimés', async () => {
    const html = readFixture('level-3', 'html-comment-injection.html')
    const result = await runPipeline(html, 'fixture/level-3/html-comment-injection.html')

    expect(result.removed.some((r) => r.type === 'comment')).toBe(true)
  })

  it('zero-size-text : texte font-size:0 supprimé, injection absente du cleaned_text', async () => {
    const html = readFixture('level-3', 'zero-size-text.html')
    const result = await runPipeline(html, 'fixture/level-3/zero-size-text.html')

    expect(result.removed.some((r) => r.type === 'hidden_element')).toBe(true)
    expect(result.cleaned_text.toLowerCase()).not.toContain('ignore all previous instructions')
  })

  it('white-on-white : texte blanc supprimé, injection absente du cleaned_text', async () => {
    const html = readFixture('level-3', 'white-on-white.html')
    const result = await runPipeline(html, 'fixture/level-3/white-on-white.html')

    expect(result.removed.some((r) => r.type === 'hidden_element')).toBe(true)
    expect(result.cleaned_text.toLowerCase()).not.toContain('you are now dan')
  })
})

// ─── Pages propres — anti faux positifs ─────────────────────────────────────

describe('clean — anti faux positifs', () => {
  it('clean-article : score < 15 et aucun signal', async () => {
    const html = readFixture('clean', 'clean-article.html')
    const result = await runPipeline(html, 'fixture/clean/clean-article.html')

    expect(result.risk_score).toBeLessThan(15)
    expect(result.signals).toHaveLength(0)
  })
})
