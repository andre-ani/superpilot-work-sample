import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fitText } from './text-fit.ts'
import { applyStudioAction, copyVariationState, emptyCreative, studioActionSchema, assertStudioEffects } from './creative.ts'

// Deterministic font metrics isolate the fitting/search contract from installed OS fonts.
function metrics(text: string, font: string, width: number, lineHeight: number) {
  const size = Number(/ (\d+)px /.exec(font)?.[1]), unit = size * 0.6
  const lines: { text: string; width: number }[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word
    if (line && candidate.length * unit > width) { lines.push({ text: line, width: line.length * unit }); line = word } else line = candidate
  }
  if (line) lines.push({ text: line, width: line.length * unit })
  return { lines, height: lines.length * lineHeight }
}
test('BEST PRODUCT EVER grows into two lines rather than retaining a small one-line size', () => {
  const box = { width: 600, height: 220 }
  const one = fitText('BEST PRODUCT EVER', 'Test', box, { minSize: 20, maxSize: 200, maxLines: 1 }, metrics)
  const two = fitText('BEST PRODUCT EVER', 'Test', box, { minSize: 20, maxSize: 200, maxLines: 2 }, metrics)
  assert.equal(two.lines.length, 2)
  assert.equal(two.lines[1].text, 'EVER')
  assert.ok(two.size > one.size)
  assert.ok(two.height <= box.height && two.lines.every(line => line.width <= box.width))
  assert.ok(!fitText('BEST PRODUCT EVER', 'Test', box, { minSize: two.size + 1, maxSize: two.size + 1, maxLines: 2 }, metrics).fits)
})
test('changing copy and bounds recomputes size; overset copy is reported intact', () => {
  const options = { minSize: 20, maxSize: 200, maxLines: 2 }
  const short = fitText('BEST EVER', 'Test', { width: 600, height: 220 }, options, metrics)
  const long = fitText('BEST PRODUCT EVER', 'Test', { width: 600, height: 220 }, options, metrics)
  assert.ok(short.size > long.size)
  const overset = fitText('A VERY LONG LINE OF COPY THAT CANNOT FIT', 'Test', { width: 50, height: 30 }, options, metrics)
  assert.equal(overset.fits, false)
  assert.equal(overset.lines.map(line => line.text).join(' '), 'A VERY LONG LINE OF COPY THAT CANNOT FIT')
})
test('copy selection preserves artwork/layout and needs no generation effect', () => {
  const state = emptyCreative()
  state.copyOptions = [{ id: 'short', label: 'Direct', headline: 'BEST PRODUCT EVER', body: 'See it for yourself.' }]
  state.layers.headline = { ...state.layers.headline, width: 50, height: 25, autoFit: false }
  const action = { op: 'choose-copy' as const, id: 'short' }
  const selected = applyStudioAction(state, action)
  assert.equal(selected.brief.headline, 'BEST PRODUCT EVER')
  assert.equal(selected.layers.headline.width, 50)
  assert.equal(selected.layers.headline.autoFit, true)
  assert.equal(assertStudioEffects([action]), undefined)
  assert.throws(() => studioActionSchema.parse({ op: 'copy-options', options: [{ id: 'bad', label: 'Too long', headline: 'x'.repeat(81), body: '' }] }))
})

test('explicit font-size requests switch to manual; fill can be restored', () => {
  const manual = applyStudioAction(emptyCreative(), { op: 'layout', layer: 'headline', patch: { size: 96 } })
  assert.equal(manual.layers.headline.autoFit, false)
  const automatic = applyStudioAction(manual, { op: 'layout', layer: 'headline', patch: { autoFit: true } })
  assert.equal(automatic.layers.headline.autoFit, true)
})

test('selecting a variation does not reflow it; edits and alignment remain local to that variation', () => {
  const initial = emptyCreative()
  initial.copyOptions = [{ id: 'a', label: 'First', headline: 'First headline', body: '' }, { id: 'b', label: 'Second', headline: 'Second headline', body: 'Second body' }]
  const preview = copyVariationState(initial, 'a')
  let state = applyStudioAction(initial, { op: 'choose-copy', id: 'a' })
  assert.deepEqual(state.layers, preview.layers)
  state = applyStudioAction(state, { op: 'layout', layer: 'headline', patch: { align: 'center' } })
  state = applyStudioAction(state, { op: 'edit-copy', id: 'a', patch: { headline: 'Edited here' } })
  const second = copyVariationState(state, 'b')
  assert.equal(second.layers.headline.align, undefined)
  assert.equal(second.brief.headline, 'Second headline')
  const first = copyVariationState(state, 'a')
  assert.equal(first.layers.headline.align, 'center')
  assert.equal(first.brief.headline, 'Edited here')
})

test('focusing artwork or text cannot invalidate pending composition preparation', () => {
  const initial=emptyCreative(); initial.revision=7
  assert.equal(applyStudioAction(initial,{op:'focus-artwork'}).revision,7)
  assert.equal(applyStudioAction(initial,{op:'focus-text',layer:'headline'}).revision,7)
})

test('manual type size cannot bypass the mobile readability floor', () => {
  assert.equal(applyStudioAction(emptyCreative(),{op:'layout',layer:'headline',patch:{size:20}}).layers.headline.size,84)
  assert.equal(applyStudioAction(emptyCreative(),{op:'layout',layer:'body',patch:{size:20}}).layers.body.size,42)
  const result=fitText('Read me','Test',{width:600,height:200},{minSize:84,maxSize:200,maxLines:2,fixedSize:20},metrics)
  assert.equal(result.size,84)
})
