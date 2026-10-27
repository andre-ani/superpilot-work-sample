import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeAdBox } from './ad-typography.ts'
import { emptyCreative, mergeReviewCopyOptions } from './creative.ts'

test('safe areas intersect the image opportunity and keep 8% clear at every edge', () => {
  assert.deepEqual(safeAdBox({x:0,y:0,width:100,height:100}),{x:8,y:8,width:84,height:84})
  assert.deepEqual(safeAdBox({x:5,y:3.5,width:90,height:14.5}),{x:8,y:8,width:84,height:10})
})
test('compact generated copy updates old review options without replacing manual edits', () => {
  const original=emptyCreative();original.copyOptions=[{id:'a',label:'One',headline:'Original long headline',body:'Original body'},{id:'b',label:'Two',headline:'Second headline',body:''}]
  const saved=structuredClone(original);saved.copyOptions![1].headline='My words';saved.selectedCopy='a'
  const seed=structuredClone(original);seed.copyOptions![0].headline='Short copy';seed.copyOptions![1].headline='Other short copy'
  const next=mergeReviewCopyOptions(saved,seed,original)
  assert.equal(next.copyOptions![0].headline,'Short copy')
  assert.equal(next.copyOptions![1].headline,'My words')
  assert.equal(next.brief.headline,'Short copy')
})

test('explicitly requested new copy sets survive review refresh', () => {
  const original=emptyCreative();original.copyOptions=[{id:'original',label:'Original',headline:'Old',body:''}]
  const saved=emptyCreative();saved.copyOptions=[{id:'custom',label:'My request',headline:'My new idea',body:''}]
  const next=mergeReviewCopyOptions(saved,original,original)
  assert.deepEqual(next.copyOptions,saved.copyOptions)
})

test('new-policy bounds are more generous without changing legacy saved bounds',()=>{
  const whole={x:0,y:0,width:100,height:100}
  assert.deepEqual(safeAdBox(whole,12),{x:12,y:12,width:76,height:76})
  assert.deepEqual(safeAdBox(whole),{x:8,y:8,width:84,height:84})
  assert.deepEqual(safeAdBox({x:10,y:10,width:30,height:20},12),{x:12,y:12,width:28,height:18})
})
