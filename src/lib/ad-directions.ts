import { z } from 'zod'
import { brandPatchSchema } from './brand-actions.ts'
import { generationProductsSchema } from './generation-context.ts'

export const adDirectionRequestSchema=z.object({snapshotId:z.string().max(64),brand:brandPatchSchema,products:generationProductsSchema,preferences:z.string().max(2000).default(''),count:z.union([z.literal(2),z.literal(3)]).optional(),refresh:z.boolean().optional(),bypassCache:z.boolean().optional(),flowId:z.string().max(100).optional(),requestId:z.string().max(100).optional(),avoid:z.array(z.string().max(140)).max(12).optional()})
export const adDirectionSchema=z.object({id:z.string().min(1).max(60),category:z.enum(['brand_story','value_proposition','product_benefit','testimonial']),title:z.string().min(1).max(140),angle:z.string().min(1).max(600),visual:z.string().min(1).max(1200),headline:z.string().max(120),subheading:z.string().max(240).optional(),rationale:z.string().max(1000),evidence:z.array(z.object({sourceId:z.string(),quote:z.string().min(6).max(240)})).min(1).max(3)})
export type AdDirectionRequest=z.infer<typeof adDirectionRequestSchema>
export type DirectionSource={id:string;title:string;url:string;kind:'brand'|'product'|'merchant'|'testimonial';text:string;attribution?:string}
export type AdDirection=Omit<z.infer<typeof adDirectionSchema>,'evidence'>&{evidence:(z.infer<typeof adDirectionSchema>['evidence'][number]&{title:string;url:string;attribution?:string})[]}
export type AdDirectionResult={contextKey:string;directions:AdDirection[];summary:string;cached:boolean;generatedAt?:string}
const normalized=(text:string)=>text.replace(/\s+/g,' ').trim().toLowerCase()
export function validateDirections(raw:z.infer<typeof adDirectionSchema>[],sources:DirectionSource[]):AdDirection[]{
  const ids=new Set<string>()
  return raw.map(direction=>{
    if(ids.has(direction.id))throw new Error('Ad direction IDs must be distinct.')
    ids.add(direction.id)
    const evidence=direction.evidence.map(item=>{
      const source=sources.find(source=>source.id===item.sourceId)
      if(!source||!normalized(source.text).includes(normalized(item.quote)))throw new Error('An ad direction cited evidence that was not found.')
      if(direction.category==='testimonial'&&(source.kind!=='testimonial'||!source.attribution))throw new Error('A customer quote needs a found attribution.')
      return {...item,title:source.title,url:source.url,attribution:source.attribution}
    })
    if(direction.category==='product_benefit'&&!evidence.some(item=>sources.find(source=>source.id===item.sourceId)?.kind==='product'))throw new Error('Product benefits require selected-product evidence.')
    return {...direction,evidence}
  })
}
export function testimonialSources(sources:DirectionSource[]):DirectionSource[]{
  return sources.flatMap(source=>[...source.text.matchAll(/[“"]([^”"\n]{20,220})[”"]\s*(?:—|–|-)\s*([\p{L}][\p{L} .]{1,50})/gu)].flatMap((match,index)=>{
    const preceding=source.text.slice(Math.max(0,(match.index??0)-120),match.index)
    return /customer|testimonial|review/i.test(preceding)?[{id:`quote-${source.id}-${index}`,title:'Customer quote',url:source.url,kind:'testimonial' as const,text:match[1],attribution:match[2].trim()}]:[]
  }))
}

export function adDirectionError(error:unknown,fallback:string) {
  const record=error&&typeof error==='object'?error as {name?:unknown;message?:unknown;responseBody?:unknown;statusCode?:unknown;cause?:unknown;finishReason?:unknown;text?:unknown}:{}
  if(record.name==='AdDirectionPublicError'&&typeof record.message==='string')return record.message
  const cause=record.cause&&typeof record.cause==='object'?record.cause as typeof record:{}
  const signal=`${String(record.name??'')} ${String(record.message??'')} ${String(record.responseBody??'')} ${String(cause.name??'')} ${String(cause.message??'')} ${String(cause.responseBody??'')}`
  const status=record.statusCode??cause.statusCode
  if(status===402||/insufficient credits|credit balance|payment required/i.test(signal))return 'The project model credits are unavailable. Your context is saved; restore credits before retrying ideas.'
  if(status===401||status===403||/key.*needed|key.*required|unauthorized|configured/i.test(signal))return 'Ad research could not authenticate with the model provider. Your collected context is saved.'
  if(status===429||/rate.limit|overloaded/i.test(signal))return 'The idea model is temporarily busy. Your context is saved; try again shortly.'
  if(/timeout|timed out|AbortError/i.test(signal))return 'Ad ideas took too long. Your context is saved. Try again to recover or retry this request.'
  if(/compiled grammar|schema.*large/i.test(signal))return 'The model rejected the ad-planning format. Your context is saved; try ideas again.'
  if(/model.*not found|no endpoints|model.*unavailable/i.test(signal))return 'The selected idea model is currently unavailable. Your context is saved; try again shortly.'
  if(/cited evidence|not found|found attribution|selected-product evidence/i.test(signal))return 'Some suggested directions could not be verified against the saved research. Try again or steer with the agent.'
  if(record.finishReason==='length'||/NoObjectGenerated/.test(signal)&&typeof record.text==='string'&&record.text.trim().startsWith('{')&&!record.text.trim().endsWith('}'))return 'The model response ended before the ideas were complete. Your context is saved; try again.'
  if(/NoObjectGenerated|response.*schema|unusable|validation|Zod|invalid_type|too_big/i.test(signal))return 'Ad ideas did not match the expected format. Your context is saved; try ideas again.'
  if(/selected product.*missing/i.test(signal))return 'The selected products changed. Review your context, then try directions again.'
  if(/fetch failed|failed to fetch|network|econn|socket|aborted/i.test(signal))return 'The idea request lost its connection. Your context is saved; try again to recover the request.'
  if(status===400||/APICallError|provider returned error/i.test(signal))return 'The model provider rejected the idea request. Your context is saved; try again.'
  return fallback
}
export function unwrapAdDirections(outcome:{ok:true;value:AdDirectionResult}|{ok:false;error:string}):AdDirectionResult{
  if(outcome.ok)return outcome.value
  const error=new Error(outcome.error);error.name='AdDirectionPublicError';throw error
}

/** Append-only: generated ideas keep their stable IDs, order and numbering. */
export function continueDirections(previous:AdDirectionResult|undefined,fresh:AdDirectionResult):AdDirectionResult{
  const ids=new Set(previous?.directions.map(idea=>idea.id)??[])
  return {...fresh,directions:[...(previous?.directions??[]),...fresh.directions.filter(idea=>{if(ids.has(idea.id))return false;ids.add(idea.id);return true})]}
}
export type AdIdeaCollection={signature:string;result:AdDirectionResult;revealed:number;focusIndex?:number;error?:string;pending?:{id:string;count:2|3;refresh:boolean}}
export function revealIdeas(collection:AdIdeaCollection):AdIdeaCollection{
  return {...collection,revealed:Math.min(collection.result.directions.length,collection.revealed+1),focusIndex:collection.revealed}
}
export function appendIdeas(collection:AdIdeaCollection,fresh:AdDirectionResult):AdIdeaCollection{
  const result=continueDirections(collection.result,fresh)
  return {...collection,result,revealed:Math.max(collection.revealed,result.directions.length-1,Math.min(2,result.directions.length)),pending:undefined,error:undefined}
}

/** A dropped development/network response must not leave skeletons running forever. */
export async function withIdeaDeadline<T>(request:Promise<T>,milliseconds=210000):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined
  try{return await Promise.race([request,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Ad ideas request timed out.')),milliseconds)})])}finally{clearTimeout(timer)}
}
