import { test } from 'node:test'
import assert from 'node:assert/strict'
import { retryPlanning } from './planning-retry.ts'
import { currentCreativeFallback } from './creative-preparation.ts'
import { emptyCreative } from './creative.ts'
import { generationExecutionInput } from './generation-cache.ts'
import type { GenerationInput } from './studio.ts'

test('recoverable planner failure retries once and exposes attempts before returning',async()=>{
  const attempts:number[]=[],failures:number[]=[]
  const result=await retryPlanning(async attempt=>{attempts.push(attempt);if(attempt===1)throw {name:'AI_NoObjectGeneratedError',finishReason:'length'};return 'valid'},async(_error,attempt)=>{failures.push(attempt)})
  assert.equal(result,'valid');assert.deepEqual(attempts,[1,2]);assert.deepEqual(failures,[1])
})
test('persistent failure is bounded and bad credentials/config are never retried',async()=>{
  let calls=0
  await assert.rejects(retryPlanning(async()=>{calls++;throw {name:'AI_NoObjectGeneratedError'}}));assert.equal(calls,2)
  for(const failure of [{statusCode:401},{message:'compiled grammar is too large'},{message:'Structured generation requires a strict JSON schema.'}]){
    calls=0;await assert.rejects(retryPlanning(async()=>{calls++;throw failure}));assert.equal(calls,1)
  }
})
test('fallback uses only a complete current plan, without inventing copy',()=>{
  const state=emptyCreative()
  assert.equal(currentCreativeFallback(state),null)
  state.brief={...state.brief,headline:'Saved heading',message:'Saved message',visual:'Saved direction'};state.composition='Saved layout'
  assert.equal(currentCreativeFallback(state),null)
  state.copyOptions=Array.from({length:4},(_,index)=>({id:`copy-${index}`,label:`Copy ${index}`,headline:`Saved ${index}`,body:'Actual saved copy'}))
  const fallback=currentCreativeFallback(state)
  assert.deepEqual(fallback?.copyOptions,state.copyOptions);assert.equal(fallback?.brief.headline,'Saved heading')
})
test('new retry requests get a new execution even with cache on; transport replay stays idempotent',()=>{
  const input={requestId:'first',snapshotId:'snapshot',flowId:'flow',fresh:false,brand:{name:'Brand'}} as GenerationInput
  const key=(value:GenerationInput)=>JSON.stringify(generationExecutionInput(value,'https://brand.com','openai/gpt-image-2'))
  assert.equal(key(input),key({...input}))
  assert.notEqual(key(input),key({...input,requestId:'retry'}))
})
