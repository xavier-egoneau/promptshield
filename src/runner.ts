import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { runPipeline } from './pipeline/index.js'

interface FixtureExpect {
  min_risk_score?: number
  max_risk_score?: number
  signals_include?: string[]
  removed_types_include?: string[]
  cleaned_text_excludes?: string[]
}

interface FixtureCase {
  file: string
  expect: FixtureExpect
}

interface ExpectedJson {
  fixtures: FixtureCase[]
}

interface TestResult {
  level: string
  file: string
  passed: boolean
  failures: string[]
}

export async function runFixtureTests(fixturesRoot: string): Promise<void> {
  const levels = readdirSync(fixturesRoot).filter((d) => {
    const full = join(fixturesRoot, d)
    return existsSync(join(full, 'expected.json'))
  })

  const results: TestResult[] = []

  for (const level of levels.sort()) {
    const levelDir = join(fixturesRoot, level)
    const expectedPath = join(levelDir, 'expected.json')
    const expected: ExpectedJson = JSON.parse(readFileSync(expectedPath, 'utf-8'))

    for (const testCase of expected.fixtures) {
      const htmlPath = join(levelDir, testCase.file)
      const failures: string[] = []

      let html: string
      try {
        html = readFileSync(htmlPath, 'utf-8')
      } catch {
        results.push({ level, file: testCase.file, passed: false, failures: [`cannot read ${htmlPath}`] })
        continue
      }

      const result = await runPipeline(html, htmlPath)
      const exp = testCase.expect

      if (exp.min_risk_score !== undefined && result.risk_score < exp.min_risk_score) {
        failures.push(`risk_score ${result.risk_score} < expected min ${exp.min_risk_score}`)
      }

      if (exp.max_risk_score !== undefined && result.risk_score > exp.max_risk_score) {
        failures.push(`risk_score ${result.risk_score} > expected max ${exp.max_risk_score}`)
      }

      for (const sigType of exp.signals_include ?? []) {
        if (!result.signals.some((s) => s.type === sigType)) {
          failures.push(`expected signal "${sigType}" not found`)
        }
      }

      for (const removedType of exp.removed_types_include ?? []) {
        if (!result.removed.some((r) => r.type === removedType)) {
          failures.push(`expected removed type "${removedType}" not found`)
        }
      }

      for (const excludedText of exp.cleaned_text_excludes ?? []) {
        if (result.cleaned_text.toLowerCase().includes(excludedText.toLowerCase())) {
          failures.push(`cleaned_text should not contain "${excludedText}"`)
        }
      }

      results.push({ level, file: testCase.file, passed: failures.length === 0, failures })
    }
  }

  // Affichage
  let passed = 0
  let failed = 0

  for (const r of results) {
    const icon = r.passed ? '✓' : '✗'
    const label = `${r.level}/${r.file}`
    if (r.passed) {
      console.log(`  ${icon} ${label}`)
      passed++
    } else {
      console.log(`  ${icon} ${label}`)
      for (const f of r.failures) {
        console.log(`      → ${f}`)
      }
      failed++
    }
  }

  console.log('')
  console.log(`${passed + failed} fixtures — ${passed} passed, ${failed} failed`)

  if (failed > 0) process.exit(1)
}
