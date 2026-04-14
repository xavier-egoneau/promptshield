import { readFileSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { program } from 'commander'
import { runPipeline } from './pipeline/index.js'
import { fetchUrl } from './pipeline/fetch.js'
import { runFixtureTests } from './runner.js'
import { createShieldServer } from './server.js'
import { crawlCleanCorpus } from './benchmark/crawl.js'
import { runBenchmark } from './benchmark/run.js'
import { printReport } from './benchmark/report.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

program
  .name('promptshield')
  .description('Local middleware to reduce prompt-injection risk before external content reaches an LLM agent.')
  .version('0.1.0')

type OutputOpts = { json?: boolean; text?: boolean; summary?: boolean }

function printResult(result: Awaited<ReturnType<typeof runPipeline>>, opts: OutputOpts): void {
  if (opts.text) {
    console.log(result.cleaned_text)
    return
  }

  if (opts.summary) {
    console.log(`Source : ${result.source}`)
    console.log(`Title  : ${result.metadata.title ?? '(none)'}`)
    console.log(`Score  : ${result.risk_score}/100 [${result.risk_level.toUpperCase()}]`)
    console.log(`Signals: ${result.signals.length}`)
    for (const s of result.signals) {
      console.log(`  • [${s.type}] "${s.pattern}" — ${s.excerpt}`)
    }
    console.log(`Removed: ${result.removed.length} element(s)`)
    return
  }

  console.log(JSON.stringify(result, null, 2))
}

program
  .command('inspect <file>')
  .description('Inspect a local HTML file and run the full pipeline')
  .option('--text', 'Output cleaned text only')
  .option('--summary', 'Output human-readable summary')
  .action(async (file: string, opts: OutputOpts) => {
    const filePath = resolve(file)
    let html: string
    try {
      html = readFileSync(filePath, 'utf-8')
    } catch {
      console.error(`Error: cannot read file "${filePath}"`)
      process.exit(1)
    }
    const result = await runPipeline(html, filePath)
    printResult(result, opts)
  })

program
  .command('fetch <url>')
  .description('Fetch a URL and run the full pipeline')
  .option('--text', 'Output cleaned text only')
  .option('--summary', 'Output human-readable summary')
  .action(async (url: string, opts: OutputOpts) => {
    let fetched: Awaited<ReturnType<typeof fetchUrl>>
    try {
      fetched = await fetchUrl(url)
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
    const result = await runPipeline(fetched.html, fetched.finalUrl)
    printResult(result, opts)
  })

program
  .command('server')
  .description('Start the local HTTP server (POST /shield, GET /health)')
  .option('--port <number>', 'Port to listen on', '4242')
  .option('--rate-limit <number>', 'Max requests per minute per IP', '60')
  .option('--cache-ttl <number>', 'Cache TTL in seconds', '300')
  .action((opts: { port: string; rateLimit: string; cacheTtl: string }) => {
    const port = parseInt(opts.port, 10)
    const rateLimit = parseInt(opts.rateLimit, 10)
    const cacheTtl = parseInt(opts.cacheTtl, 10)
    createShieldServer({ port, rateLimit, cacheTtl })
  })

program
  .command('test')
  .description('Run pipeline against all fixtures and check expected outputs')
  .option('--fixtures <dir>', 'Path to fixtures directory', join(projectRoot, 'fixtures'))
  .action(async (opts: { fixtures: string }) => {
    const fixturesDir = resolve(opts.fixtures)
    console.log(`Running fixture tests from: ${fixturesDir}\n`)
    await runFixtureTests(fixturesDir)
  })

// ── Benchmark ─────────────────────────────────────────────────────────────────

const benchmark = program
  .command('benchmark')
  .description('Measure detection quality on real pages and injection fixtures')

benchmark
  .command('crawl')
  .description('Fetch and save clean page snapshots for benchmarking')
  .option('--urls <file>', 'Path to URLs JSON file', join(projectRoot, 'benchmark/clean-urls.json'))
  .option('--output <dir>', 'Output directory for snapshots', join(projectRoot, 'benchmark/snapshots'))
  .action(async (opts: { urls: string; output: string }) => {
    await crawlCleanCorpus(resolve(opts.urls), resolve(opts.output))
  })

benchmark
  .command('run')
  .description('Run pipeline on all corpus pages and compute precision/recall metrics')
  .option('--snapshots <dir>', 'Path to snapshots directory', join(projectRoot, 'benchmark/snapshots'))
  .option('--fixtures <dir>', 'Path to injection fixtures directory', join(projectRoot, 'fixtures'))
  .option('--results <dir>', 'Directory for result files', join(projectRoot, 'benchmark/results'))
  .option('--threshold <number>', 'Risk score threshold for detection', '25')
  .action(async (opts: { snapshots: string; fixtures: string; results: string; threshold: string }) => {
    const result = await runBenchmark(
      resolve(opts.snapshots),
      resolve(opts.fixtures),
      resolve(opts.results),
      parseInt(opts.threshold, 10),
    )
    printReport(result)
  })

program.parse()
