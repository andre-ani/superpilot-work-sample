import { z } from 'zod'
import { assertRevisionSource } from './studio.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyStudioAction, assertStudioContext, assertStudioEffects, creativeDirection, creativeSchema, emptyCreative, studioActionSchema, studioBatchSchema } from './creative.ts'

test('stale or different-store/product agent commands cannot apply', () => {
  const batch = studioBatchSchema.parse({ snapshotId: 'scan', productId: 'mug', revision: 2, actions: [{ op: 'brief', patch: { headline: 'A quiet start' } }] })
  assertStudioContext(batch, { snapshotId: 'scan', productId: 'mug', revision: 2 })
  for (const current of [{ snapshotId: 'other', productId: 'mug', revision: 2 }, { snapshotId: 'scan', productId: 'other', revision: 2 }, { snapshotId: 'scan', productId: 'mug', revision: 3 }]) assert.throws(() => assertStudioContext(batch, current), /context changed/)
})
test('concept selection preserves the chosen brief and original state across serialization', () => {
  const initial = emptyCreative()
  const proposed = applyStudioAction(initial, { op: 'concepts', concepts: [{ ...initial.brief, id: 'morning', name: 'Morning ritual', headline: 'A quiet start', message: 'Morning coffee' }] })
  const selected = applyStudioAction(proposed, { op: 'choose-concept', id: 'morning' })
  const edited = applyStudioAction(selected, { op: 'brief', patch: { headline: '' } })
  assert.equal(selected.brief.headline, 'A quiet start')
  assert.equal(edited.brief.headline, '')
  assert.equal(initial.concepts.length, 0)
  assert.deepEqual(creativeSchema.parse(JSON.parse(JSON.stringify(edited))), edited)
  assert.throws(() => applyStudioAction(proposed, { op: 'choose-concept', id: 'missing' }))
})
test('invalid layout is rejected; no duplicate paid effects or mutation after export', () => {
  assert.throws(() => applyStudioAction(emptyCreative(), { op: 'layout', layer: 'headline', patch: { x: 101 } }))
  assert.throws(() => assertStudioEffects([{ op: 'generate' }, { op: 'generate' }]))
  assert.throws(() => assertStudioEffects([{ op: 'export' }, { op: 'brief', patch: { headline: 'late' } }]))
  assert.equal(assertStudioEffects([{ op: 'layout', layer: 'logo', patch: { visible: false } }, { op: 'export' }])?.op, 'export')
})
test('maximum brief and revision serialize without truncating JSON', () => {
  const state = emptyCreative()
  state.brief = { audience: 'a'.repeat(600), message: 'b'.repeat(600), offer: 'c'.repeat(600), hook: 'd'.repeat(600), headline: 'e'.repeat(180), body: 'f'.repeat(400), visual: 'g'.repeat(1200) }
  const result = creativeDirection(state, 'h'.repeat(1200))
  assert.ok(result.length < 8000)
  assert.equal(JSON.parse(result).visual.length, 1200)
})

test('image revision cannot use another store, product, variant, or incomplete output', async () => {
  const source = { status: 'complete', storeUrl: 'https://shop.example', input: { productId: 'mug', variantId: 'blue' } } as import('./studio').Generation
  assertRevisionSource(source, source.storeUrl, source.input)
  assert.throws(() => assertRevisionSource(source, 'https://other.example', source.input))
  assert.throws(() => assertRevisionSource(source, source.storeUrl, { productId: 'plate', variantId: 'blue' }))
  assert.throws(() => assertRevisionSource(source, source.storeUrl, { productId: 'mug', variantId: 'red' }))
  assert.throws(() => assertRevisionSource({ ...source, status: 'generating' }, source.storeUrl, source.input))
})

test('Sonnet wire schema uses supported anyOf rather than oneOf', () => {
  const schema = JSON.stringify(z.toJSONSchema(studioActionSchema))
  assert.ok(schema.includes('"anyOf"'))
  assert.ok(!schema.includes('"oneOf"'))
})

test('an idea keeps its actual heading and subheading separate from its internal name',()=>{
  const next=applyStudioAction(emptyCreative(),{op:'ad-direction',id:'gathering',angle:'Invite people to outdoor gatherings.',hook:'Stay a little longer',headline:'Stay a little longer',subheading:'Warm light for evenings together.',visual:'A softly lit patio.'})
  assert.equal(next.brief.headline,'Stay a little longer')
  assert.equal(next.brief.body,'Warm light for evenings together.')
  assert.ok(next.briefEdits?.includes('headline'))
  assert.ok(next.briefEdits?.includes('body'))
})
