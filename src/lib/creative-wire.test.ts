import{test}from'node:test'
import assert from'node:assert/strict'
import{z}from'zod'
import{creativeWireSchema,preparationFailureMessage}from'./creative-wire.ts'

test('provider wire grammar has required-only fields and no UI union/max-length expansion',()=>{
  const schema=z.toJSONSchema(creativeWireSchema)
  function check(value:any){if(!value||typeof value!=='object')return;if(value.type==='object')assert.deepEqual(new Set(value.required),new Set(Object.keys(value.properties)));for(const child of Object.values(value))if(Array.isArray(child))child.forEach(check);else check(child)}
  check(schema)
  const text=JSON.stringify(schema);assert.ok(!text.includes('anyOf'));assert.ok(!text.includes('oneOf'));assert.ok(!text.includes('maxLength'))
})
test('preparation failure is explained before image spend and no raw provider text leaks',()=>{
  const text=preparationFailureMessage({message:'Provider returned error',responseBody:'The compiled grammar is too large token=secret'})
  assert.match(text,/before image creation/)
  assert.ok(!text.includes('secret'))
  assert.match(preparationFailureMessage({statusCode:429}),/temporarily busy/)
})
