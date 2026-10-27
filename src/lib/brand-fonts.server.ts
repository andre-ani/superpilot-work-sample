import { commonFontName } from './font-options.ts'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { load } from 'cheerio'
import { publicResource } from './catalog.server.ts'
import { normalizeStoreUrl } from './catalog.ts'
import { brandAssetUrl, brandStylesheetUrls } from './brand-parse.server.ts'
import { atomicWrite, dataRoot, readBinary, readJson, writeJson, digest } from './studio-storage.server.ts'
import { brandFontOutcome, type BrandFontAsset, type BrandFonts } from './brand-fonts.ts'
import type { BrandDraft } from './studio.ts'

type Face = { family: string; source: string; weight: string; style: string; rank: number }
const familyName = (value: string) => value.trim().replace(/^['"]|['"]$/g, '').trim()
const key = (value: string) => familyName(value).toLowerCase().replace(/\s+/g, ' ')
const assetPattern = /^[a-f0-9]{64}\.(woff2|woff|ttf)$/

export function fontFaces(css: string, stylesheetUrl: string, storeUrl: string): Face[] {
  const faces: Face[] = []
  for (const rule of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/@font-face\s*\{([^{}]*)\}/gi)) {
    const value = (name: string) => new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i').exec(rule[1])?.[1]?.trim() ?? ''
    const family = familyName(value('font-family')), weight = value('font-weight') || '400', style = value('font-style') || 'normal'
    if (!family || family.length > 100 || !/^(normal|bold|[1-9]\d{0,2}(?:\s+[1-9]\d{0,2})?)$/.test(weight) || !/^(normal|italic|oblique)$/.test(style)) continue
    const sources = [...value('src').matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)].flatMap(match => {
      try {
        const resolved = new URL(match[2], stylesheetUrl).href
        const url = brandAssetUrl(resolved, storeUrl)
        return url && /\.(woff2?|ttf)(?:\?|$)/i.test(url) ? [url] : []
      } catch { return [] }
    }).sort((a,b) => Number(/\.woff2(?:\?|$)/i.test(b)) - Number(/\.woff2(?:\?|$)/i.test(a)))
    if (sources[0]) faces.push({ family, source: sources[0], weight, style, rank: (style === 'normal' ? 20 : 0) + (/^(400|normal|[1-3]\d\d\s+[5-9]\d\d)$/.test(weight) ? 10 : 0) })
  }
  return faces.sort((a,b) => b.rank - a.rank)
}

export function fontFormat(bytes: Buffer): { extension: 'woff2' | 'woff' | 'ttf'; format: BrandFontAsset['format']; type: string } | null {
  if (bytes.length < 12 || bytes.length > 2 * 1024 * 1024) return null
  const magic = bytes.toString('ascii',0,4)
  if (magic === 'wOF2') return { extension: 'woff2', format: 'woff2', type: 'font/woff2' }
  if (magic === 'wOFF') return { extension: 'woff', format: 'woff', type: 'font/woff' }
  if (bytes.subarray(0,4).equals(Buffer.from([0,1,0,0]))) return { extension: 'ttf', format: 'truetype', type: 'font/ttf' }
  return null
}

async function discoverBrandFonts(store: string, names: string[]): Promise<(BrandFontAsset | null)[]> {
  const deadline = Date.now() + 15000
  const page = await publicResource(new URL(store),deadline)
  if (!/html/i.test(page.contentType)) throw new Error('Font source was not a readable storefront.')
  const $ = load(page.body)
  const sources = [{ url: page.url.href, css: $('style').toArray().map(el => $(el).text()).join('\n') }]
  const styles = await Promise.allSettled(brandStylesheetUrls(page.body,page.url.href).map(async url => {
    const resource = await publicResource(url,deadline)
    if (!/text\/css/i.test(resource.contentType)) throw new Error('Unreadable stylesheet')
    return { url: resource.url.href, css: resource.body }
  }))
  for (const response of styles) if (response.status === 'fulfilled') sources.push(response.value)
  const faces = sources.flatMap(source => fontFaces(source.css,source.url,page.url.href)).sort((a,b) => b.rank - a.rank)
  const downloads = new Map<string, Promise<BrandFontAsset | null>>()
  const resolveFace = (family: string): Promise<BrandFontAsset | null> => {
    const face = faces.find(face => key(face.family) === key(family))
    if (!face) return Promise.resolve(null)
    if (!downloads.has(face.source)) downloads.set(face.source,(async () => {
      const resource = await publicResource(face.source,deadline)
      const format = fontFormat(resource.bytes)
      if (!format) return null
      const name = `${createHash('sha256').update(resource.bytes).digest('hex')}.${format.extension}`
      await atomicWrite(path.join(dataRoot,'font-assets',name),resource.bytes)
      return { family: face.family, url: `/api/brand-fonts/${name}`, format: format.format, weight: face.weight === 'normal' ? '400' : face.weight === 'bold' ? '700' : face.weight, style: face.style }
    })().catch(() => null))
    return downloads.get(face.source)!.then(asset => asset ? { ...asset, family: face.family, weight: face.weight === 'normal' ? '400' : face.weight === 'bold' ? '700' : face.weight, style: face.style } : null)
  }
  return Promise.all(names.map(resolveFace))
}

const publicFontRequests = new Map<string, Promise<BrandFontAsset | null>>()
async function publicFont(family: string): Promise<BrandFontAsset | null> {
  if (family === 'Inter') return { family, url: '/fonts/inter-latin-variable.woff2', format: 'woff2', weight: '100 900', style: 'normal' }
  const file = path.join(dataRoot, 'public-fonts', `${digest(family)}.json`)
  const cached = await readJson<BrandFontAsset>(file)
  if (cached && await readBinary(path.join(dataRoot, 'font-assets', cached.url.split('/').pop()!))) return cached
  if (publicFontRequests.has(family)) return publicFontRequests.get(family)!
  const request = (async () => {
    try {
      const deadline = Date.now() + 6000
      const url = new URL('https://fonts.googleapis.com/css2')
      url.searchParams.set('family', family)
      url.searchParams.set('display', 'swap')
      const css = await publicResource(url, deadline)
      if (!/text\/css/i.test(css.contentType)) return null
      // Google puts its basic Latin face last when returning subset-specific CSS.
      const face = fontFaces(css.body, 'https://fonts.gstatic.com/', 'https://fonts.gstatic.com/').filter(face => key(face.family) === key(family)).at(-1)
      if (!face || new URL(face.source).hostname !== 'fonts.gstatic.com') return null
      const resource = await publicResource(face.source, deadline)
      const format = fontFormat(resource.bytes)
      if (!format) return null
      const name = `${createHash('sha256').update(resource.bytes).digest('hex')}.${format.extension}`
      await atomicWrite(path.join(dataRoot, 'font-assets', name), resource.bytes)
      const asset: BrandFontAsset = { family, url: `/api/brand-fonts/${name}`, format: format.format, weight: face.weight, style: face.style }
      await writeJson(file, asset)
      return asset
    } catch { return null }
  })()
  publicFontRequests.set(family, request)
  try { return await request } finally { publicFontRequests.delete(family) }
}

export async function getBrandFonts(sourceUrl: string, headingName: string, bodyName: string, secondaryName = ''): Promise<BrandFonts> {
  const store = normalizeStoreUrl(sourceUrl)
  const names = [headingName, bodyName, secondaryName].map(name => name.trim())
  if (names.some(name => name.length > 100)) throw new Error('Font name is too long.')
  const cacheFile = path.join(dataRoot, 'brand-fonts', `${digest({ version: 3, store, names: names.map(key) })}.json`)
  const cached = await readJson<{ at: number; fonts: BrandFonts }>(cacheFile)
  const roles = ['heading', 'body', 'secondary'] as const
  const originalCache = cached && names.every((name, index) => !name || cached.fonts[roles[index]]?.source === 'original')
  if (cached?.fonts.resolution && (originalCache || !names.some(name => commonFontName(name))) && Date.now() - cached.at < (originalCache ? 86400000 : 60000)) return cached.fonts
  let discovered: (BrandFontAsset | null)[] = [null, null, null]
  let reason = 'No downloadable source font matched the requested family.'
  if (names.some(Boolean)) {
    discovered = await Promise.all(names.map(name => {
      const common = commonFontName(name)
      return common ? publicFont(common) : Promise.resolve(null)
    }))
    const unknown = names.map((name, index) => !discovered[index] && !commonFontName(name) ? name : '')
    if (unknown.some(Boolean)) {
      try {
        const source = await discoverBrandFonts(store, unknown)
        discovered = discovered.map((asset, index) => asset ?? source[index])
      } catch { reason = 'The storefront font source could not be loaded.' }
    }
  }
  const [heading, body, secondary] = names.map((name, index) => brandFontOutcome(name, discovered[index], reason))
  const warnings = [heading, body, ...(secondaryName ? [secondary] : [])].filter(item => item.resolution.substituted && item.resolution.requestedFamily).map(item => `${item.resolution.requestedFamily} is unavailable; using ${item.resolution.resolvedFamily}.`)
  const result: BrandFonts = {
    heading: heading.asset, body: body.asset, secondary: secondaryName ? secondary.asset : null,
    resolution: { heading: heading.resolution, body: body.resolution, ...(secondaryName ? { secondary: secondary.resolution } : {}) }, warnings,
  }
  await writeJson(cacheFile, { at: Date.now(), fonts: result })
  return result
}

/** Preserve discovered/requested identity while making the actual generation font explicit. */
export async function resolveBrandFontsForGeneration(sourceUrl: string, brand: BrandDraft): Promise<BrandDraft> {
  const fonts = await getBrandFonts(sourceUrl, brand.headingFont, brand.bodyFont, brand.secondaryFont ?? '')
  return { ...brand, fontResolution: fonts.resolution }
}

export async function readBrandFont(name: string) {
  if (!assetPattern.test(name)) throw new Error('Invalid font asset.')
  const bytes = await readBinary(path.join(dataRoot,'font-assets',name))
  const format = bytes && fontFormat(bytes)
  if (!bytes || !format) throw new Error('Font asset unavailable.')
  return { bytes, type: format.type }
}
