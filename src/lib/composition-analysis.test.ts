import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeQuietRegion,applyCompositionAnalysis,overlapFraction } from './composition-analysis.ts'
import { emptyCreative } from './creative.ts'

test('natural clear-region placement avoids protected subjects rather than forcing a template', () => {
  const state = applyCompositionAnalysis(emptyCreative(), { summary:'Quiet dark lawn at lower left; roof lights are protected.', protectedAreas:[{x:30,y:20,width:65,height:50,label:'House and lights'}], opportunities:[{role:'headline',x:5,y:78,width:75,height:10,color:'#FFFFFF',confidence:0.9,reason:'Low-detail dark lawn below the lights'}] })
  assert.equal(state.layers.headline.y,78)
  assert.equal(state.layers.headline.visible,true)
  assert.equal(state.layers.body.visible,false)
  assert.equal(state.imageAnalysis?.kind,'generated')
})
test('subject overlap and out-of-frame boxes cannot become automatic text placements', () => {
  const protectedAreas=[{x:20,y:20,width:60,height:60,label:'Product'}]
  const unsafe={role:'headline' as const,x:10,y:10,width:80,height:80,color:'#000000',confidence:0.95,reason:'Not safe'}
  assert.throws(()=>applyCompositionAnalysis(emptyCreative(),{summary:'Busy image',protectedAreas,opportunities:[unsafe]}),/No confident text area/)
  assert.throws(()=>applyCompositionAnalysis(emptyCreative(),{summary:'Invalid box',protectedAreas:[],opportunities:[{...unsafe,x:90,width:30}]}),/No confident text area/)
})

test('copy boxes cannot overlap each other in a shared quiet area', () => {
  const box={x:5,y:5,width:90,height:20,color:'#000000',confidence:0.9,reason:'Clear sky'}
  const state=applyCompositionAnalysis(emptyCreative(),{summary:'One clear area',protectedAreas:[],opportunities:[{...box,role:'headline'},{...box,role:'body'}]})
  assert.equal(state.layers.headline.visible,true)
  assert.equal(state.layers.body.visible,false)
})

test('future placement keeps twelve percent edge inset and five percent subject breathing room',()=>{
  const base={role:'headline' as const,x:15,y:20,width:60,height:14,color:'#000000',confidence:0.9,reason:'Visible quiet sky'}
  const areas=[{x:50,y:40,width:20,height:30,label:'Product'}]
  const next=applyCompositionAnalysis(emptyCreative(),{summary:'Quiet sky above the product',protectedAreas:areas,opportunities:[base]})
  assert.equal(next.imageAnalysis?.safeInset,12)
  assert.equal(next.imageAnalysis?.subjectPadding,5)
  assert.throws(()=>applyCompositionAnalysis(emptyCreative(),{summary:'Too close to product',protectedAreas:areas,opportunities:[{...base,x:50,y:35,width:10,height:10}]}),/No confident text area/)
})

test('an otherwise useful sky region is clipped around a protected edge instead of discarded',()=>{
  const original={x:12,y:12,width:50,height:36}
  const protectedArea={x:52,y:0,width:48,height:60}
  const trimmed=safeQuietRegion(original,[protectedArea])!
  assert.deepEqual(trimmed,{x:12,y:12,width:40,height:36})
  assert.ok(trimmed.x>=original.x&&trimmed.y>=original.y&&trimmed.x+trimmed.width<=original.x+original.width&&trimmed.y+trimmed.height<=original.y+original.height)
})

test('logo gets a disjoint portion of verified quiet sky instead of a default edge position',()=>{
  const source={summary:'Quiet upper right sky; the lower image is busy.',opportunities:[
    {role:'headline' as const,x:38,y:12,width:50,height:13,color:'#FFFFFF',confidence:.8,reason:'Quiet sky'},
    {role:'body' as const,x:48,y:28,width:40,height:9,color:'#FFFFFF',confidence:.7,reason:'Quiet sky'},
  ],protectedAreas:[{x:0,y:8,width:33,height:24,label:'Upper tree'},{x:0,y:30,width:43,height:51,label:'Lower tree'},{x:29,y:43,width:66,height:35,label:'House'},{x:12,y:75,width:32,height:23,label:'Bulbs'}]}
  const result=applyCompositionAnalysis(emptyCreative(),source)
  const logo=result.layers.logo,body=result.layers.body,headline=result.layers.headline
  assert.equal(logo.visible,true)
  assert.ok(logo.x>=12&&logo.y>=12&&logo.x+logo.width<=88&&logo.y+logo.height!<=88)
  assert.equal(overlapFraction({...logo,height:logo.height!},{...body,height:body.height!}),0)
  assert.equal(overlapFraction({...logo,height:logo.height!},{...headline,height:headline.height!}),0)
  assert.ok(source.opportunities.some(box=>logo.x>=box.x&&logo.y>=box.y&&logo.x+logo.width<=box.x+box.width&&logo.y+logo.height!<=box.y+box.height))
})
test('a logo is left unavailable when observed quiet regions cannot safely accommodate it',()=>{
  const result=applyCompositionAnalysis(emptyCreative(),{summary:'Only a narrow headline region is clear.',protectedAreas:[],opportunities:[{role:'headline',x:45,y:12,width:40,height:10,color:'#FFFFFF',confidence:.9,reason:'Narrow clear sky'}]})
  assert.equal(result.layers.logo.visible,false)
})
