import type { Generation } from './studio'

type CurrentJob=Pick<Generation,'status'|'prepared'|'compositionStatus'|'error'|'images'>
/** Derive only the current saved job; prior research/chat activity cannot leak in. */
export function generationProgress(job:CurrentJob|undefined,submitting:boolean){
  if(submitting)return {label:'Preparing your ad',loading:true}
  if(!job)return {label:'Artwork preview',loading:false}
  if(job.status==='failed'||job.status==='interrupted')return {label:'Image creation stopped',loading:false,error:job.error||'Image creation could not finish. Your context is saved.'}
  if(job.status==='queued')return {label:job.prepared?'Starting image generation':'Planning your ad',loading:true}
  if(job.status==='generating')return {label:'Creating your artwork',loading:true}
  if(job.compositionStatus==='pending')return {label:'Finding space for copy',loading:true}
  return {label:'Artwork ready',loading:false}
}
