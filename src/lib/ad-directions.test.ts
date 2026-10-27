import {test} from 'node:test'
import assert from 'node:assert/strict'
import {unwrapAdDirections,withIdeaDeadline,appendIdeas,revealIdeas,continueDirections,adDirectionError,validateDirections,testimonialSources,type DirectionSource} from './ad-directions.ts'
const sources:DirectionSource[]=[{id:'brand',title:'Storefront',url:'https://example.com',kind:'brand',text:'Made for everyday outdoor gatherings.'}]
const direction={id:'story',category:'brand_story' as const,title:'Outdoor gatherings',angle:'Lead with everyday outdoor gatherings.',visual:'A welcoming outdoor scene.',headline:'Gather outside',rationale:'Uses the stated brand purpose.',evidence:[{sourceId:'brand',quote:'everyday outdoor gatherings'}]}
test('only found evidence can support a proposed ad direction',()=>{
  const valid=validateDirections([direction],sources)
  assert.equal(valid[0].evidence[0].url,'https://example.com')
  assert.throws(()=>validateDirections([{...direction,evidence:[{sourceId:'brand',quote:'Rated number one by everyone'}]}],sources),/not found/)
})
test('brand-only research cannot invent testimonials or product benefits',()=>{
  assert.throws(()=>validateDirections([{...direction,category:'testimonial'}],sources),/found attribution/)
  assert.throws(()=>validateDirections([{...direction,category:'product_benefit'}],sources),/selected-product/)
  assert.equal(testimonialSources([{...sources[0],text:'“A warm place to spend the evening” — Jane'}]).length,0)
  const found=testimonialSources([{...sources[0],text:'Customer review: “A warm place to spend the evening” — Jane Smith'}])
  assert.equal(found[0].attribution,'Jane Smith')
})

test('failure copy explains verification problems without exposing raw provider data',()=>{
  assert.match(adDirectionError(new Error('An ad direction cited evidence that was not found.'),'fallback'),/verified/)
  assert.equal(adDirectionError(new Error('internal token=private'),'Safe retry message'),'Safe retry message')
})

test('fresh ideas retain the already revealed reserve and replenish one spare',()=>{
  const idea=validateDirections([direction],sources)[0]
  const result={contextKey:'current',directions:[{...idea,id:'spare'}],summary:'',cached:false}
  const fresh={...result,directions:[{...idea,id:'next'},{...idea,id:'reserve'}]}
  const combined=continueDirections(result,fresh)
  assert.deepEqual(combined.directions.map(item=>item.id),['spare','next','reserve'])
  assert.deepEqual(result.directions.map(item=>item.id),['spare'])
  assert.deepEqual(continueDirections(undefined,fresh),fresh)
})

test('More retains every previous idea and keeps numbering stable through repeated batches',()=>{
  const idea=validateDirections([direction],sources)[0]
  const result={contextKey:'context',directions:['one','two','three'].map(id=>({...idea,id})),summary:'',cached:false}
  const original={signature:'context',result,revealed:2}
  const revealed=revealIdeas(original)
  assert.equal(revealed.focusIndex,2)
  assert.equal(revealed.revealed,3)
  assert.deepEqual(revealed.result,result)
  const fresh={...result,directions:['four','five'].map(id=>({...idea,id}))}
  const completed=appendIdeas({...revealed,pending:{id:'request-1',count:2,refresh:true}},fresh)
  assert.deepEqual(completed.result.directions.map(idea=>idea.id),['one','two','three','four','five'])
  assert.equal(completed.revealed,4)
  assert.equal(completed.pending,undefined)
  assert.deepEqual(appendIdeas(completed,fresh).result,completed.result)
  assert.deepEqual(original.result.directions.map(idea=>idea.id),['one','two','three'])
})

test('a dropped idea response settles as retryable error instead of endless loading',async()=>{
  await assert.rejects(withIdeaDeadline(new Promise(()=>{}),1),/timed out/)
  assert.equal(await withIdeaDeadline(Promise.resolve('saved result'),100),'saved result')
  assert.match(adDirectionError(new Error('Ad ideas request timed out.'),'fallback'),/context is saved/)
})

test('provider response details classify safely before crossing the server boundary',()=>{
  const grammar={name:'AI_APICallError',message:'Provider returned error',statusCode:400,responseBody:JSON.stringify({error:{message:'Provider returned error',metadata:{raw:'The compiled grammar is too large'}}})}
  const publicMessage=adDirectionError(grammar,'Generic workspace fallback')
  assert.match(publicMessage,/rejected the ad-planning format/)
  assert.throws(()=>unwrapAdDirections({ok:false,error:publicMessage}),error=>adDirectionError(error,'Generic workspace fallback')===publicMessage)
  assert.match(adDirectionError({statusCode:402,message:'private upstream token=secret'},'fallback'),/credits/)
  assert.match(adDirectionError({statusCode:429,message:'private upstream token=secret'},'fallback'),/temporarily busy/)
  assert.equal(adDirectionError({message:'private upstream token=secret'},'Safe fallback'),'Safe fallback')
})
test('successful direction response envelope returns the actual saved result unchanged',()=>{
  const result={contextKey:'saved',directions:[],summary:'Actual saved response',cached:true}
  assert.equal(unwrapAdDirections({ok:true,value:result}),result)
})

test('cut-off structured output is explained separately from complete but invalid data',()=>{
  const message=adDirectionError({name:'AI_NoObjectGeneratedError',text:'{"summary":"Supported ideas","directions":[{"subheading":"Your home.'},'fallback')
  assert.match(message,/ended before the ideas were complete/)
  assert.match(adDirectionError({name:'AI_NoObjectGeneratedError',finishReason:'length'},'fallback'),/ended before/)
  assert.match(adDirectionError({name:'AI_NoObjectGeneratedError',text:'{"directions":[]}'},'fallback'),/expected format/)
})
