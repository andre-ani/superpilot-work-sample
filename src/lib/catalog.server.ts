import { discoverShopifyOrigin } from './catalog-discovery.ts'
import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'
import { request } from 'node:https'
import { normalizeProducts, normalizeStoreUrl, type CatalogResult } from './catalog.ts'

const blocked = new BlockList()
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked.addSubnet(address, prefix, 'ipv4')
export const isPublicAddress = (address: string) => isIP(address) === 4 && !blocked.check(address, 'ipv4')
class CatalogError extends Error {}
const pageSize = 60

/** Public HTTPS only; validated DNS is pinned to the socket on each redirect. */
export async function publicResource(input: URL | string, deadline = Date.now() + 18000, redirects = 0): Promise<{ body: string; bytes: Buffer; url: URL; contentType: string }> {
  const url = new URL(input)
  normalizeStoreUrl(url.href)
  if (url.protocol !== 'https:' || redirects > 3) throw new CatalogError('The storefront redirected too many times or to an unsupported address.')
  const remaining = deadline - Date.now()
  if (remaining <= 0) throw new CatalogError('The store took too long to respond. Try again.')
  let timer: ReturnType<typeof setTimeout> | undefined
  const addresses = await Promise.race([
    lookup(url.hostname, { family: 4, all: true }),
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new CatalogError('Could not resolve that store. Check its address.')), Math.min(5000, remaining)) }),
  ]).finally(() => clearTimeout(timer))
  if (!addresses.length || addresses.some(x => !isPublicAddress(x.address))) throw new CatalogError('Only public storefront addresses are supported.')
  const address = addresses[0].address
  const response = await new Promise<{ location?: string; bytes: Buffer; contentType: string }>((resolve, reject) => {
    const req = request(url, {
      agent: false, family: 4,
      lookup: (_hostname, _options, callback) => callback(null, address, 4),
      signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
      headers: { Accept: 'application/json, text/html;q=0.9, */*;q=0.5', 'Accept-Encoding': 'identity', 'User-Agent': 'Superpilot-Worksample/0.1' },
    }, res => {
      const status = res.statusCode ?? 500
      if (status >= 300 && status < 400 && res.headers.location) { res.resume(); resolve({ location: res.headers.location, bytes: Buffer.alloc(0), contentType: '' }); return }
      if (status !== 200) { res.resume(); reject(new CatalogError(status === 429 ? 'This store is limiting requests. Wait a moment and retry.' : 'This store does not expose an accessible public Shopify catalog. Try another store.')); return }
      let size = 0
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > 4 * 1024 * 1024) { req.destroy(new CatalogError('This catalog page is too large to load safely. Try another store.')); return }
        chunks.push(chunk)
      })
      res.on('error', reject)
      res.on('end', () => resolve({ bytes: Buffer.concat(chunks), contentType: res.headers['content-type'] ?? '' }))
    })
    req.on('error', reject)
    req.end()
  })
  if (response.location) return publicResource(new URL(response.location, url), deadline, redirects + 1)
  return { body: response.bytes.toString('utf8'), bytes: response.bytes, url, contentType: response.contentType }
}

async function publicJson(url: URL, deadline = Date.now() + 18000): Promise<{ value: unknown; url: URL }> {
  const response = await publicResource(url, deadline)
  if (!/json|javascript/i.test(response.contentType)) throw new CatalogError('The store returned a page instead of product data. It may be password-protected or not support a public catalog.')
  try { return { value: JSON.parse(response.body), url: response.url } }
  catch { throw new CatalogError('The store returned unreadable product data. Try another store.') }
}

export async function getCatalogPage(storeInput: string, page: number, savedCatalogOrigin?: string): Promise<CatalogResult> {
  try {
    const storeUrl = normalizeStoreUrl(storeInput)
    if (!Number.isInteger(page) || page < 1 || page > 20) throw new CatalogError('The demo supports up to 1,200 loaded products per store.')
    const deadline = Date.now() + 22000
    let catalogOrigin = savedCatalogOrigin ? normalizeStoreUrl(savedCatalogOrigin) : storeUrl
    if (catalogOrigin !== storeUrl && !new URL(catalogOrigin).hostname.endsWith('.myshopify.com')) throw new CatalogError('The saved product source is not a Shopify store.')
    let response: Awaited<ReturnType<typeof publicJson>>
    try {
      response = await publicJson(new URL(`/products.json?limit=${pageSize}&page=${page}`, catalogOrigin), Math.min(deadline, Date.now() + 6000))
    } catch (error) {
      if (savedCatalogOrigin) throw error
      const homepage = await publicResource(storeUrl, deadline)
      const discovered = discoverShopifyOrigin(homepage.body)
      if (!discovered || discovered === catalogOrigin) throw new CatalogError('We couldn’t find a readable product catalog yet. Check the store address, or try again in a moment.')
      catalogOrigin = discovered
      response = await publicJson(new URL(`/products.json?limit=${pageSize}&page=${page}`, catalogOrigin), deadline)
    }
    const cart = page === 1 ? await publicJson(new URL('/cart.js', catalogOrigin), deadline).catch(() => null) : null
    // Keep product links on the merchant's original storefront, not its headless backing shop.
    const normalized = normalizeProducts(response.value, storeUrl)
    if (page === 1 && !normalized.products.length) throw new CatalogError('We reached the store, but couldn’t find usable public products. Check the address or try again.')
    const cartValue = cart?.value as { currency?: unknown } | undefined
    const currency = cart?.url.origin === response.url.origin && typeof cartValue?.currency === 'string' && /^[A-Z]{3}$/.test(cartValue.currency) ? cartValue.currency : null
    return { ok: true, catalog: { storeUrl, catalogOrigin: response.url.origin, products: normalized.products, currency, page, hasMore: normalized.rawCount === pageSize, ...(page === 1 && normalized.rawCount < pageSize ? {totalCount:normalized.products.length,totalCountStatus:'ready' as const} : {}), skipped: normalized.skipped } }
  } catch (error) {
    return { ok: false, error: error instanceof CatalogError ? error.message : error instanceof Error && /Enter |Use |usable public/.test(error.message) ? error.message : 'We couldn’t finish reading this store. Check the address or try again in a moment.' }
  }
}

/** Count the same usable public products as browsing; reject incomplete/repeated pages. */
export async function countPublicProducts(storeInput: string, savedCatalogOrigin?: string): Promise<number> {
  const storeUrl = normalizeStoreUrl(storeInput)
  const origin = savedCatalogOrigin ? normalizeStoreUrl(savedCatalogOrigin) : storeUrl
  if (origin !== storeUrl && !new URL(origin).hostname.endsWith('.myshopify.com')) throw new CatalogError('Invalid catalog source.')
  const deadline = Date.now() + 30000, ids = new Set<string>()
  for (let page = 1; page <= 50; page++) {
    const response = await publicJson(new URL(`/products.json?limit=250&page=${page}`, origin), deadline)
    if (response.url.origin !== origin) throw new CatalogError('Catalog source changed while counting.')
    const normalized = normalizeProducts(response.value, storeUrl)
    const before = ids.size
    for (const product of normalized.products) ids.add(product.id)
    if (normalized.rawCount > 0 && page > 1 && ids.size === before) throw new CatalogError('Catalog pagination repeated.')
    if (normalized.rawCount < 250) return ids.size
  }
  throw new CatalogError('Catalog total could not be verified within this scan.')
}
