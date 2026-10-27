import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emptyCreative } from './creative.ts'
import { creativeForContext, creativeNeedsPreparation, mergePreparedCreative } from './creative-preparation.ts'

function proposal() {
  const state = emptyCreative()
  state.brief = { audience: 'Coffee drinkers', message: 'A quiet morning ritual', offer: 'Invented 10% offer', hook: 'A moment before the day begins', headline: 'A quiet start', body: 'Meet your morning mug.', visual: 'Place the mug low and right with quiet space at the top.' }
  state.composition = 'Mug in the lower-right third. Clear cream backdrop across the top 30% for dark headline text.'
  return state
}
test('empty context brief receives real copy/space but no invented offer', () => {
  const current = emptyCreative()
  assert.equal(creativeNeedsPreparation(current), true)
  const result = mergePreparedCreative(current, proposal())
  assert.equal(result.brief.headline, 'A quiet start')
  assert.equal(result.brief.offer, '')
  assert.ok(result.composition?.includes('top 30%'))
  assert.equal(creativeNeedsPreparation(result), false)
  assert.equal(current.brief.headline, '')
})
test('merchant brief, visual direction, composition and layout edits survive preparation', () => {
  const current = emptyCreative()
  current.brief.headline = 'My approved headline'
  current.brief.offer = 'Free gift with purchase'
  current.brief.visual = 'Use posterized illustration'
  current.composition = 'Reserve the whole left third for text'
  current.layers.headline = { ...current.layers.headline, x: 10, width: 30, color: '#000000' }
  const result = mergePreparedCreative(current, proposal())
  assert.equal(result.brief.headline, current.brief.headline)
  assert.equal(result.brief.offer, current.brief.offer)
  assert.equal(result.brief.visual, current.brief.visual)
  assert.equal(result.composition, current.composition)
  assert.deepEqual(result.layers.headline, current.layers.headline)
})
test('unusable copy cannot advance to image creation', () => {
  assert.throws(() => mergePreparedCreative(emptyCreative(), emptyCreative()), /No image was generated/)
})

test('cached preparation merges into current concept options instead of replacing them', () => {
  const current = emptyCreative()
  current.revision = 8
  current.concepts = [{ ...proposal().brief, id: 'selected', name: 'My option' }]
  current.selectedConcept = 'selected'
  const result = mergePreparedCreative(current, proposal())
  assert.equal(result.revision, 8)
  assert.deepEqual(result.concepts, current.concepts)
  assert.equal(result.selectedConcept, 'selected')
})

test('changed context refreshes automatic copy while preserving explicit edits', () => {
  const state = proposal()
  state.preparedContext = 'previous'
  state.briefEdits = ['headline']
  state.layoutEdits = ['headline']
  state.layers.headline.x = 15
  const next = creativeForContext(state, 'new-products')
  assert.equal(next.brief.headline, 'A quiet start')
  assert.equal(next.brief.message, '')
  assert.equal(next.composition, undefined)
  assert.equal(next.layers.headline.x, 15)
  assert.equal(state.brief.message, 'A quiet morning ritual')
})

test('cached preparation retains the actual pixel-analysis provenance', () => {
  const proposed = proposal()
  proposed.visionSourceHash = 'actual-image-hash'
  proposed.imageAnalysis = { kind:'source',summary:'A photographed can with no surrounding margin',opportunities:[],protectedAreas:[] }
  const merged = mergePreparedCreative(emptyCreative(), proposed)
  assert.equal(merged.visionSourceHash,'actual-image-hash')
  assert.equal(merged.imageAnalysis?.kind,'source')
})
