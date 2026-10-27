import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { normalizeStoreUrl } from './catalog.ts'
import { brandAssetUrl } from './brand-parse.server.ts'
import type { BrandSummary } from './brand.ts'
import { shortBrandDescription } from './brand-description.ts'
import { projectEnv } from './project-env.server.ts'
import { dataRoot, safeId, writeJson } from './studio-storage.server.ts'
import { deferBrandVisualEvidence } from './brand-visual-evidence.server.ts'

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const text = (value: unknown, limit = 1200) => (typeof value === 'string' ? value : Array.isArray(value) && typeof value[0] === 'string' ? value[0] : '').trim().slice(0, limit)

export function normalizeFirecrawlBrand(payload: unknown, sourceUrl: string): BrandSummary {
  const result = record(payload), data = record(result.data), metadata = record(data.metadata), branding = record(data.branding)
  const status = Number(metadata.statusCode)
  if (result.success !== true || !Number.isFinite(status) || status < 200 || status >= 300 || !Object.keys(branding).length) throw new Error('The brand service could not read a usable storefront page.')
  const finalUrl = text(metadata.url) || sourceUrl
  // A redirect may change www; normalize and validate its public URL before using assets.
  const base = normalizeStoreUrl(finalUrl)
  const images = record(branding.images), families = record(record(branding.typography).fontFamilies)
  const candidate = brandAssetUrl(text(branding.logo) || text(images.logo), base)
  const isFavicon = !!candidate && (/favicon|apple-touch-icon/i.test(candidate) || candidate === brandAssetUrl(text(images.favicon), base))
  const colors = Object.entries(record(branding.colors)).filter(([role]) => ['primary', 'secondary', 'accent', 'background', 'textPrimary', 'textSecondary'].includes(role)).map(([, value]) => text(value, 20)).filter(hex => /^#[a-f\d]{6}$/i.test(hex)).map(hex => hex.toUpperCase())
  const name = text(metadata.ogSiteName, 150) || text(metadata['og:site_name'], 150) || text(metadata.title, 150)
  return {
    sourceUrl: finalUrl, extractedAt: new Date().toISOString(),
    name,
    description: shortBrandDescription(name, text(metadata['og:description']) || text(metadata.ogDescription), text(metadata.description)),
    logoUrl: isFavicon ? null : candidate, logoCandidates: candidate ? [candidate] : [],
    colors: [...new Set(colors)].slice(0, 6),
    fonts: { heading: text(families.heading, 100) || null, body: text(families.primary, 100) || null },
    headings: text(data.markdown, 100000).split('\n').filter(line => /^#{1,2} /.test(line)).map(line => line.replace(/^#+\s*/, '').trim().slice(0,180)).slice(0,6),
    warnings: [
      'Review these details: a homepage can reflect a seasonal campaign rather than the full brand identity.',
      isFavicon ? 'Only a small site icon was found. Choose or supply the original logo before using it in an ad.' : !candidate ? 'No usable logo URL was found. Supply the original logo.' : '',
      text(data.warning, 400),
    ].filter(Boolean),
    provenance: ['Provider: Firecrawl branding format; visual roles may be model-assisted.', 'Name and description: homepage metadata.', 'Original provider response is retained in application storage.'],
  }
}

export async function extractBrandWithFirecrawl(input: string, options: { bypassCache?: boolean; sourceScanId?: string } = {}): Promise<BrandSummary> {
  const sourceUrl = normalizeStoreUrl(input)
  const key = (await projectEnv()).FIRECRAWL_API_KEY?.trim()
  if (!key) throw new Error('Project Firecrawl key is not configured.')
  const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    // HTML preserves rendered image order/layout hints for the visual-evidence
    // ranker; markdown remains the fallback for pages without useful markup.
    body: JSON.stringify({ url: sourceUrl, ...(options.bypassCache ? { maxAge: 0 } : {}), formats: ['branding', 'markdown', 'html', { type: 'screenshot', fullPage: false }], onlyMainContent: true, timeout: 45000 }),
    signal: AbortSignal.timeout(55000),
  })
  const payload: unknown = await response.json()
  await writeJson(join(dataRoot, 'brand-extractions', `${options.bypassCache && options.sourceScanId ? safeId(options.sourceScanId) : randomUUID()}.json`), { sourceScanId: options.sourceScanId, sourceUrl, extractedAt: new Date().toISOString(), payload })
  if (!response.ok) throw new Error(`The brand service returned HTTP ${response.status}.`)
  const summary = normalizeFirecrawlBrand(payload, sourceUrl)
  await deferBrandVisualEvidence(sourceUrl, options.bypassCache ? options.sourceScanId : undefined).catch(() => {})
  return summary
}
