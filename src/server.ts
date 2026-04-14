import { createServer, IncomingMessage, ServerResponse } from 'node:http'
import { createHash } from 'node:crypto'
import { runPipeline } from './pipeline/index.js'
import { fetchUrl } from './pipeline/fetch.js'

// ─── Config ──────────────────────────────────────────────────────────────────

export interface ServerOptions {
  port?: number
  rateLimit?: number   // max req/min par IP
  cacheTtl?: number    // secondes
}

// ─── LRU Cache ───────────────────────────────────────────────────────────────

interface CacheEntry {
  result: unknown
  createdAt: number
}

class LRUCache {
  private map = new Map<string, CacheEntry>()
  constructor(private maxSize: number, private ttlMs: number) {}

  get(key: string): { result: unknown; ageMs: number } | null {
    const entry = this.map.get(key)
    if (!entry) return null
    const ageMs = Date.now() - entry.createdAt
    if (ageMs > this.ttlMs) { this.map.delete(key); return null }
    // Rafraîchir la position LRU
    this.map.delete(key)
    this.map.set(key, entry)
    return { result: entry.result, ageMs }
  }

  set(key: string, result: unknown): void {
    if (this.map.size >= this.maxSize) {
      // Supprimer l'entrée la plus ancienne (premier élément de la Map)
      const firstKey = this.map.keys().next().value
      if (firstKey !== undefined) this.map.delete(firstKey)
    }
    this.map.set(key, { result, createdAt: Date.now() })
  }
}

function cacheKey(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────

interface RateBucket {
  count: number
  resetAt: number
}

class RateLimiter {
  private buckets = new Map<string, RateBucket>()
  constructor(private maxPerMin: number) {
    setInterval(() => this.cleanup(), 60_000).unref()
  }

  check(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now()
    let bucket = this.buckets.get(ip)
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + 60_000 }
      this.buckets.set(ip, bucket)
    }
    bucket.count++
    const remaining = Math.max(0, this.maxPerMin - bucket.count)
    return { allowed: bucket.count <= this.maxPerMin, remaining, resetAt: bucket.resetAt }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [ip, bucket] of this.buckets) {
      if (now > bucket.resetAt) this.buckets.delete(ip)
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_BODY_BYTES = 5 * 1024 * 1024

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    let size = 0
    req.setEncoding('utf-8')
    req.on('data', (chunk: string) => {
      size += Buffer.byteLength(chunk)
      if (size > MAX_BODY_BYTES) { reject(new Error('Request body too large')); return }
      body += chunk
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function getIP(req: IncomingMessage): string {
  if (process.env['PROMPTSHIELD_TRUST_PROXY'] === 'true') {
    const forwarded = req.headers['x-forwarded-for']
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  }
  return req.socket.remoteAddress ?? '0.0.0.0'
}

function json(res: ServerResponse, status: number, data: unknown, extra?: Record<string, string>): void {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    ...extra,
  })
  res.end(body)
}

function logRequest(fields: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), ...fields }) + '\n')
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function checkAuth(req: IncomingMessage): boolean {
  const token = process.env['PROMPTSHIELD_TOKEN']
  if (!token) return true // mode non authentifié
  const header = req.headers['authorization'] ?? ''
  return header === `Bearer ${token}`
}

// ─── Handler /shield ─────────────────────────────────────────────────────────

async function handleShield(
  req: IncomingMessage,
  res: ServerResponse,
  cache: LRUCache,
): Promise<{ status: number; source: string; risk_score: number; signal_count: number; cacheStatus: string }> {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed. Use POST.' })
    return { status: 405, source: '', risk_score: 0, signal_count: 0, cacheStatus: '-' }
  }

  let raw: string
  try { raw = await readBody(req) } catch (err) {
    json(res, 413, { error: String(err) })
    return { status: 413, source: '', risk_score: 0, signal_count: 0, cacheStatus: '-' }
  }

  let body: Record<string, unknown>
  try { body = JSON.parse(raw) as Record<string, unknown> } catch {
    json(res, 400, { error: 'Invalid JSON body' })
    return { status: 400, source: '', risk_score: 0, signal_count: 0, cacheStatus: '-' }
  }

  const { html, url } = body

  if (typeof html !== 'string' && typeof url !== 'string') {
    json(res, 400, { error: 'Body must contain "html" (string) or "url" (string)' })
    return { status: 400, source: '', risk_score: 0, signal_count: 0, cacheStatus: '-' }
  }

  const key = cacheKey(typeof url === 'string' ? `url:${url}` : `html:${html}`)
  const cached = cache.get(key)

  if (cached) {
    const ageS = Math.round(cached.ageMs / 1000)
    json(res, 200, cached.result, { 'X-Cache': 'HIT', 'X-Cache-Age': String(ageS) })
    const r = cached.result as { source?: string; risk_score?: number; signals?: unknown[] }
    return { status: 200, source: r.source ?? '', risk_score: r.risk_score ?? 0, signal_count: r.signals?.length ?? 0, cacheStatus: 'HIT' }
  }

  let result: Awaited<ReturnType<typeof runPipeline>>

  if (typeof html === 'string') {
    result = await runPipeline(html, 'inline')
  } else {
    let fetched: Awaited<ReturnType<typeof fetchUrl>>
    try { fetched = await fetchUrl(url as string) } catch (err) {
      json(res, 502, { error: `Fetch failed: ${String(err)}` })
      return { status: 502, source: String(url), risk_score: 0, signal_count: 0, cacheStatus: 'MISS' }
    }
    result = await runPipeline(fetched.html, fetched.finalUrl)
  }

  cache.set(key, result)
  json(res, 200, result, { 'X-Cache': 'MISS', 'X-Cache-Age': '0' })
  return { status: 200, source: result.source, risk_score: result.risk_score, signal_count: result.signals.length, cacheStatus: 'MISS' }
}

// ─── Serveur ──────────────────────────────────────────────────────────────────

export function createShieldServer(opts: ServerOptions = {}): ReturnType<typeof createServer> {
  const port = opts.port ?? 4242
  const rateLimit = opts.rateLimit ?? 60
  const cacheTtl = (opts.cacheTtl ?? 300) * 1000

  const cache = new LRUCache(100, cacheTtl)
  const limiter = new RateLimiter(rateLimit)
  const token = process.env['PROMPTSHIELD_TOKEN']

  if (!token) {
    console.warn('[warn] PROMPTSHIELD_TOKEN not set — running unauthenticated')
  }
  if (process.env['PROMPTSHIELD_TRUST_PROXY'] !== 'true') {
    console.warn('[warn] PROMPTSHIELD_TRUST_PROXY not set — X-Forwarded-For ignored (safe default)')
  }

  const server = createServer(async (req, res) => {
    const startMs = Date.now()
    const ip = getIP(req)
    const path = req.url?.split('?')[0] ?? '/'

    // Auth
    if (!checkAuth(req)) {
      json(res, 401, { error: 'Unauthorized. Set Authorization: Bearer <PROMPTSHIELD_TOKEN>' })
      logRequest({ method: req.method, path, status: 401, ip, duration_ms: Date.now() - startMs })
      return
    }

    // Rate limit
    if (path === '/shield') {
      const rl = limiter.check(ip)
      res.setHeader('X-RateLimit-Remaining', String(rl.remaining))
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(rl.resetAt / 1000)))
      if (!rl.allowed) {
        const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000)
        json(res, 429, { error: 'Rate limit exceeded', retry_after: retryAfter }, { 'Retry-After': String(retryAfter) })
        logRequest({ method: req.method, path, status: 429, ip, duration_ms: Date.now() - startMs })
        return
      }
    }

    if (path === '/shield') {
      try {
        const { status, source, risk_score, signal_count, cacheStatus } = await handleShield(req, res, cache)
        logRequest({ method: req.method, path, status, ip, duration_ms: Date.now() - startMs, source, risk_score, signal_count, cache: cacheStatus })
      } catch (err) {
        json(res, 500, { error: `Internal error: ${String(err)}` })
        logRequest({ method: req.method, path, status: 500, ip, duration_ms: Date.now() - startMs, error: String(err) })
      }
      return
    }

    if (path === '/health') {
      json(res, 200, { status: 'ok', version: '0.1.0' })
      logRequest({ method: req.method, path, status: 200, ip, duration_ms: Date.now() - startMs })
      return
    }

    json(res, 404, { error: 'Not found. Available: POST /shield, GET /health' })
    logRequest({ method: req.method, path, status: 404, ip, duration_ms: Date.now() - startMs })
  })

  server.listen(port, '127.0.0.1', () => {
    console.log(`PromptShield server listening on http://127.0.0.1:${port}`)
    console.log(`  POST /shield  { "html": "..." } | { "url": "..." }`)
    console.log(`  GET  /health`)
    console.log(`  Rate limit : ${rateLimit} req/min | Cache TTL : ${opts.cacheTtl ?? 300}s | Auth : ${token ? 'on' : 'off'}`)
  })

  return server
}
