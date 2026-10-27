export type ProductVariant = {
  id: string
  title: string
  price: number | null
  available: boolean | null
  image: string | null
}

export type CatalogProduct = {
  id: string
  title: string
  handle: string
  url: string
  description: string
  type: string
  vendor: string
  tags: string[]
  images: string[]
  /** Shopify image.src -> the Shopify variant IDs explicitly linked to that image. */
  imageVariantIds?: Record<string, string[]>
  variants: ProductVariant[]
  minPrice: number | null
  maxPrice: number | null
  available: boolean | null
}

export type CatalogPage = {
  totalCount?: number
  totalCountStatus?: 'ready' | 'unavailable'
  catalogOrigin?: string
  storeUrl: string
  products: CatalogProduct[]
  currency: string | null
  page: number
  hasMore: boolean
  skipped: number
}
export type CatalogResult = { ok: true; catalog: CatalogPage } | { ok: false; error: string }

/**
 * Return only images Shopify explicitly associates with a variant, plus that
 * variant's resolved featured image. An unannotated product gallery is not a
 * safe substitute for a variant-specific reference set.
 */
export function variantImages(product: CatalogProduct, variantId: string): string[] {
  const variant = product.variants.find(item => item.id === variantId)
  if (!variant) return []
  const linked = product.images.filter(url => product.imageVariantIds?.[url]?.includes(variantId))
  // A one-variant product has no competing variant whose images could be
  // confused with this selection, so its unannotated gallery is in scope.
  const unambiguousGallery = product.variants.length === 1 ? product.images : []
  return [...new Set([variant.image, ...linked, ...unambiguousGallery].filter((url): url is string => !!url))]
}

export function normalizeStoreUrl(input: string): string {
  const text = input.trim()
  if (!text) throw new Error('Enter your Shopify store URL.')
  if (text.length > 2048 || /\s/.test(text)) throw new Error('Enter a website address without spaces, such as yourbrand.com.')
  let url: URL
  try { url = new URL(/^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`) }
  catch { throw new Error('Enter a valid store address, such as yourbrand.com.') }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) {
    throw new Error('Use a public HTTP or HTTPS storefront URL without a login or custom port.')
  }
  const host = url.hostname.toLowerCase()
  if (!/^(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}$/i.test(host) || /\.(localhost|local|internal|test|invalid|example)$/.test(host)) {
    throw new Error('Use a public storefront domain, not a local address or IP address.')
  }
  if (host === 'admin.shopify.com' || host === 'shopify.com' || host === 'www.shopify.com') {
    throw new Error('Use your storefront address, not the Shopify admin or Shopify homepage.')
  }
  return `https://${host}`
}

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const string = (value: unknown, max = 300): string => typeof value === 'string' ? value.trim().slice(0, max) : ''
const id = (value: unknown): string => typeof value === 'number' && Number.isSafeInteger(value) || typeof value === 'string' && /^\d+$/.test(value) ? String(value) : ''
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : []

function price(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  if (!/^\d+(\.\d+)?$/.test(String(value))) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function image(value: unknown, storeUrl: string): string | null {
  try {
    const url = new URL(string(value, 2048), storeUrl)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    if (url.hostname !== 'cdn.shopify.com' && url.origin !== storeUrl) return null
    return string(value, 2048) ? url.href : null
  } catch { return null }
}

export function normalizeProducts(payload: unknown, storeUrl: string): { products: CatalogProduct[]; rawCount: number; skipped: number } {
  const raw = record(payload).products
  if (!Array.isArray(raw) || raw.length > 250) throw new Error('This store did not return a usable public Shopify product catalog.')
  const products: CatalogProduct[] = []
  for (const item of raw) {
    const p = record(item), handle = string(p.handle)
    if (!id(p.id) || !string(p.title) || !/^[a-z\d][a-z\d-]*$/i.test(handle)) continue
    const rawImages = list(p.images).map(value => {
      const source = record(value)
      return {
        id: id(source.id),
        url: image(source.src, storeUrl),
        variantIds: list(source.variant_ids).map(id).filter(Boolean),
      }
    }).filter((value): value is { id: string; url: string; variantIds: string[] } => !!value.url)
    const images = rawImages.map(value => value.url)
    const imageVariantIds: Record<string, string[]> = {}
    for (const source of rawImages) {
      if (!source.variantIds.length) continue
      imageVariantIds[source.url] = [...new Set([...(imageVariantIds[source.url] ?? []), ...source.variantIds])]
    }
    const imageById = new Map(rawImages.filter(value => value.id).map(value => [value.id, value.url]))
    const variants = list(p.variants).slice(0, 250).map(v => {
      const variant = record(v)
      const featuredImage = record(variant.featured_image)
      const featuredImageUrl = image(featuredImage.src, storeUrl)
      const imageId = id(variant.image_id) || id(featuredImage.id)
      return {
        id: id(variant.id),
        title: string(variant.title) || 'Default',
        price: price(variant.price),
        available: typeof variant.available === 'boolean' ? variant.available : null,
        image: featuredImageUrl ?? (imageId ? imageById.get(imageId) ?? null : null),
      }
    }).filter(v => v.id)
    const prices = variants.flatMap(v => v.price === null ? [] : [v.price])
    const tags = Array.isArray(p.tags) ? p.tags.map(t => string(t)) : string(p.tags, 2000).split(',').map(t => t.trim())
    products.push({
      id: id(p.id), title: string(p.title), handle, url: `${storeUrl}/products/${handle}`,
      description: string(p.body_html, 20000).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim().slice(0, 3000),
      type: string(p.product_type) || 'Uncategorized', vendor: string(p.vendor), tags: tags.filter(Boolean).slice(0, 50),
      images, variants, minPrice: prices.length ? Math.min(...prices) : null, maxPrice: prices.length ? Math.max(...prices) : null,
      available: variants.some(v => v.available === true) ? true : variants.length && variants.every(v => v.available === false) ? false : null,
      ...(Object.keys(imageVariantIds).length ? { imageVariantIds } : {}),
    })
  }
  return { products, rawCount: raw.length, skipped: raw.length - products.length }
}

export type CatalogFilters = { query: string; type: string; availability: string; sort: string }
export function filterProducts(products: CatalogProduct[], filters: CatalogFilters): CatalogProduct[] {
  const terms = filters.query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
  const result = products.filter(p => {
    const haystack = `${p.title} ${p.vendor} ${p.type} ${p.tags.join(' ')}`.toLocaleLowerCase()
    return terms.every(t => haystack.includes(t)) && (filters.type === 'all' || p.type === filters.type)
      && (filters.availability === 'all' || (filters.availability === 'available' ? p.available === true : p.available === false))
  })
  if (filters.sort === 'name-asc') result.sort((a, b) => a.title.localeCompare(b.title))
  if (filters.sort === 'name-desc') result.sort((a, b) => b.title.localeCompare(a.title))
  if (filters.sort.startsWith('price-')) result.sort((a, b) => a.minPrice === null ? b.minPrice === null ? 0 : 1 : b.minPrice === null ? -1 : (a.minPrice - b.minPrice) * (filters.sort === 'price-asc' ? 1 : -1))
  return result
}

export function formatPrice(value: number | null, currency: string | null): string {
  if (value === null) return 'Price unavailable'
  return new Intl.NumberFormat('en', currency ? { style: 'currency', currency, currencyDisplay: 'narrowSymbol' } : { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}
