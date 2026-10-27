import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ideaBrandReady } from './idea-readiness.ts'
import type { StoreSnapshot } from './studio'
const brand={name:'Our Place',description:'Kitchen essentials for gathering.',brandContext:''}
const snapshot=(status?:'queued'|'running'|'complete'|'failed',researchStatus?:'complete'|'unavailable')=>({brand:{researchStatus},...(status?{enrichment:{status}}:{})}) as StoreSnapshot

test('source context allows background work before unrelated enrichment finishes',()=>{
  assert.equal(ideaBrandReady(brand,snapshot('running')),false)
  assert.equal(ideaBrandReady({...brand,brandContext:'Supported positioning from actual source research.'},snapshot('running')),true)
  assert.equal(ideaBrandReady({...brand,name:''},snapshot('complete')),false)
  assert.equal(ideaBrandReady({...brand,description:''},snapshot('complete')),false)
})
test('settled research failure and legacy scans use retained facts, never wait forever',()=>{
  assert.equal(ideaBrandReady(brand,snapshot('failed','unavailable')),true)
  assert.equal(ideaBrandReady(brand,snapshot('complete','complete')),true)
  assert.equal(ideaBrandReady(brand,snapshot()),true)
  assert.equal(ideaBrandReady(brand,snapshot('queued','unavailable')),true)
})
