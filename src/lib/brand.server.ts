import { publicResource } from './catalog.server.ts'
import { normalizeStoreUrl } from './catalog.ts'
import { brandStylesheetUrls, parseBrandHtml, type BrandStylesheet } from './brand-parse.server.ts'
import type { BrandSummary } from './brand.ts'
import { extractBrandWithFirecrawl } from './brand-firecrawl.server.ts'

/** One homepage request only. The studio can display this before visual enrichment. */
export async function extractBrandBasics(storeInput: string): Promise<BrandSummary> {
  const storeUrl = normalizeStoreUrl(storeInput)
  const page = await publicResource(new URL(storeUrl), Date.now() + 2000)
  if (!/text\/html|application\/xhtml\+xml/i.test(page.contentType)) throw new Error('The store did not return a readable homepage for basic brand details.')
  const summary = parseBrandHtml(page.body, page.url.href, [], false)
  summary.provenance.unshift('Provider: homepage metadata and original image candidates; no stylesheet fetch, browser render, or model call.')
  return summary
}

/** Firecrawl-only operation for durable background jobs; failure stays explicit. */
export const enrichBrand = extractBrandWithFirecrawl

/** Homepage plus at most two stylesheets, sharing one bounded request deadline. */
export async function readBrandSource(storeUrl: string) {
  const deadline = Date.now() + 15000
  const page = await publicResource(new URL(normalizeStoreUrl(storeUrl)), deadline)
  if (!/text\/html|application\/xhtml\+xml/i.test(page.contentType)) throw new Error('The store did not return a readable homepage for brand extraction.')
  const urls = brandStylesheetUrls(page.body, page.url.href)
  const responses = await Promise.allSettled(urls.map(async url => {
    const response = await publicResource(url, deadline)
    if (!/text\/css/i.test(response.contentType)) throw new Error('Stylesheet returned an unexpected format.')
    return { url: response.url.href, css: response.body } satisfies BrandStylesheet
  }))
  return {
    sourceUrl: page.url.href,
    html: page.body,
    stylesheets: responses.flatMap(result => result.status === 'fulfilled' ? [result.value] : []),
    warnings: responses.some(result => result.status === 'rejected') ? ['Some stylesheet requests failed; color or font candidates may be incomplete.'] : [],
  }
}

export async function extractBrandCustom(storeUrl: string): Promise<BrandSummary> {
  const source = await readBrandSource(storeUrl)
  const summary = parseBrandHtml(source.html, source.sourceUrl, source.stylesheets)
  summary.warnings.push(...source.warnings)
  return summary
}

/** Firecrawl remains the chosen brand provider; the experiment is an explicit fallback. */
export async function extractBrand(storeUrl: string): Promise<BrandSummary> {
  normalizeStoreUrl(storeUrl)
  try { return await extractBrandWithFirecrawl(storeUrl) }
  catch {
    const summary = await extractBrandCustom(storeUrl)
    // The comparison found stale theme defaults. Do not prefill those as brand truth.
    summary.colors = []
    summary.fonts = { heading: null, body: null }
    summary.warnings.unshift('Full brand extraction was unavailable. We found basic website details; add your colors and fonts to continue.')
    summary.provenance.unshift('Provider: limited static HTML fallback. Palette/font candidates withheld after comparison found inaccurate theme defaults.')
    return summary
  }
}
