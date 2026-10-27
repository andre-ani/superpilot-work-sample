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

async function publicJson(url: URL): Promise<{ value: unknown; url: URL }> {
  const response = await publicResource(url)
  if (!/json|javascript/i.test(response.contentType)) throw new CatalogError('The store returned a page instead of product data. It may be password-protected or not support a public catalog.')
  try { return { value: JSON.parse(response.body), url: response.url } }
  catch { throw new CatalogError('The store returned unreadable product data. Try another store.') }
}

export async function getCatalogPage(storeInput: string, page: number): Promise<CatalogResult> {
  try {
    const storeUrl = normalizeStoreUrl(storeInput)
    if (!Number.isInteger(page) || page < 1 || page > 20) throw new CatalogError('The demo supports up to 1,200 loaded products per store.')
    const [response, cart] = await Promise.all([
      publicJson(new URL(`/products.json?limit=${pageSize}&page=${page}`, storeUrl)),
      page === 1 ? publicJson(new URL('/cart.js', storeUrl)).catch(() => null) : Promise.resolve(null),
    ])
    const origin = response.url.origin
    const normalized = normalizeProducts(response.value, origin)
    if (page === 1 && normalized.rawCount > 0 && !normalized.products.length) throw new CatalogError('The catalog did not contain usable Shopify product records.')
    const cartValue = cart?.value as { currency?: unknown } | undefined
    const currency = cart?.url.origin === origin && typeof cartValue?.currency === 'string' && /^[A-Z]{3}$/.test(cartValue.currency) ? cartValue.currency : null
    return { ok: true, catalog: { storeUrl: origin, products: normalized.products, currency, page, hasMore: normalized.rawCount === pageSize, skipped: normalized.skipped } }
  } catch (error) {
    return { ok: false, error: error instanceof CatalogError ? error.message : error instanceof Error && /Enter |Use |usable public/.test(error.message) ? error.message : 'Could not load this store. Check the address and try again; some storefronts block catalog access.' }
  }
}
