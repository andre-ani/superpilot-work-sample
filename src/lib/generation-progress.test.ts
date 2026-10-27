import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generationProgress } from './generation-progress.ts'

test('preparation, image generation and copy placement derive from the current saved job',()=>{
  assert.deepEqual(generationProgress(undefined,true),{label:'Preparing your ad',loading:true})
  assert.equal(generationProgress({status:'queued',images:[]},false).label,'Planning your ad')
  assert.equal(generationProgress({status:'queued',prepared:true,images:[]},false).label,'Starting image generation')
  assert.equal(generationProgress({status:'generating',images:[]},false).label,'Creating your artwork')
  assert.equal(generationProgress({status:'complete',images:['0.png'],compositionStatus:'pending'},false).label,'Finding space for copy')
  assert.deepEqual(generationProgress({status:'complete',images:['0.png'],compositionStatus:'complete'},false),{label:'Artwork ready',loading:false})
})
test('actual failures remain visible, while a deliberate new submission clears stale failure presentation',()=>{
  const job={status:'failed' as const,images:['0.png'],error:'Ad planning could not finish.'}
  assert.equal(generationProgress(job,false).error,job.error)
  assert.equal(generationProgress(job,false).loading,false)
  assert.deepEqual(generationProgress(job,true),{label:'Preparing your ad',loading:true})
  assert.equal(generationProgress({status:'interrupted',images:[]},false).loading,false)
})

test('bounded planning retry is visible instead of a stale generic placeholder',()=>{
  assert.equal(generationProgress({status:'queued',images:[],preparation:{attempt:2,status:'retrying',message:'Retrying ad planning (2 of 2)'}},false).label,'Retrying ad planning (2 of 2)')
})
