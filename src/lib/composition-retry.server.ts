import { randomUUID } from 'node:crypto'
import { start } from 'workflow/api'
import { retryCompositionWorkflow } from '../../workflows/composition-retry'
import { readGeneration,saveGeneration,safeId } from './studio-storage.server.ts'
import { placementPendingFresh } from './composition-retry.ts'
import type { Generation } from './studio.ts'
const queueing=new Map<string,Promise<Generation>>()

export async function startCompositionRetry(id:string):Promise<Generation>{
  safeId(id)
  const running=queueing.get(id);if(running)return running
  const request=(async()=>{
    const job=await readGeneration(id)
    if(!job||job.status!=='complete'||!job.images.length||!job.input.creative)throw new Error('Choose saved artwork with its original ad context to retry placement.')
    if(job.compositionStatus==='complete'&&job.composition||placementPendingFresh(job))return job
    const now=new Date().toISOString()
    await saveGeneration({...job,compositionStatus:'pending',compositionError:undefined,placement:{requestId:randomUUID(),attempt:0,maxAttempts:2,status:'queued',message:'Text placement queued',startedAt:now,updatedAt:now}})
    try{await start(retryCompositionWorkflow,[id])}
    catch{
      const latest=await readGeneration(id)
      if(latest?.placement)await saveGeneration({...latest,compositionStatus:'unavailable',compositionError:'Your artwork is saved. The placement retry could not start. Retry placement again.',placement:{...latest.placement,status:'failed',message:'Placement retry could not start',updatedAt:new Date().toISOString()}})
    }
    return (await readGeneration(id))!
  })()
  queueing.set(id,request)
  try{return await request}finally{queueing.delete(id)}
}
