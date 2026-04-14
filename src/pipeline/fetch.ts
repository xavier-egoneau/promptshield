import { fetch } from 'undici'

const TIMEOUT_MS = 10_000
const USER_AGENT = 'PromptShield/0.1 (content-safety-middleware)'
const MAX_HTML_BYTES = 10 * 1024 * 1024 // 10 Mo

export interface FetchResult {
  html: string
  finalUrl: string
}

export async function fetchUrl(url: string): Promise<FetchResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response: Awaited<ReturnType<typeof fetch>>
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    })
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} — ${url}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
    throw new Error(`Unsupported content-type "${contentType}" for ${url}`)
  }

  const contentLength = response.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > MAX_HTML_BYTES) {
    throw new Error(`Response too large: ${contentLength} bytes (max ${MAX_HTML_BYTES})`)
  }

  const html = await response.text()
  if (Buffer.byteLength(html, 'utf-8') > MAX_HTML_BYTES) {
    throw new Error(`Response body too large after reading (max ${MAX_HTML_BYTES} bytes)`)
  }

  return { html, finalUrl: response.url }
}
