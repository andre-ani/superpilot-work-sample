import { test } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { compositionWireSchema } from './composition-analysis-wire.ts'
import { placementPendingFresh,placementFailureMessage,recoverablePlacementFailure } from './composition-retry.ts'
import { retryPlanning } from './planning-retry.ts'

test('placement wire grammar is strict-compatible and local geometry still enforces bounds',()=>{
  const wire=JSON.stringify(z.toJSONSchema(compositionWireSchema))
  assert.doesNotMatch(wire,/maxLength|anyOf|oneOf/)
  assert.match(wire,/additionalProperties/)
})
test('only transient/incomplete placement failures receive a bounded automatic retry',async()=>{
  assert.equal(recoverablePlacementFailure({name:'AI_NoObjectGeneratedError',finishReason:'length'}),true)
  assert.equal(recoverablePlacementFailure({statusCode:401}),false)
  assert.equal(recoverablePlacementFailure({statusCode:400,message:'compiled grammar too large'}),false)
  let calls=0
  await assert.rejects(retryPlanning(async()=>{calls++;throw Object.assign(new Error('NoObjectGenerated'),{name:'AI_NoObjectGeneratedError'})}))
  assert.equal(calls,2)
  assert.match(placementFailureMessage({name:'AI_NoObjectGeneratedError'}),/Retry placement/)
})
test('fresh pending placement is reused; stale interrupted state can be explicitly retried',()=>{
  const now=Date.now(),fresh={compositionStatus:'pending',updatedAt:new Date(now-1000).toISOString()}
  assert.equal(placementPendingFresh(fresh,now),true)
  assert.equal(placementPendingFresh({...fresh,updatedAt:new Date(now-8*60000).toISOString()},now),false)
  assert.equal(placementPendingFresh({...fresh,compositionStatus:'unavailable'},now),false)
})
