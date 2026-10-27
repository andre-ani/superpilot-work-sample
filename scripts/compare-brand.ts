// Run explicitly: node --experimental-strip-types scripts/compare-brand.ts [store URLs]
// Uses only this project's .env Firecrawl key; no OpenRouter calls.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { resolve } from 'node:path'
import { readBrandSource } from '../src/lib/brand.server.ts'
import { parseBrandHtml } from '../src/lib/brand-parse.server.ts'
import { normalizeFirecrawlBrand } from '../src/lib/brand-firecrawl.server.ts'
import { normalizeStoreUrl } from '../src/lib/catalog.ts'
import type { BrandSummary } from '../src/lib/brand.ts'

const urls = (process.argv.slice(2).length ? process.argv.slice(2) : ['https://drinkolipop.com', 'https://fromourplace.com', 'https://www.glossier.com']).map(normalizeStoreUrl)
if (urls.length > 3) throw new Error('Limit the comparison to three stores per run.')
const env = parseEnv(await readFile(resolve('.env'), 'utf8'))
if (!env.FIRECRAWL_API_KEY) throw new Error('Project FIRECRAWL_API_KEY is required; no ambient credentials are used.')
const runId = new Date().toISOString().replace(/[:.]/g, '-')
const directory = resolve('.work/brand-comparison', runId)
await mkdir(directory, { recursive: true })
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
async function measure(url: string, provider: 'custom' | 'firecrawl') {
  const start = performance.now(), host = new URL(url).hostname
  try {
    let summary: BrandSummary, metadata: Record<string, unknown> = {}
    if (provider === 'custom') {
      const source = await readBrandSource(url)
      summary = parseBrandHtml(source.html, source.sourceUrl, source.stylesheets)
      summary.warnings.push(...source.warnings)
      metadata = { resources: 1 + source.stylesheets.length, htmlBytes: Buffer.byteLength(source.html), stylesheetBytes: source.stylesheets.reduce((n,x) => n + Buffer.byteLength(x.css),0), cache: 'No application cache' }
      await writeFile(resolve(directory, `${host}-source.json`), JSON.stringify(source))
    } else {
      const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.FIRECRAWL_API_KEY}` },
        body: JSON.stringify({ url, formats: ['branding', 'markdown'], onlyMainContent: true, maxAge: 0, timeout: 45000 }),
        signal: AbortSignal.timeout(55000),
      })
      const payload: unknown = await response.json()
      await writeFile(resolve(directory, `${host}-firecrawl.json`), JSON.stringify(payload, null, 2))
      if (!response.ok) throw new Error(`Firecrawl HTTP ${response.status}`)
      summary = normalizeFirecrawlBrand(payload, url)
      const meta = asRecord(asRecord(asRecord(payload).data).metadata)
      metadata = { cacheState: meta.cacheState ?? null, creditsUsed: meta.creditsUsed ?? null, pageStatus: meta.statusCode ?? null }
    }
    const result = { provider, url, ok: true, durationMs: Math.round(performance.now() - start), metadata, summary }
    await writeFile(resolve(directory, `${host}-${provider}-summary.json`), JSON.stringify(result, null, 2))
    console.log(JSON.stringify({ provider, url, ok: true, durationMs: result.durationMs, name: summary.name, logo: !!summary.logoUrl, colors: summary.colors, fonts: summary.fonts, warnings: summary.warnings }))
    return result
  } catch (error) {
    const result = { provider, url, ok: false, durationMs: Math.round(performance.now() - start), error: error instanceof Error ? error.message : 'Extraction failed' }
    await writeFile(resolve(directory, `${host}-${provider}-error.json`), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result))
    return result
  }
}

// Pair both methods on each URL. Single requests measure this run, not a benchmark distribution.
const results: Awaited<ReturnType<typeof measure>>[] = []
for (const url of urls) results.push(...await Promise.all([measure(url, 'custom'), measure(url, 'firecrawl')]))
await writeFile(resolve(directory, 'results.json'), JSON.stringify({ runId, method: 'One request per provider/store; Firecrawl maxAge=0; custom homepage plus at most two stylesheets; different capability breadth.', results }, null, 2))
console.log(JSON.stringify({ comparisonDirectory: directory, successful: results.filter(r => r.ok).length, total: results.length }))
