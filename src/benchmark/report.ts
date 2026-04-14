import type { BenchmarkResult } from './run.js'

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

export function printReport(result: BenchmarkResult): void {
  const { metrics, corpus_clean, corpus_inject } = result
  const date = result.timestamp.slice(0, 10)

  console.log('')
  console.log(`PromptShield Benchmark — ${date}`)
  console.log('═'.repeat(52))

  // ── Corpus clean ────────────────────────────────────────
  console.log(`\nCorpus clean (${corpus_clean.length} pages réelles)`)
  console.log(`  Faux positifs (score ≥ ${metrics.threshold}) : ${metrics.false_positives}/${metrics.clean_total} (${pct(metrics.false_positive_rate)})`)

  if (corpus_clean.length > 0) {
    const scores = corpus_clean.map((p) => p.risk_score)
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const max = Math.max(...scores)
    const maxPage = corpus_clean.find((p) => p.risk_score === max)
    console.log(`  Score moyen               : ${avg.toFixed(1)}`)
    console.log(`  Score max                 : ${max} [${maxPage?.category ?? '?'}] ${maxPage?.url.slice(0, 40) ?? ''}`)
  }

  // Détail des faux positifs
  const fps = corpus_clean.filter((p) => p.is_false_positive)
  if (fps.length > 0) {
    console.log(`\n  Faux positifs détaillés :`)
    for (const fp of fps) {
      console.log(`    ⚠  score=${fp.risk_score} [${fp.category}] ${fp.url.slice(0, 60)}`)
      console.log(`       signaux: ${fp.signals.join(', ')}`)
    }
  }

  // ── Corpus injection ─────────────────────────────────────
  console.log(`\nCorpus injection (${corpus_inject.length} fixtures)`)
  console.log(`  Détectés (score ≥ ${metrics.threshold}) : ${metrics.true_positives}/${metrics.inject_total} (${pct(metrics.true_positive_rate)})`)

  const missed = corpus_inject.filter((p) => !p.is_detected)
  if (missed.length > 0) {
    console.log(`\n  Manqués :`)
    for (const m of missed) {
      console.log(`    ✗  score=${m.risk_score} ${m.level}/${m.file}`)
    }
  }

  // Par niveau
  const levels = [...new Set(corpus_inject.map((p) => p.level))].sort()
  console.log(`\n  Par niveau :`)
  for (const level of levels) {
    const group = corpus_inject.filter((p) => p.level === level)
    const detected = group.filter((p) => p.is_detected).length
    const icon = detected === group.length ? '✓' : '⚠'
    console.log(`    ${icon} ${level} : ${detected}/${group.length}`)
  }

  // ── Métriques globales ───────────────────────────────────
  console.log(`\nMétriques (threshold = ${metrics.threshold})`)
  console.log(`  Precision : ${pct(metrics.precision)}`)
  console.log(`  Recall    : ${pct(metrics.recall)}`)
  console.log(`  F1        : ${pct(metrics.f1)}`)

  // Verdict
  console.log('')
  if (metrics.f1 >= 0.8) {
    console.log('  Verdict : ✓ Bon (F1 ≥ 80%)')
  } else if (metrics.f1 >= 0.6) {
    console.log('  Verdict : ⚠ Acceptable (F1 ≥ 60%) — heuristiques à enrichir')
  } else {
    console.log('  Verdict : ✗ Insuffisant (F1 < 60%) — révision nécessaire')
  }
  console.log('')
}
