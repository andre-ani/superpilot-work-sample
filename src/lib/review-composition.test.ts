import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emptyCreative, mergeReviewComposition } from './creative.ts'
import { logoPlacement } from './composition.ts'
function source() {
  const state=emptyCreative()
  state.copyOptions=[{id:'one',label:'Original',headline:'Original long heading',body:'Original body'}]
  return state
}
function generated() {
  const state=source()
  state.layers.headline={...state.layers.headline,x:42,y:12,width:46,height:14}
  state.layers.body={...state.layers.body,x:48,y:29,width:40,height:8}
  state.layers.logo={...state.layers.logo,x:80,y:12,width:8,height:8}
  state.copyBaseLayers=structuredClone(state.layers)
  state.imageAnalysis={kind:'generated',summary:'Quiet upper sky.',safeInset:12,subjectPadding:5,opportunities:[],protectedAreas:[]}
  state.copyOptions=[{id:'one',label:'Original',headline:'Quiet sky',body:'Short body'}]
  return state
}
test('review adopts actual generated geometry instead of source-photo or old cached boxes',()=>{
  const original=source(),saved=structuredClone(original),seed=generated()
  saved.revision=12;saved.copyBaseLayers=structuredClone(original.layers);saved.copyLayouts={one:structuredClone(original.layers)}
  const merged=mergeReviewComposition(saved,seed,original)
  assert.deepEqual(merged.layers,seed.layers)
  assert.deepEqual(merged.copyBaseLayers,seed.layers)
  assert.deepEqual(merged.copyLayouts?.one,seed.layers)
  assert.equal(merged.copyOptions?.[0].headline,'Quiet sky')
  assert.equal(merged.imageAnalysis?.kind,'generated')
  assert.equal(merged.revision,12)
})
test('review refresh preserves explicit layout and copy edits while fixing other automatic layers',()=>{
  const original=source(),saved=structuredClone(original),seed=generated()
  saved.layoutEdits=['body'];saved.layers.body={...saved.layers.body,x:55,y:30,width:30,height:6}
  saved.copyOptions![0].headline='My actual edit'
  const merged=mergeReviewComposition(saved,seed,original)
  assert.deepEqual(merged.layers.body,saved.layers.body)
  assert.deepEqual(merged.layers.headline,seed.layers.headline)
  assert.deepEqual(merged.layers.logo,seed.layers.logo)
  assert.equal(merged.copyOptions?.[0].headline,'My actual edit')
})
test('logo fits its height as well as width and retains the generated-image safe inset',()=>{
  const state=generated();state.layers.logo={...state.layers.logo,x:50,y:76,width:24,height:7}
  const box=logoPlacement(state,100,100,1000,1000)!
  assert.equal(box.height,70);assert.equal(box.width,70)
  assert.ok(box.x>=120&&box.x+box.width<=880)
  assert.ok(box.y>=120&&box.y+box.height<=880)
  state.layers.logo.y=90
  assert.equal(logoPlacement(state,100,100,1000,1000),null)
})
