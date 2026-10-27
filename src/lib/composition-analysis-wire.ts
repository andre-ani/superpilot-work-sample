import { z } from 'zod'
const box={x:z.number(),y:z.number(),width:z.number(),height:z.number()}
// Keep provider grammar small; strict bounded/evidence validation follows locally.
export const compositionWireSchema=z.object({
  summary:z.string(),
  opportunities:z.array(z.object({...box,role:z.enum(['headline','body','logo']),reason:z.string(),color:z.string(),confidence:z.number()})),
  protectedAreas:z.array(z.object({...box,label:z.string()})),
  copyOptions:z.array(z.object({id:z.string(),label:z.string(),headline:z.string(),body:z.string()})),
})
