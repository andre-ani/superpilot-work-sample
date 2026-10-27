import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectProduct, selectionImages } from './product-selection.ts'
import type { CatalogProduct } from './catalog.ts'
const product: CatalogProduct = { id: '1', title: 'Cup', handle: 'cup', url: 'https://store.com/cup', description: '', type: '', vendor: '', tags: [], images: ['a', 'b'], variants: [{ id: 'red', title: 'Red', image: 'c', available: true, price: 5 }, { id: 'blue', title: 'Blue', image: 'b', available: true, price: 5 }], minPrice: 5, maxPrice: 5, available: true }
test('whole product includes variant-only images; explicit refinements survive serialization', () => {
  const whole = selectProduct(product)
  assert.deepEqual(selectionImages(whole), ['a', 'b', 'c'])
  const refined = selectProduct(product, 'blue', ['b', 'b', 'foreign'], 'a')
  assert.deepEqual(refined.imageUrls, ['b'])
  assert.equal(refined.image, 'b')
  assert.deepEqual(selectionImages(JSON.parse(JSON.stringify(refined))), ['b'])
  assert.throws(() => selectProduct(product, 'foreign'))
  assert.throws(() => selectProduct(product, 'blue', []))
  assert.throws(() => selectProduct(product, 'blue', ['foreign']))
})
