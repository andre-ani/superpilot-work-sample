import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeStoreUrl, normalizeProducts, filterProducts, variantImages } from './catalog.ts'
import { isPublicAddress, getCatalogPage } from './catalog.server.ts'

test('normalizes storefront and product URLs, while rejecting unsafe destinations', () => {
  assert.equal(normalizeStoreUrl('  My-Brand.com/products/shirt?tracking=1  '), 'https://my-brand.com')
  assert.equal(normalizeStoreUrl('http://example-store.myshopify.com/'), 'https://example-store.myshopify.com')
  for (const value of ['', 'hello there', 'localhost', 'https://127.0.0.1', 'https://[::1]', 'file:///etc/passwd', 'https://user:pass@shop.com', 'https://store.com:8080', 'https://admin.shopify.com', 'https://store.internal', 'https://store.com@localhost']) {
    assert.throws(() => normalizeStoreUrl(value), value)
  }
})

test('rejects private/reserved DNS targets, including cloud metadata and alternate IP families', () => {
  for (const address of ['0.0.0.0', '10.0.0.1', '100.100.100.200', '127.0.0.1', '169.254.169.254', '172.31.0.1', '192.168.0.1', '192.0.2.1', '198.18.0.1', '224.0.0.1', '255.255.255.255', '::1', '::ffff:127.0.0.1', 'invalid']) {
    assert.equal(isPublicAddress(address), false, address)
  }
  assert.equal(isPublicAddress('1.1.1.1'), true)
})

const product = (id: number, title: string, price: unknown, available?: boolean) => ({
  id, title, handle: `product-${id}`, product_type: 'Shoes', tags: ['running'],
  variants: [{ id: id * 10, title: 'Blue', price, available }],
  images: [{ src: 'https://cdn.shopify.com/product.png' }, { src: 'http://127.0.0.1/private.png' }],
  body_html: '<script>evil()</script><p>A product &amp; its details</p>',
})

test('normalizes untrusted catalogs without inventing prices, stock, or unsafe images', () => {
  const result = normalizeProducts({ products: [product(1, 'Shoe', '', undefined), { title: 'Broken' }] }, 'https://store.com')
  assert.equal(result.skipped, 1)
  const p = result.products[0]
  assert.equal(p.minPrice, null)
  assert.equal(p.available, null)
  assert.deepEqual(p.images, ['https://cdn.shopify.com/product.png'])
  assert.equal(p.description, 'A product & its details')
  assert.throws(() => normalizeProducts({ error: 'blocked' }, 'https://store.com'))
})

test('retains Shopify image-to-variant associations and resolves image_id fallbacks', () => {
  const result = normalizeProducts({ products: [{
    id: 99,
    title: 'Pan',
    handle: 'pan',
    variants: [
      { id: 901, title: 'Blue', price: '10', featured_image: null, image_id: 501, available: true },
      { id: 902, title: 'Red', price: '10', featured_image: { id: 502, src: 'https://cdn.shopify.com/red.jpg' }, available: true },
    ],
    images: [
      { id: 501, src: 'https://cdn.shopify.com/blue.jpg', variant_ids: [901] },
      { id: 502, src: 'https://cdn.shopify.com/red.jpg', variant_ids: [902] },
      { id: 503, src: 'https://cdn.shopify.com/unlinked.jpg', variant_ids: [] },
    ],
  }] }, 'https://store.com')
  const product = result.products[0]
  assert.deepEqual(product.imageVariantIds, {
    'https://cdn.shopify.com/blue.jpg': ['901'],
    'https://cdn.shopify.com/red.jpg': ['902'],
  })
  assert.equal(product.variants[0].image, 'https://cdn.shopify.com/blue.jpg')
  assert.equal(product.variants[1].image, 'https://cdn.shopify.com/red.jpg')
  assert.deepEqual(variantImages(product, '901'), ['https://cdn.shopify.com/blue.jpg'])
  assert.deepEqual(variantImages(product, '902'), ['https://cdn.shopify.com/red.jpg'])
  assert.deepEqual(variantImages(product, 'missing'), [])
})

test('combines search/type/stock filters and places unknown prices last in both directions', () => {
  const { products } = normalizeProducts({ products: [product(1, 'Beta', '20.00', false), product(2, 'Alpha', '0', true), product(3, 'Gamma', null)] }, 'https://store.com')
  const base = { query: '', type: 'all', availability: 'all', sort: 'price-asc' }
  assert.deepEqual(filterProducts(products, base).map(p => p.title), ['Alpha', 'Beta', 'Gamma'])
  assert.deepEqual(filterProducts(products, { ...base, sort: 'price-desc' }).map(p => p.title), ['Beta', 'Alpha', 'Gamma'])
  assert.deepEqual(filterProducts(products, { ...base, query: 'alpha running', type: 'Shoes', availability: 'available' }).map(p => p.title), ['Alpha'])
  assert.equal(filterProducts(products, { ...base, query: 'missing' }).length, 0)
  assert.equal(products[0].title, 'Beta')
})

test('server rejects local addresses before any catalog request', async () => {
  const result = await getCatalogPage('http://127.0.0.1:3000', 1)
  assert.equal(result.ok, false)
})
