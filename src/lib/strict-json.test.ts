import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateText, Output } from 'ai'
import { strictJsonProvider, creativePlanSettings } from './strict-json.server.ts'
import { creativeWireSchema, preparationFailureDetails, preparationFailureMessage } from './creative-wire.ts'
import { creativeModel, creativeSchema, emptyCreative } from './creative.ts'

const layer={x:12,y:12,width:76,height:30,size:84,color:'#FFFFFF',visible:true,autoFit:true,maxLines:2,align:'left'}
const valid={brief:{audience:'Homeowners',message:'Make your home bright',offer:'',hook:'Your kind of bright',headline:'Make it bright',body:'Light your space.',visual:'Warm lights with quiet sky.'},composition:'Keep a quiet sky for copy.',layers:{headline:layer,body:{...layer,y:50},logo:{...layer,y:80,height:8}},copyOptions:Array.from({length:4},(_,index)=>({id:`option-${index}`,label:`Option ${index+1}`,headline:'Make it bright',body:'Light your space.'})),imageAnalysis:{summary:'A quiet area above the lights.',opportunities:[],protectedAreas:[]}}
function response(content:string,finishReason='stop') {
  return new Response(JSON.stringify({id:'response-test',object:'chat.completion',created:1,model:creativeModel,choices:[{index:0,message:{role:'assistant',content},finish_reason:finishReason}],usage:{prompt_tokens:20,completion_tokens:30,total_tokens:50}}),{headers:{'Content-Type':'application/json'}})
}
function request(transport:typeof fetch, schema=true) {
  const provider=strictJsonProvider('test-key',transport)
  return generateText({model:provider.chat(creativeModel),prompt:'Prepare the supplied context.',maxRetries:0,maxOutputTokens:creativePlanSettings.maxOutputTokens,providerOptions:creativePlanSettings.providerOptions,...(schema?{output:Output.object({name:'creative_plan',schema:creativeWireSchema})}:{})})
}
test('planner sends strict schema and requires provider parameter support',async()=>{
  let calls=0
  const result=await request(async(_url,init)=>{
    calls++
    const body=JSON.parse(String(init?.body))
    assert.equal(body.model,creativeModel)
    assert.equal(body.max_tokens,16384)
    assert.equal(body.provider.require_parameters,true)
    assert.equal(body.response_format.type,'json_schema')
    assert.equal(body.response_format.json_schema.strict,true)
    function strictObjects(schema:any){
      if(!schema||typeof schema!=='object')return
      if(schema.type==='object'){assert.equal(schema.additionalProperties,false);assert.deepEqual(new Set(schema.required),new Set(Object.keys(schema.properties)))}
      for(const value of Object.values(schema))if(Array.isArray(value))value.forEach(strictObjects);else strictObjects(value)
    }
    strictObjects(body.response_format.json_schema.schema)
    return response(JSON.stringify(valid))
  })
  assert.equal(calls,1)
  assert.equal(result.output.copyOptions.length,4)
  assert.doesNotThrow(()=>creativeSchema.parse({...emptyCreative(),...result.output,imageAnalysis:{...result.output.imageAnalysis,kind:'source'}}))
})
test('truncated JSON fails once with retained output/finish reason, never repaired into fake data',async()=>{
  let calls=0
  await assert.rejects(request(async()=>{calls++;return response('{"brief":','length')}),error=>{
    const details=preparationFailureDetails(error)
    assert.equal(details.finishReason,'length')
    assert.equal(details.text,'{"brief":')
    assert.match(preparationFailureMessage(error),/cut off/)
    assert.match(preparationFailureMessage(error),/No image was requested/)
    return true
  })
  assert.equal(calls,1)
})
test('wrong-schema output is rejected and missing schema never reaches provider',async()=>{
  await assert.rejects(request(async()=>response('{"unrelated":true}')))
  let calls=0
  await assert.rejects(request(async()=>{calls++;return response(JSON.stringify(valid))},false),/strict JSON schema/)
  assert.equal(calls,0)
})
test('richer local validation still rejects wire-valid out-of-bounds copy',()=>{
  const wire=creativeWireSchema.parse({...valid,copyOptions:valid.copyOptions.map(option=>({...option,headline:'x'.repeat(181)}))})
  assert.throws(()=>creativeSchema.parse({...emptyCreative(),...wire,imageAnalysis:{...wire.imageAnalysis,kind:'source'}}))
})

test('private planning diagnostics omit request headers and credentials',()=>{
  const details=preparationFailureDetails({name:'AI_NoObjectGeneratedError',text:'{"brief":',request:{headers:{Authorization:'secret-test-key'}},response:{id:'response-id',headers:{Authorization:'secret-test-key'}}})
  assert.equal(details.responseId,'response-id')
  assert.ok(!JSON.stringify(details).includes('secret-test-key'))
})
