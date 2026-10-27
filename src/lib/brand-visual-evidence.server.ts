import path from 'node:path'
import { load } from 'cheerio'
import { publicResource } from './catalog.server.ts'
import { normalizeStoreUrl } from './catalog.ts'
import { saveBrandLogo, readBrandLogo } from './brand-assets.server.ts'
import { dataRoot, digest, entries, readJson, safeId, writeJson } from './studio-storage.server.ts'

export const BRAND_VISUAL_EVIDENCE_VERSION = 4
export const MAX_BRAND_EVIDENCE_IMAGES = 5
const MAX_RETAINED_COPY = 12_000

type EvidenceSource = 'screenshot' | 'homepage-html' | 'homepage-markdown' | 'og-image'
type EvidenceKind = 'homepage-screenshot' | 'brand-image'

export type BrandVisualEvidenceImage = {
  url: string
  mediaType: string
  kind: EvidenceKind
  source?: EvidenceSource
  alt?: string
  width?: number
  height?: number
  position?: number
}

export type BrandResearchEvidence = {
  url: string
  title: string
  text: string
}

export type BrandVisualEvidence = {
  version?: number
  sourceUrl: string
  sourceDescription: string
  /** Bounded homepage copy retained as model evidence, not a user-facing claim. */
  sourceText?: string
  /** At most one same-origin About/Our Story page selected from homepage links. */
  research?: BrandResearchEvidence[]
  hash: string
  images: BrandVisualEvidenceImage[]
}

/** The inputs used by the deterministic homepage-image ranker. */
export type HomepageImageCandidate = {
  value: string
  source: Exclude<EvidenceSource, 'screenshot'>
  alt?: string
  context?: string
  width?: number
  height?: number
  position?: number
}

type FetchedImage = {
  candidate: HomepageImageCandidate
  bytes: Buffer
  width?: number
  height?: number
  score: number
}

type ResearchLink = { url: string; title: string; position: number; score: number }

const MAX_SOURCE_TEXT = 500_000
const MAX_CANDIDATE_FETCHES = 10
const MAX_IMAGE_BYTES = 1_500_000
const MAX_SCREENSHOT_BYTES = 3_000_000
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
const text = (v: unknown, max = MAX_SOURCE_TEXT) => (typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : '').trim().slice(0, max)
const integer = (value: unknown, maximum = 20_000) => {
  const number = typeof value === 'number' ? value : typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : NaN
  return Number.isInteger(number) && number > 0 && number <= maximum ? number : undefined
}
const indexPath = (url: string, sourceScanId?: string) => path.join(dataRoot, 'brand-visual-evidence', `${digest(sourceScanId ? { sourceUrl: normalizeStoreUrl(url), sourceScanId: safeId(sourceScanId) } : normalizeStoreUrl(url))}.json`)
const pendingEvidence = new Map<string, Promise<BrandVisualEvidence | null>>()

function dimensionsFromUrl(value: string) {
  try {
    const url = new URL(value)
    const width = integer(url.searchParams.get('width') || url.searchParams.get('w'))
    const height = integer(url.searchParams.get('height') || url.searchParams.get('h'))
    if (width || height) return { width, height }
    const match = url.pathname.match(/(?:^|[\/_-])(\d{2,5})x(\d{2,5})(?:[\/_\-.]|$)/i)
    return match ? { width: integer(match[1]), height: integer(match[2]) } : {}
  } catch {
    return {}
  }
}

function srcsetCandidates(value: string) {
  return value.split(',').flatMap(part => {
    const tokens = part.trim().split(/\s+/)
    const raw = tokens[0]
    if (!raw) return []
    const descriptor = tokens[1]?.match(/^(\d+(?:\.\d+)?)(w|x)$/i)
    return [{ value: raw, width: descriptor?.[2].toLowerCase() === 'w' ? integer(descriptor[1]) : undefined, density: descriptor?.[2].toLowerCase() === 'x' ? Number(descriptor[1]) : 1 }]
  }).sort((a, b) => (b.width ?? 0) - (a.width ?? 0) || (b.density ?? 1) - (a.density ?? 1))
}

function candidateUrl(value: unknown, sourceUrl: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > 4096) return null
  try {
    const url = new URL(value.trim(), sourceUrl)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    return url.href
  } catch {
    return null
  }
}

function inlineText(value: string, max = MAX_RETAINED_COPY) {
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

function merchantResearchUrl(value: unknown, pageUrl: string, sourceUrl: string) {
  const href = candidateUrl(value, pageUrl)
  if (!href) return null
  try {
    const url = new URL(href)
    const allowedOrigins = new Set([new URL(sourceUrl).origin, new URL(pageUrl).origin])
    if (!allowedOrigins.has(url.origin)) return null
    // Tracking and signed query strings are not needed for an About page and
    // must not be retained as access-bearing source metadata.
    url.search = ''
    url.hash = ''
    return url.href
  } catch {
    return null
  }
}

export function scoreBrandResearchLink(title: string, url: string) {
  const normalizedTitle = title.replace(/\s+/g, ' ').trim()
  let pathname = ''
  try { pathname = new URL(url).pathname.replace(/\/+$/, '') } catch { return 0 }
  const dedicatedPath = /(?:^|\/)(?:about(?:[-_]us)?|our[-_](?:story|mission|values)|who[-_]we[-_]are|values)(?:\/|$)/i.test(pathname)
  // Do not mistake product copy such as "Learn more about X" for an About
  // page. A link must have an explicit brand-story label or a dedicated path.
  if (/^our\s+story(?:\s+about)?$|^about(?:\s+us)?$|^our\s+(?:mission|values|brand)$|^who\s+we\s+are$/i.test(normalizedTitle)) return dedicatedPath ? 65 : 55
  if (dedicatedPath && !/\b(?:learn|read|shop|buy)\s+more\b/i.test(normalizedTitle)) return 50
  return 0
}

function researchTitle(value: string, url: string) {
  const title = inlineText(value, 160)
  if (title) return title
  const segment = new URL(url).pathname.split('/').filter(Boolean).pop() ?? 'About page'
  return inlineText(segment.replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()), 160)
}

function htmlResearchLinks(html: string, pageUrl: string, sourceUrl: string): ResearchLink[] {
  if (!html) return []
  const $ = load(html)
  const links: ResearchLink[] = []
  $('a[href]').each((position, element) => {
    const node = $(element)
    const url = merchantResearchUrl(node.attr('href'), pageUrl, sourceUrl)
    if (!url) return
    const title = inlineText(node.text() || node.attr('aria-label') || node.attr('title') || '')
    const score = scoreBrandResearchLink(title, url)
    if (score) links.push({ url, title: researchTitle(title, url), position, score })
  })
  return links
}

function markdownResearchLinks(markdown: string, pageUrl: string, sourceUrl: string): ResearchLink[] {
  const links: ResearchLink[] = []
  for (const match of markdown.matchAll(/\[([^\]]{1,180})\]\(\s*(?:<)?([^)>\s]+)(?:>)?/g)) {
    if (match.index !== undefined && markdown[match.index - 1] === '!') continue
    const url = merchantResearchUrl(match[2], pageUrl, sourceUrl)
    if (!url) continue
    const title = inlineText(match[1], 160)
    const score = scoreBrandResearchLink(title, url)
    if (score) links.push({ url, title: researchTitle(title, url), position: match.index ?? 0, score })
  }
  return links
}

function readableSourceText(body: string, contentType = '') {
  if (!body) return ''
  if (/html|xhtml/i.test(contentType) || /<\s*(?:html|main|article|body)\b/i.test(body)) {
    const $ = load(body)
    $('script,style,noscript,svg,nav,header,footer,form,aside').remove()
    const root = $('main').first().length ? $('main').first() : $('article').first().length ? $('article').first() : $('body')
    const selected = inlineText(root.text())
    return selected || inlineText($('body').text())
  }
  return inlineText(body.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/(^|\s)[#>*`]+/g, '$1'))
}

async function fetchResearch(link: ResearchLink): Promise<BrandResearchEvidence | null> {
  try {
    const resource = await publicResource(new URL(link.url), Date.now() + 8000)
    if (resource.url.origin !== new URL(link.url).origin) return null
    const text = readableSourceText(resource.body, resource.contentType)
    return text ? { url: resource.url.href.split('#')[0].replace(/\?.*$/, ''), title: link.title, text } : null
  } catch {
    return null
  }
}

function noisyImageHint(value: string) {
  return /(?:^|[\s\/_\-.])(?:logo|wordmark|favicon|apple-touch|sprite|icon|social|payment|visa|mastercard|paypal|klarna|afterpay|trustpilot|facebook|instagram|tiktok|youtube|pinterest|badge|avatar|swatch|cart)(?:$|[\s\/_\-.])/i.test(value)
}

function canonicalImageKey(value: string) {
  try {
    const url = new URL(value)
    return `${url.origin.toLowerCase()}${url.pathname}`.toLowerCase()
  } catch {
    return value
  }
}

function imageArea(width?: number, height?: number) {
  return width && height ? width * height : 0
}

function scoreHomepageImageCandidate(candidate: HomepageImageCandidate, fallbackPosition = 0) {
  const hint = `${candidate.value} ${candidate.alt ?? ''} ${candidate.context ?? ''}`
  const lower = hint.toLowerCase()
  const area = imageArea(candidate.width, candidate.height)
  let score = candidate.source === 'homepage-html' ? 38 : candidate.source === 'homepage-markdown' ? 28 : 22
  // Earlier main-content images are more likely to be the visual system's hero.
  score += Math.max(0, 28 - (candidate.position ?? fallbackPosition) * 0.45)
  if (/\b(?:hero|masthead|banner|feature|featured|editorial|campaign|lookbook|slideshow|carousel)\b/i.test(lower)) score += 32
  if (/\b(?:main|content|homepage|home|section)\b/i.test(lower)) score += 9
  if (/\b(?:header|nav|footer|menu|drawer|modal|cookie|announcement|account|cart)\b/i.test(lower)) score -= 45
  if (candidate.alt?.trim()) score += 5
  if (candidate.width && candidate.width >= 1200) score += 24
  else if (candidate.width && candidate.width >= 700) score += 15
  else if (candidate.width && candidate.width < 220) score -= 45
  if (area >= 1_000_000) score += 28
  else if (area >= 400_000) score += 18
  else if (area >= 100_000) score += 8
  else if (area > 0 && area < 40_000) score -= 40
  if (noisyImageHint(hint)) score -= 100
  return score
}

/**
 * Rank homepage artwork using source order, layout semantics, and dimension
 * hints. Actual downloaded dimensions are fed back through the same ranker.
 * Scores are intentionally not persisted: only the selected evidence is.
 */
export function rankHomepageImageCandidates(candidates: HomepageImageCandidate[]): HomepageImageCandidate[] {
  return candidates.map((candidate, index) => ({ candidate, score: scoreHomepageImageCandidate(candidate, index), index }))
    .sort((a, b) => b.score - a.score || (a.candidate.position ?? a.index) - (b.candidate.position ?? b.index))
    .map(item => item.candidate)
}

function imageDimensions(bytes: Buffer, mediaType: string): { width?: number; height?: number } {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
  if (bytes.length >= 10 && (bytes.toString('ascii', 0, 6) === 'GIF87a' || bytes.toString('ascii', 0, 6) === 'GIF89a')) return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) }
  if (bytes.length >= 30 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    const kind = bytes.toString('ascii', 12, 16)
    if (kind === 'VP8X') return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) }
    if (kind === 'VP8 ' && bytes.length >= 30) {
      const start = bytes.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20)
      if (start >= 0 && start + 7 < bytes.length) return { width: bytes.readUInt16LE(start + 3) & 0x3fff, height: bytes.readUInt16LE(start + 5) & 0x3fff }
    }
    return {}
  }
  if ((mediaType === 'image/jpeg' || bytes[0] === 0xff && bytes[1] === 0xd8) && bytes.length > 4) {
    let offset = 2
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset++; continue }
      const marker = bytes[offset + 1]
      offset += 2
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) continue
      const length = bytes.readUInt16BE(offset)
      if (length < 2 || offset + length > bytes.length) break
      if (marker >= 0xc0 && marker <= 0xc3 || marker >= 0xc5 && marker <= 0xc7 || marker >= 0xc9 && marker <= 0xcb || marker >= 0xcd && marker <= 0xcf) return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) }
      offset += length
    }
  }
  return {}
}

function htmlCandidates(html: string, sourceUrl: string): HomepageImageCandidate[] {
  if (!html) return []
  const $ = load(html)
  const candidates: HomepageImageCandidate[] = []
  let position = 0
  const add = (raw: unknown, attrs: Record<string, string | undefined>, offset: number) => {
    const value = candidateUrl(raw, sourceUrl)
    if (!value) return
    const dimensions = dimensionsFromUrl(value)
    const width = integer(attrs.width) ?? dimensions.width
    const height = integer(attrs.height) ?? dimensions.height
    const context = [attrs.alt, attrs.class, attrs.id, attrs.loading, attrs.fetchpriority, attrs.role, attrs.ancestors].filter(Boolean).join(' ')
    if (noisyImageHint(`${value} ${context}`)) return
    if (width && height && (width < 160 || height < 120)) return
    candidates.push({ value, source: 'homepage-html', alt: attrs.alt?.trim().slice(0, 180), context, width, height, position: offset })
  }
  $('img,source,[data-background-image],[data-bg-image],[style*="background-image"]').each((_, element) => {
    const node = $(element)
    const attrs: Record<string, string | undefined> = {
      alt: node.attr('alt') ?? node.attr('aria-label'), class: node.attr('class'), id: node.attr('id'),
      width: node.attr('width'), height: node.attr('height'), loading: node.attr('loading'), fetchpriority: node.attr('fetchpriority'), role: node.attr('role'),
      ancestors: node.parents().slice(0, 6).toArray().map(parent => `${parent.tagName} ${$(parent).attr('class') ?? ''} ${$(parent).attr('id') ?? ''}`).join(' '),
    }
    const rawSrcset = node.attr('srcset') ?? node.attr('data-srcset')
    const srcset = rawSrcset ? srcsetCandidates(rawSrcset)[0] : undefined
    const raw = node.attr('src') ?? node.attr('data-src') ?? node.attr('data-lazy-src') ?? node.attr('data-background-image') ?? node.attr('data-bg-image') ?? srcset?.value
    add(raw, attrs, position++)
    if (srcset && srcset.value !== raw) add(srcset.value, { ...attrs, width: String(srcset.width ?? attrs.width ?? '') }, position++)
    const style = node.attr('style') ?? ''
    for (const match of style.matchAll(/url\((?:"|')?([^\)"']+)(?:"|')?\)/gi)) add(match[1], attrs, position++)
  })
  return candidates
}

function markdownCandidates(markdown: string, sourceUrl: string): HomepageImageCandidate[] {
  const candidates: HomepageImageCandidate[] = []
  let position = 0
  for (const match of markdown.matchAll(/!\[([^\]]*)\]\(\s*(?:<)?([^)>\s]+)(?:>)?/g)) {
    const value = candidateUrl(match[2], sourceUrl)
    if (!value) continue
    const dimensions = dimensionsFromUrl(value)
    const alt = text(match[1], 180)
    if (noisyImageHint(`${value} ${alt}`)) continue
    if (dimensions.width && dimensions.height && (dimensions.width < 160 || dimensions.height < 120)) continue
    candidates.push({ value, source: 'homepage-markdown', alt, context: alt, width: dimensions.width, height: dimensions.height, position: position++ })
  }
  return candidates
}

function linkCandidates(payload: Record<string, unknown>, sourceUrl: string) {
  const metadata = record(payload.metadata)
  const pageUrl = candidateUrl(metadata.url, sourceUrl) ?? sourceUrl
  const html = text(payload.html, MAX_SOURCE_TEXT)
  const markdown = text(payload.markdown, MAX_SOURCE_TEXT)
  const links = [...htmlResearchLinks(html, pageUrl, sourceUrl), ...markdownResearchLinks(markdown, pageUrl, sourceUrl)]
  const unique = new Map<string, ResearchLink>()
  for (const link of links) {
    const current = unique.get(link.url)
    if (!current || link.score > current.score || link.position < current.position) unique.set(link.url, link)
  }
  return [...unique.values()].sort((a, b) => b.score - a.score || a.position - b.position)
}

function extractionCandidates(payload: unknown, inputUrl: string) {
  const sourceUrl = normalizeStoreUrl(inputUrl)
  const data = record(record(payload).data)
  const metadata = record(data.metadata)
  const branding = record(data.branding)
  const brandingImages = record(branding.images)
  const screenshot = candidateUrl(data.screenshot, sourceUrl)
  const homepage: HomepageImageCandidate[] = []
  const add = (value: unknown, source: HomepageImageCandidate['source'], extras: Partial<HomepageImageCandidate> = {}) => {
    const url = candidateUrl(value, sourceUrl)
    if (!url || noisyImageHint(`${url} ${extras.alt ?? ''} ${extras.context ?? ''}`)) return
    homepage.push({ value: url, source, ...dimensionsFromUrl(url), ...extras })
  }
  const ogWidth = integer(metadata['og:image:width'])
  const ogHeight = integer(metadata['og:image:height'])
  add(metadata['og:image:secure_url'] || metadata.ogImage || metadata['og:image'] || brandingImages.ogImage || metadata.twitterImage || metadata['twitter:image'], 'og-image', { width: ogWidth, height: ogHeight, position: 0, context: 'open graph homepage image' })
  const html = text(data.html, MAX_SOURCE_TEXT)
  const markdown = text(data.markdown, MAX_SOURCE_TEXT)
  homepage.push(...htmlCandidates(html, sourceUrl), ...markdownCandidates(markdown, sourceUrl))
  const unique = new Map<string, HomepageImageCandidate>()
  for (const item of homepage) {
    const key = canonicalImageKey(item.value)
    const current = unique.get(key)
    if (!current || scoreHomepageImageCandidate(item) > scoreHomepageImageCandidate(current)) unique.set(key, item)
  }
  return { screenshot, homepage: rankHomepageImageCandidates([...unique.values()]), researchLinks: linkCandidates(data, sourceUrl), sourceText: readableSourceText(html || markdown, html ? 'text/html' : 'text/markdown') }
}

async function fetchImage(candidate: HomepageImageCandidate, maxBytes = MAX_IMAGE_BYTES): Promise<FetchedImage | null> {
  try {
    const resource = await publicResource(new URL(candidate.value), Date.now() + 8000)
    if (resource.bytes.length > maxBytes) return null
    const dimensions = imageDimensions(resource.bytes, resource.contentType)
    if (dimensions.width && dimensions.height && (dimensions.width < 160 || dimensions.height < 120)) return null
    return { candidate, bytes: resource.bytes, width: dimensions.width, height: dimensions.height, score: scoreHomepageImageCandidate({ ...candidate, ...dimensions }) }
  } catch {
    // Missing pixels remain unknown, never replaced with invented style.
    return null
  }
}

/** Mark saved pixels for refresh without blocking early palette/font publication on image downloads. */
export async function deferBrandVisualEvidence(sourceUrl: string, sourceScanId?: string) {
  const previous = await readJson<BrandVisualEvidence>(indexPath(sourceUrl, sourceScanId))
  if (previous) await writeJson(indexPath(sourceUrl, sourceScanId), { ...previous, version: 1 })
}

export async function retainBrandVisualEvidence(payload: unknown, inputUrl: string, sourceScanId?: string, onProgress?: (summary: string) => Promise<void>): Promise<BrandVisualEvidence> {
  const sourceUrl = normalizeStoreUrl(inputUrl)
  const data = record(record(payload).data)
  const metadata = record(data.metadata)
  const { screenshot, homepage, researchLinks, sourceText } = extractionCandidates(payload, sourceUrl)
  const screenshotCandidate: HomepageImageCandidate | null = screenshot ? { value: screenshot, source: 'og-image', context: 'Firecrawl homepage screenshot', position: -1 } : null
  const loading = new Set<string>()
  if (screenshotCandidate || homepage.length) loading.add('homepage imagery')
  if (researchLinks[0]) loading.add('brand background')
  const report = () => onProgress?.(loading.size ? `Loading ${[...loading].join(' and ')}.` : 'Preparing retained source evidence.')
  await report()
  const images = Promise.all([
    screenshotCandidate ? fetchImage(screenshotCandidate, MAX_SCREENSHOT_BYTES) : Promise.resolve(null),
    ...homepage.slice(0, MAX_CANDIDATE_FETCHES).map(candidate => fetchImage(candidate)),
  ]).then(async result => { loading.delete('homepage imagery'); await report(); return result })
  const background = (researchLinks[0] ? fetchResearch(researchLinks[0]) : Promise.resolve(null))
    .then(async result => { loading.delete('brand background'); await report(); return result })
  const [[screenshotResult, ...homepageResults], researchResult] = await Promise.all([images, background])
  const retained: BrandVisualEvidenceImage[] = []
  const save = async (result: FetchedImage, kind: EvidenceKind, source: EvidenceSource) => {
    try {
      const saved = await saveBrandLogo(result.bytes.toString('base64'))
      const asset = await readBrandLogo(saved.split('/').pop()!)
      if (!retained.some(item => item.url === saved)) retained.push({ url: saved, mediaType: asset.type, kind, source, alt: result.candidate.alt, width: result.width, height: result.height, position: result.candidate.position })
    } catch {
      // Invalid or unsupported image formats stay out of model evidence.
    }
  }
  if (screenshotResult) await save(screenshotResult, 'homepage-screenshot', 'screenshot')
  const rankedHomepage = homepageResults.filter((item): item is FetchedImage => !!item).sort((a, b) => b.score - a.score || (a.candidate.position ?? 0) - (b.candidate.position ?? 0))
  for (const result of rankedHomepage) {
    if (retained.length >= MAX_BRAND_EVIDENCE_IMAGES) break
    await save(result, 'brand-image', result.candidate.source)
  }
  const previous = await readJson<BrandVisualEvidence>(indexPath(sourceUrl, sourceScanId))
  const retainedResearch = researchResult ? [researchResult] : researchLinks.length ? [] : previous?.research ?? []
  const retainedSourceText = sourceText || previous?.sourceText || ''
  const result: BrandVisualEvidence = {
    version: BRAND_VISUAL_EVIDENCE_VERSION,
    sourceUrl,
    sourceDescription: (text(metadata['og:description'], 2400) || text(metadata.ogDescription, 2400) || text(metadata.description, 2400) || previous?.sourceDescription || '').slice(0, 2400),
    sourceText: retainedSourceText || undefined,
    research: retainedResearch,
    hash: digest({ version: BRAND_VISUAL_EVIDENCE_VERSION, sourceUrl, sourceText: retainedSourceText, research: retainedResearch, images: retained }),
    images: retained,
  }
  // Keep previously captured pixels if a later response lacks images.
  if (!retained.length && previous?.images.length) {
    const adopted = { ...result, images: previous.images, hash: digest({ version: BRAND_VISUAL_EVIDENCE_VERSION, sourceUrl, sourceText: result.sourceText || previous.sourceText || '', research: result.research || previous.research || [], images: previous.images }) }
    await writeJson(indexPath(sourceUrl, sourceScanId), adopted)
    return adopted
  }
  await writeJson(indexPath(sourceUrl, sourceScanId), result)
  return result
}

export async function savedBrandVisualEvidence(inputUrl: string, sourceScanId?: string, onProgress?: (summary: string) => Promise<void>): Promise<BrandVisualEvidence | null> {
  const sourceUrl = normalizeStoreUrl(inputUrl)
  const existing = await readJson<BrandVisualEvidence>(indexPath(sourceUrl, sourceScanId))
  if (existing?.version === BRAND_VISUAL_EVIDENCE_VERSION) { await onProgress?.(sourceScanId ? 'Using this session’s retained source evidence.' : 'Using saved homepage and brand background evidence.'); return existing }
  const pendingKey = sourceScanId ? `${sourceUrl}:${safeId(sourceScanId)}` : sourceUrl
  const pending = pendingEvidence.get(pendingKey)
  if (pending) { await onProgress?.('Waiting for source evidence already being loaded.'); return pending }
  const request = (async () => {
    if (sourceScanId) {
      const raw = await readJson<{payload: unknown}>(path.join(dataRoot, 'brand-extractions', `${safeId(sourceScanId)}.json`))
      return raw ? retainBrandVisualEvidence(raw.payload, sourceUrl, sourceScanId, onProgress) : null
    }
    // One-time adoption of already retained extraction data; no new Firecrawl request.
    const raw = await Promise.all((await entries('brand-extractions')).filter(name => name.endsWith('.json')).slice(-50).map(name => readJson<{ sourceUrl: string; extractedAt: string; payload: unknown }>(path.join(dataRoot, 'brand-extractions', name))))
    const latest = raw.filter((item): item is NonNullable<typeof item> => !!item && normalizeStoreUrl(item.sourceUrl) === sourceUrl).sort((a, b) => b.extractedAt.localeCompare(a.extractedAt))[0]
    return latest ? retainBrandVisualEvidence(latest.payload, sourceUrl, undefined, onProgress) : null
  })()
  pendingEvidence.set(pendingKey, request)
  try { return await request } finally { pendingEvidence.delete(pendingKey) }
}

export async function brandEvidencePixels(evidence: BrandVisualEvidence | null) {
  if (!evidence) return []
  const results = await Promise.all(evidence.images.slice(0, MAX_BRAND_EVIDENCE_IMAGES).map(async image => {
    if (!/^\/api\/brand-assets\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(image.url)) return null
    try {
      const asset = await readBrandLogo(image.url.split('/').pop()!)
      const maxBytes = image.kind === 'homepage-screenshot' ? MAX_SCREENSHOT_BYTES : MAX_IMAGE_BYTES
      return asset.bytes.length <= maxBytes ? { ...image, base64: asset.bytes.toString('base64'), mediaType: asset.type } : null
    } catch {
      return null
    }
  }))
  return results.filter((item): item is NonNullable<typeof item> => !!item)
}
