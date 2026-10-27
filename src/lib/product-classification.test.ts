import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyWithFallback, parseInferenceScores, inferenceRequest, type ClassificationBatch } from './product-classification.ts'
import type { CatalogProduct } from './catalog.ts'
const products = [{ id: 'one' }, { id: 'two' }] as CatalogProduct[]
const result: ClassificationBatch = { scores: [{ productId:'one', probability:.9 },{productId:'two',probability:.1}], model:'configured-inference', cost:.01 }

test('provider failure falls back once and records the original failure', async () => {
  const failure = Object.assign(new Error('HTTP 503'), { status:503 })
  let primary=0, fallback=0, recorded:unknown
  const actual=await classifyWithFallback(async()=>{primary++;throw failure},async()=>{fallback++;return result},async error=>{recorded=error})
  assert.equal(actual,result);assert.equal(primary,1);assert.equal(fallback,1);assert.equal(recorded,failure)
})
test('optional Decisions can be skipped and success never duplicates paid inference', async () => {
  let fallback=0
  assert.equal(await classifyWithFallback(undefined,async()=>{fallback++;return result},async()=>{}),result)
  assert.equal(await classifyWithFallback(async()=>result,async()=>{fallback++;return result},async()=>{throw Error('unexpected')}),result)
  assert.equal(fallback,1)
})
test('fallback failure propagates without an automatic retry', async () => {
  let calls=0
  await assert.rejects(classifyWithFallback(async()=>{throw Error('503')},async()=>{calls++;throw Error('inference stopped')},async()=>{}),/inference stopped/)
  assert.equal(calls,1)
})
test('ordinary inference must cover every exact candidate once with valid scores',()=>{
  assert.deepEqual(parseInferenceScores({scores:result.scores},products),result.scores)
  for(const scores of [[result.scores[0]], [result.scores[0],result.scores[0]], [{productId:'foreign',probability:.9},result.scores[1]], [{productId:'one',probability:1.1},result.scores[1]], [{productId:'one',probability:NaN},result.scores[1]]]) assert.throws(()=>parseInferenceScores({scores},products))
})
test('normal inference preserves visual evidence and bounds its schema to known IDs',()=>{
  const evidence=[{type:'text',text:'Actual evidence'},{type:'image_url',image_url:{url:'data:image/png;base64,real'}}]
  const request=inferenceRequest('configured-inference',products,'red products',evidence)
  assert.equal(request.model,'configured-inference');assert.equal(request.max_tokens,2048)
  assert.deepEqual(request.messages[1].content.slice(1),evidence)
  assert.deepEqual(request.response_format.json_schema.schema.properties.scores.items.properties.productId.enum,['one','two'])
})
