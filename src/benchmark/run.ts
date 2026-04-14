import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { runPipeline } from '../pipeline/index.js'

interface ManifestEntry {
  url: string
  category: string
  note: string
  filename: string
  title: string | null
  crawled_at: string
  error?: string
}

export interface CleanPageResult {
  url: string
  category: string
  filename: string
  risk_score: number
  signal_count: number
  signals: string[]
  is_false_positive: boolean
}

export interface InjectPageResult {
  level: string
  file: string
  risk_score: number
  signal_count: number
  signals: string[]
  is_detected: boolean
}

export interface Metrics {
  threshold: number
  clean_total: number
  false_positives: number
  false_positive_rate: number
  inject_total: number
  true_positives: number
  true_positive_rate: number
  precision: number
  recall: number
  f1: number
}

export interface ThresholdRow {
  threshold: number
  precision: number
  recall: number
  f1: number
  fp: number
  fn: number
}

export interface BenchmarkResult {
  timestamp: string
  threshold: number
  corpus_clean: CleanPageResult[]
  corpus_inject: InjectPageResult[]
  metrics: Metrics
  sensitivity: ThresholdRow[]
}

function computeMetrics(
  clean: CleanPageResult[],
  inject: InjectPageResult[],
  threshold: number,
): Metrics {
  const fp = clean.filter((p) => p.is_false_positive).length
  const tp = inject.filter((p) => p.is_detected).length
  const fn = inject.filter((p) => !p.is_detected).length

  const precision = tp + fp > 0 ? tp / (tp + fp) : 1
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0

  return {
    threshold,
    clean_total: clean.length,
    false_positives: fp,
    false_positive_rate: clean.length > 0 ? fp / clean.length : 0,
    inject_total: inject.length,
    true_positives: tp,
    true_positive_rate: inject.length > 0 ? tp / inject.length : 0,
    precision: Math.round(precision * 1000) / 1000,
    recall: Math.round(recall * 1000) / 1000,
    f1: Math.round(f1 * 1000) / 1000,
  }
}

export async function runBenchmark(
  snapshotsDir: string,
  fixturesDir: string,
  resultsDir: string,
  threshold = 25,
): Promise<BenchmarkResult> {
  const cleanDir = join(snapshotsDir, 'clean')
  const manifestPath = join(cleanDir, 'manifest.json')

  // ── Corpus clean ────────────────────────────────────────────────────────────

  const corpus_clean: CleanPageResult[] = []

  if (existsSync(manifestPath)) {
    const manifest: ManifestEntry[] = JSON.parse(readFileSync(manifestPath, 'utf-8'))

    for (const entry of manifest) {
      if (entry.error) continue
      const htmlPath = join(cleanDir, entry.filename)
      if (!existsSync(htmlPath)) continue

      process.stdout.write(`[clean] ${entry.url.slice(0, 60)} ... `)
      const html = readFileSync(htmlPath, 'utf-8')
      const result = await runPipeline(html, entry.url)

      const row: CleanPageResult = {
        url: entry.url,
        category: entry.category,
        filename: entry.filename,
        risk_score: result.risk_score,
        signal_count: result.signals.length,
        signals: result.signals.map((s) => s.type),
        is_false_positive: result.risk_score >= threshold,
      }
      corpus_clean.push(row)
      console.log(`score=${result.risk_score} ${row.is_false_positive ? '⚠ FP' : '✓'}`)
    }
  } else {
    console.warn('Aucun manifest trouvé — lancez d\'abord "benchmark crawl"')
  }

  // ── Corpus injection (fixtures existantes) ───────────────────────────────────

  const corpus_inject: InjectPageResult[] = []
  const injectionLevels = ['level-1', 'level-2', 'level-3', 'level-4', 'level-5']

  for (const level of injectionLevels) {
    const levelDir = join(fixturesDir, level)
    if (!existsSync(levelDir)) continue

    const files = readdirSync(levelDir).filter((f) => f.endsWith('.html'))
    for (const file of files) {
      process.stdout.write(`[${level}] ${file} ... `)
      const html = readFileSync(join(levelDir, file), 'utf-8')
      const result = await runPipeline(html, file)

      const row: InjectPageResult = {
        level,
        file,
        risk_score: result.risk_score,
        signal_count: result.signals.length,
        signals: result.signals.map((s) => s.type),
        is_detected: result.risk_score >= threshold,
      }
      corpus_inject.push(row)
      console.log(`score=${result.risk_score} ${row.is_detected ? '✓' : '✗ MISSED'}`)
    }
  }

  // ── Métriques ────────────────────────────────────────────────────────────────

  const metrics = computeMetrics(corpus_clean, corpus_inject, threshold)

  // ── Sensitivity analysis — sweep sur plusieurs thresholds ────────────────────

  const SWEEP_THRESHOLDS = [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 75]

  function computeAtThreshold(t: number): ThresholdRow {
    const fpCount = corpus_clean.filter((p) => p.risk_score >= t).length
    const tpCount = corpus_inject.filter((p) => p.risk_score >= t).length
    const fnCount = corpus_inject.filter((p) => p.risk_score < t).length

    const precision = tpCount + fpCount > 0 ? tpCount / (tpCount + fpCount) : 1
    const recall = tpCount + fnCount > 0 ? tpCount / (tpCount + fnCount) : 0
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0

    return {
      threshold: t,
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      f1: Math.round(f1 * 1000) / 1000,
      fp: fpCount,
      fn: fnCount,
    }
  }

  const sensitivity: ThresholdRow[] = SWEEP_THRESHOLDS.map(computeAtThreshold)

  const benchResult: BenchmarkResult = {
    timestamp: new Date().toISOString(),
    threshold,
    corpus_clean,
    corpus_inject,
    metrics,
    sensitivity,
  }

  // ── Sauvegarde ───────────────────────────────────────────────────────────────

  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true })
  const outFile = join(resultsDir, `${new Date().toISOString().slice(0, 10)}.json`)
  writeFileSync(outFile, JSON.stringify(benchResult, null, 2), 'utf-8')
  console.log(`\nRésultat sauvegardé : ${outFile}`)

  return benchResult
}
