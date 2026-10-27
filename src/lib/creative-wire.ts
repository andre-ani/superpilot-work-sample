import { z } from 'zod'
// Required-only provider shape avoids exponential grammar expansion from UI optionals.
// The richer local creativeSchema still validates the result before any image request.
const text=z.string(),number=z.number()
const box={x:number,y:number,width:number,height:number}
const layer=z.object({...box,size:number,color:text,visible:z.boolean(),autoFit:z.boolean(),maxLines:number,align:z.enum(['left','center','right'])})
export const creativeWireSchema=z.object({
  brief:z.object({audience:text,message:text,offer:text,hook:text,headline:text,body:text,visual:text}),
  composition:text,
  layers:z.object({headline:layer,body:layer,logo:layer}),
  copyOptions:z.array(z.object({id:text,label:text,headline:text,body:text})),
  imageAnalysis:z.object({summary:text,opportunities:z.array(z.object({...box,role:z.enum(['headline','body','logo']),imageIndex:number,reason:text,color:text,confidence:number})),protectedAreas:z.array(z.object({...box,label:text,imageIndex:number}))}),
})
export function preparationFailureMessage(error:unknown){
  const e=error&&typeof error==='object'?error as {name?:unknown;message?:unknown;responseBody?:unknown;statusCode?:unknown;finishReason?:unknown}:{}
  const signal=`${String(e.name??'')} ${String(e.message??'')} ${String(e.responseBody??'')}`
  if(e.finishReason==='length')return 'Ad planning was cut off before the response finished. No image was requested. Your context is saved; try Generate again.'
  if(/NoObjectGenerated/i.test(signal))return 'Ad planning returned invalid JSON. No image was requested. Your context is saved.'
  if(e.name==='ZodError')return 'Ad planning returned data outside the supported limits. No image was requested. Your context is saved.'
  if(/compiled grammar|strict.*schema|schema.*large|response.*schema|NoObjectGenerated/i.test(signal))return 'Ad planning could not finish before image creation. Your saved context is usable; try again.'
  if(e.statusCode===429||/rate.limit|overloaded/i.test(signal))return 'Ad planning is temporarily busy. Your context is saved; try again in a moment.'
  if(/timeout|timed out|AbortError/i.test(signal))return 'Ad planning took too long. No image was requested. Your context is saved; try again.'
  return 'Ad planning could not finish. Your context is saved and no image was requested. Try again.'
}

/** Private diagnostics only: retain model output, never request headers or credentials. */
export function preparationFailureDetails(error: unknown) {
  const detail = error && typeof error === 'object' ? error as {name?:string;message?:string;statusCode?:number;isRetryable?:boolean;text?:string;finishReason?:string;usage?:unknown;response?:{id?:string;modelId?:string};cause?:{name?:string;message?:string}} : {}
  return {name:detail.name,message:detail.message,status:detail.statusCode,retryable:detail.isRetryable,text:detail.text,finishReason:detail.finishReason,usage:detail.usage,responseId:detail.response?.id,model:detail.response?.modelId,cause:detail.cause?{name:detail.cause.name,message:detail.cause.message}:undefined}
}
