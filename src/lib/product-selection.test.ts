import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectProduct, selectionImages, variantImages } from './product-selection.ts'
import type { CatalogProduct } from './catalog.ts'
const product: CatalogProduct = { id: '1', title: 'Cup', handle: 'cup', url: 'https://store.com/cup', description: '', type: '', vendor: '', tags: [], images: ['a', 'b'], imageVariantIds: { b: ['blue'] }, variants: [{ id: 'red', title: 'Red', image: 'c', available: true, price: 5 }, { id: 'blue', title: 'Blue', image: 'b', available: true, price: 5 }], minPrice: 5, maxPrice: 5, available: true }
test('variant scope defaults to its exact hero; null remains an explicit whole-gallery choice', () => {
  const single = selectProduct(product)
  assert.equal(single.image, 'c')
  assert.deepEqual(selectionImages(single), ['c'])
  assert.deepEqual(variantImages(product, 'red'), ['c'])
  assert.deepEqual(variantImages(product, 'blue'), ['b'])
  const all = selectProduct(product, undefined, undefined, undefined, true)
  assert.equal(all.allVariants, true)
  assert.deepEqual(selectionImages(all), ['a'])
  assert.deepEqual(selectionImages(selectProduct(product, 'red', null)), ['a', 'b', 'c'])
  const refined = selectProduct(product, 'blue', ['b', 'b', 'foreign'], 'a')
  assert.deepEqual(refined.imageUrls, ['b'])
  assert.equal(refined.image, 'b')
  assert.deepEqual(selectionImages(JSON.parse(JSON.stringify(refined))), ['b'])
  assert.throws(() => selectProduct(product, 'foreign'))
  assert.throws(() => selectProduct(product, 'blue', []))
  assert.throws(() => selectProduct(product, 'blue', ['foreign']))
})

test('multiple products, variants and exact images survive refresh and agent refinement', async () => {
  const { saveSelections, restoreSelections, upsertSelection, productReferences, applyProductAction } = await import('./product-selection.ts')
  const second = { ...product, id: '2', title: 'Plate', images: ['d', 'e'], variants: [{ ...product.variants[0], image: 'd' }] }
  const catalog = [product, second]
  const selections = [selectProduct(product, 'blue', ['b']), selectProduct(second)]
  const restored = restoreSelections(catalog, JSON.parse(JSON.stringify(saveSelections(selections))))
  assert.deepEqual(productReferences(restored), [{ productId: '1', variantId: 'blue', images: ['b'] }, { productId: '2', variantId: 'red', images: ['d'] }])
  assert.deepEqual(productReferences(applyProductAction(catalog, restored, { productId: '1', variantId: 'red', imageUrls: null, preserveImageSelection: true, preserveVariantSelection: true })), productReferences(restored))
  const refined = applyProductAction(catalog, restored, { productId: '2', imageUrls: ['e'] })
  assert.deepEqual(productReferences(refined)[0], productReferences(restored)[0])
  assert.deepEqual(productReferences(refined)[1].images, ['e'])
  assert.equal(upsertSelection(restored, restored[0]).length, 2)
  assert.equal(applyProductAction(catalog, refined, { productId: '1', remove: true })[0].product.id, '2')
  assert.deepEqual(restoreSelections(catalog, []), [])
  assert.throws(() => restoreSelections(catalog, [{ productId: '1', variantId: 'blue', imageUrls: ['foreign'] }]))
  assert.throws(() => applyProductAction(catalog, restored, { productId: '1', imageUrls: [] }))
  assert.throws(() => applyProductAction(catalog, restored, { productId: '1', imageUrls: ['foreign'] }))
  assert.deepEqual(productReferences(restoreSelections(catalog, [{ productId: '1', variantId: 'blue', image: 'b' }]))[0].images, ['b'])
  const all = selectProduct(product, 'blue', undefined, undefined, true)
  const savedAll = saveSelections([all])
  assert.equal(savedAll[0].allVariants, true)
  assert.equal(restoreSelections(catalog, savedAll)[0].allVariants, true)
  assert.deepEqual(productReferences([restoreSelections(catalog, savedAll)[0]])[0], { productId: '1', variantId: 'blue', images: ['a'], allVariants: true })
  const toggled = applyProductAction(catalog, [all], { productId: '1', allVariants: false, variantId: 'red', imageUrls: undefined })
  assert.equal(toggled[0].allVariants, undefined)
  assert.deepEqual(productReferences(toggled)[0], { productId: '1', variantId: 'red', images: ['c'] })
  assert.deepEqual(productReferences(restoreSelections(catalog, [{ productId: '1', variantId: 'red', imageUrls: null }]))[0].images, ['c', 'a', 'b'])
})
