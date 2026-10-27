import { load } from 'cheerio'
import type { BrandSummary } from './brand.ts'
import { shortBrandDescription } from './brand-description.ts'

export type BrandStylesheet = { url: string; css: string }
const clean = (text: string | undefined, max = 500) => (text ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const unique = (items: string[]) => [...new Set(items)]

/** Asset references only: no credentials, ports, data URLs or executable URLs. */
export function brandAssetUrl(value: unknown, base: string): string | null {
  if (typeof value !== 'string' || !value.trim() || value.length > 4096) return null
  try {
    const url = new URL(value, base)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    if (url.origin !== new URL(base).origin && url.hostname !== 'cdn.shopify.com') return null
    return url.href
  } catch { return null }
}

export function brandStylesheetUrls(html: string, sourceUrl: string): string[] {
  const $ = load(html)
  return unique($('link[rel="stylesheet"]').toArray().flatMap(el => {
    const url = brandAssetUrl($(el).attr('href'), sourceUrl)
    return url ? [url] : []
  })).sort((a,b)=>{
    const rank=(url:string)=>/\/0\.[^/]+\.css/i.test(url)?5:/theme|base|global|main|app\.css/i.test(url)?4:/tailwind/i.test(url)?3:0
    return rank(b)-rank(a)
  }).slice(0, 2)
}

function color(value: string): string | null {
  const hex = value.trim().match(/^#([a-f\d]{3}|[a-f\d]{6})$/i)
  if (hex) return `#${(hex[1].length === 3 ? hex[1].split('').map(x => x + x).join('') : hex[1]).toUpperCase()}`
  const rgb = value.trim().match(/^(?:rgb\(\s*)?(\d{1,3})[ ,]+(\d{1,3})[ ,]+(\d{1,3})\s*\)?$/)
  if (!rgb || rgb.slice(1).some(x => Number(x) > 255)) return null
  return '#' + rgb.slice(1).map(x => Number(x).toString(16).padStart(2, '0')).join('').toUpperCase()
}

function font(value: string): string | null {
  const name = clean(value.split(',')[0].replace(/["']/g, ''), 100)
  return name && !/var\(|url\(|inherit|initial|unset|system-ui|sans-serif|^serif$|monospace/i.test(name) ? name : null
}

/** A bounded static-source reading, not a claim about rendered/computed styles. */
export function parseBrandHtml(html: string, sourceUrl: string, stylesheets: BrandStylesheet[] = [], extractStyles = true): BrandSummary {
  const $ = load(html)
  const meta = (key: string) => clean($(`meta[property="${key}"],meta[name="${key}"]`).first().attr('content'), 1200)
  const provenance: string[] = []
  const warnings = extractStyles ? ['Colors and fonts are static source candidates; confirm them before generation.'] : []
  const logos: { url: string; score: number; reason: string }[] = []
  let structuredName = ''
  const addLogo = (value: unknown, score: number, reason: string) => {
    const url = brandAssetUrl(value, sourceUrl)
    if (url) logos.push({ url, score, reason })
  }
  // Only organization/website declarations supply brand identity, never product logos.
  const inspect = (node: unknown, depth = 0): void => {
    if (depth > 5 || !node || typeof node !== 'object') return
    if (Array.isArray(node)) { node.slice(0, 50).forEach(x => inspect(x, depth + 1)); return }
    const item = node as Record<string, unknown>
    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']]
    if (types.some(t => t === 'Organization' || t === 'WebSite' || t === 'Corporation')) {
      if (!structuredName && typeof item.name === 'string') structuredName = clean(item.name, 150)
      const logo = typeof item.logo === 'object' && item.logo ? (item.logo as Record<string, unknown>).url ?? (item.logo as Record<string, unknown>).contentUrl : item.logo
      addLogo(logo, 100, 'Organization/WebSite structured logo')
    }
    if (item['@graph']) inspect(item['@graph'], depth + 1)
  }
  $('script[type="application/ld+json"]').slice(0, 12).each((_, el) => {
    try { inspect(JSON.parse($(el).text())) } catch { /* Malformed metadata is optional. */ }
  })
  $('img').each((_, el) => {
    const img = $(el)
    const hint = `${img.attr('alt') ?? ''} ${img.attr('class') ?? ''} ${img.attr('id') ?? ''} ${img.attr('src') ?? ''}`
    const inHeader = img.closest('header,[role="banner"],.header,.site-header,#shopify-section-header').length > 0
    if (!/logo|wordmark/i.test(hint) || /payment|visa|mastercard|paypal|klarna|afterpay|facebook|instagram|tiktok|trustpilot/i.test(hint)) return
    addLogo(img.attr('src') || img.attr('data-src'), inHeader ? 90 : 40, inHeader ? 'Header logo image' : 'Image labelled as logo')
  })
  logos.sort((a, b) => b.score - a.score)
  const logoCandidates = unique(logos.map(x => x.url)).slice(0, 6)
  if (logos[0]) provenance.push(`Logo: ${logos[0].reason}; ${logos[0].url}`)
  else warnings.push('No usable logo URL found. Confirm or supply the original logo; an inline SVG may need separate handling.')

  const name = meta('og:site_name') || structuredName || clean($('title').first().text(), 150)
  const description = shortBrandDescription(name, meta('og:description'), meta('description'))
  if (!name) warnings.push('Brand name was not found.')
  if (!description) warnings.push('Brand description was not found.')
  provenance.push(`Name: ${meta('og:site_name') ? 'og:site_name' : structuredName ? 'structured metadata' : 'page title (may include a tagline)'}`)
  if (description) provenance.push('Description: short source excerpt; Open Graph metadata preferred over generic SEO metadata.')
  const cssSources = extractStyles ? [{ url: sourceUrl, css: $('style').toArray().map(el => $(el).text()).join('\n') }, ...stylesheets] : []
  const colorCandidates: { hex: string; score: number; reason: string }[] = []
  const variables = new Map<string, string>()
  const fonts: BrandSummary['fonts'] = { heading: null, body: null }
  for (const source of cssSources) {
    const css = source.css.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)[;}]/g)) variables.set(match[1], match[2].trim())
  }
  const resolve = (value: string) => {
    for (let i = 0; i < 4; i++) {
      const match = value.trim().match(/^var\((--[\w-]+)(?:,\s*([^)]*))?\)$/)
      if (!match) break
      value = variables.get(match[1]) ?? match[2] ?? ''
    }
    return value.trim()
  }
  for (const source of cssSources) {
    const css = source.css.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)[;}]/g)) {
      const key = match[1]
      const hex = color(resolve(match[2]))
      if (hex && /color|brand|accent|primary|background|foreground/i.test(key)) {
        const score = /brand|primary|accent/i.test(key) ? 90 : /background|foreground|text/i.test(key) ? 60 : 30
        colorCandidates.push({ hex, score, reason: `${key} in ${source.url}` })
      }
      const role = /weight|size|style|spacing|height/i.test(key) ? null : /font.*(heading|headings|header|title)|(?:heading|header|title).*font/i.test(key) ? 'heading' : /font.*(body|text)|(?:body|text).*font/i.test(key) ? 'body' : null
      if (role && !fonts[role]) {
        const value = font(resolve(match[2]))
        if (value) { fonts[role] = value; provenance.push(`${role} font candidate: ${key} in ${source.url}`) }
      }
    }
    // Read explicit body/heading font rules, without pretending to resolve the cascade.
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = match[1].trim()
      const role = /(^|[,\s])h[1-6](?=[,\s.:#[]|$)|heading|headline/i.test(selector) ? 'heading' : /(^|[,\s])body(?=[,\s.:#[]|$)/i.test(selector) ? 'body' : null
      const family = match[2].match(/(?:^|;)\s*font-family\s*:\s*([^;}]+)/i)
      if (role && !fonts[role] && family) {
        const value = font(resolve(family[1]))
        if (value) { fonts[role] = value; provenance.push(`${role} font candidate: ${selector.slice(0,100)} in ${source.url}`) }
      }
    }
  }
  const themeColor = extractStyles ? color(meta('theme-color')) : null
  if (themeColor) colorCandidates.push({ hex: themeColor, score: 50, reason: 'theme-color metadata (browser UI color)' })
  colorCandidates.sort((a, b) => b.score - a.score)
  const colors = unique(colorCandidates.map(x => x.hex)).slice(0, 6)
  for (const hex of colors) provenance.push(`Color ${hex}: ${colorCandidates.find(x => x.hex === hex)!.reason}`)
  if (extractStyles && !colors.length) warnings.push('No usable color candidates found.')
  if (extractStyles && (!fonts.heading || !fonts.body)) warnings.push('One or more font roles could not be identified.')
  $('script,style,noscript,template,nav,footer,[hidden],[aria-hidden="true"]').remove()
  const headings = unique($('main h1,main h2,[role="main"] h1,[role="main"] h2').toArray().map(el => clean($(el).text(), 180)).filter(Boolean)).slice(0, 6)
  if (headings.length) provenance.push('Headings: main page markup; CSS visibility has not been evaluated.')
  return { sourceUrl, extractedAt: new Date().toISOString(), name, description, logoUrl: logoCandidates[0] ?? null, logoCandidates, colors, fonts, headings, warnings, provenance }
}
