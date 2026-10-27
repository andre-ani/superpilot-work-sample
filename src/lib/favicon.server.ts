import { load } from 'cheerio'
import { publicResource } from './catalog.server.ts'
import { brandAssetUrl } from './brand-parse.server.ts'
const cache = new Map<string, { url: string | null; expires: number }>()
export async function getStoreFavicon(store: string): Promise<string | null> {
  const saved = cache.get(store)
  if (saved && saved.expires > Date.now()) return saved.url
  let url: string | null = null
  try {
    const page = await publicResource(store)
    const $ = load(page.body)
    const icons = $('link[rel]').toArray().filter(el => /(?:^|\s)(?:icon|apple-touch-icon)(?:\s|$)/i.test($(el).attr('rel') ?? ''))
    icons.sort((a, b) => Number(/32x32|svg/.test(`${$(b).attr('sizes')} ${$(b).attr('type')}`)) - Number(/32x32|svg/.test(`${$(a).attr('sizes')} ${$(a).attr('type')}`)))
    url = icons.map(el => brandAssetUrl($(el).attr('href'), page.url.href)).find(Boolean) ?? `${page.url.origin}/favicon.ico`
  } catch { /* A missing favicon is not a reason to break the catalog. */ }
  if (cache.size >= 50) cache.delete(cache.keys().next().value!)
  cache.set(store, { url, expires: Date.now() + 15 * 60 * 1000 })
  return url
}
