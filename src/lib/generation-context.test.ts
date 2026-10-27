import { generationCacheInput } from './generation-cache.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generationPrompt, normalizeGenerationContext } from './generation-context.ts'
import { assertRevisionSource, generationProductIdentity, type GenerationInput, type StoreSnapshot, type Generation } from './studio.ts'
const product = (id: string) => ({ id, title: id, description: `Facts for ${id}`, images: [`https://cdn.shopify.com/${id}-a.png`, `https://cdn.shopify.com/${id}-b.png`], variants: [{ id: `${id}-v`, title: 'Blue', image: null }] })
const snapshot = { catalog: { products: [product('one'), product('two')] }, storeUrl: 'https://shop.com' } as StoreSnapshot
const input: GenerationInput = {requestId:'test',snapshotId:'scan',productId:'one',variantId:'one-v',image:product('one').images[0],brand:{name:'Brand',description:'Brand facts',logoUrl:'',colors:[],headingFont:'',bodyFont:'',direction:'',visualStyle:'Illustrated',visualReferences:['https://images.example.com/inspiration.png']},direction:'',format:'square',artworkOnly:true}
test('generation keeps every selected product and exact reference; rejects cross-product substitutions', () => {
  const products = [{productId:'one',variantId:'one-v',images:[product('one').images[1]]},{productId:'two',variantId:'two-v',images:product('two').images}]
  const normalized=normalizeGenerationContext(snapshot,{...input,products})
  assert.deepEqual(normalized.products,products)
  assert.equal(normalized.image,product('one').images[1])
  assert.throws(()=>normalizeGenerationContext(snapshot,{...input,products:[{...products[0],images:product('two').images}]}))
  assert.throws(()=>normalizeGenerationContext(snapshot,{...input,products:[products[0],products[0]]}))
  assert.throws(()=>normalizeGenerationContext(snapshot,{...input,products:[{...products[0],images:[]}]}))
  const prompt=generationPrompt(snapshot,normalized)
  assert.ok(prompt.includes('"referenceNumbers":[1]'))
  assert.ok(prompt.includes('"referenceNumbers":[2,3]'))
  assert.ok(prompt.includes('"visualInspiration":[4]'))
  const source={status:'complete',storeUrl:snapshot.storeUrl,input:normalized} as Generation
  assertRevisionSource(source,snapshot.storeUrl,normalized)
  assert.throws(()=>assertRevisionSource(source,snapshot.storeUrl,{...normalized,products:products.slice(0,1)}))
})
test('brand-only stays empty and old single-photo jobs stay single-photo',()=>{
  assert.deepEqual(normalizeGenerationContext(snapshot,{...input,products:[]}).products,[])
  assert.ok(generationPrompt(snapshot,{...input,products:[]}).includes('No products were selected'))
  assert.deepEqual(normalizeGenerationContext(snapshot,input).products?.[0].images,[input.image])
})

test('all-variant generation scope is normalized, named in the prompt, and identity-distinct', () => {
  const multi = {
    ...product('multi'),
    variants: [{ id: 'multi-v', title: 'Blue', image: null }, { id: 'multi-w', title: 'Red', image: null }],
  }
  const multiSnapshot = { ...snapshot, catalog: { ...snapshot.catalog, products: [...snapshot.catalog.products, multi] } } as StoreSnapshot
  const products = [{ productId: 'multi', variantId: 'multi-v', images: [multi.images[0]], allVariants: true }]
  const normalized = normalizeGenerationContext(multiSnapshot, { ...input, products })
  assert.deepEqual(normalized.products, products)
  const prompt = generationPrompt(multiSnapshot, normalized)
  assert.ok(prompt.includes('"allVariants":true'))
  assert.ok(prompt.includes('"title":"Blue"'))
  assert.ok(prompt.includes('"title":"Red"'))
  assert.notEqual(generationProductIdentity({ productId: '', variantId: '', products: [{ ...products[0], allVariants: false }] }), generationProductIdentity({ productId: '', variantId: '', products }))
  assert.equal(generationProductIdentity({ productId: '', variantId: '', products: [{ productId: 'multi', variantId: 'multi-v', images: [] }] }), generationProductIdentity({ productId: '', variantId: '', products: [{ productId: 'multi', variantId: 'multi-v', images: [], allVariants: false }] }))
  assert.throws(() => normalizeGenerationContext(multiSnapshot, { ...input, products: [{ productId: 'multi', variantId: 'unknown', images: [multi.images[0]], allVariants: true }] }))
})

test('future copy policy requests larger natural space and cannot reuse legacy cache identity',()=>{
  const future={...input,copyPolicyVersion:2}
  const prompt=generationPrompt(snapshot,normalizeGenerationContext(snapshot,future))
  assert.match(prompt,/at least 40%/)
  assert.match(prompt,/12% inside every edge/)
  assert.match(prompt,/5% away/)
  assert.notDeepEqual(generationCacheInput(future),generationCacheInput(input))
  assert.equal(input.copyPolicyVersion,undefined)
})
