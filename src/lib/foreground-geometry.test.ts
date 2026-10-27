import { test } from 'node:test'
import assert from 'node:assert/strict'
import { foregroundGeometry, lineSpan } from './foreground-geometry.ts'

test('foreground holes are excluded and clearance is padded without changing the source mask', () => {
  const raw=new Uint8Array(400)
  for(let y=6;y<=13;y++)for(let x=6;x<=13;x++)raw[y*20+x]=255
  raw[9*20+9]=0
  const mask=foregroundGeometry(raw,20,20,[],5)
  assert.equal(mask.hard[9*20+9],1)
  assert.equal(mask.hard[5*20+9],1)
  assert.equal(raw[9*20+9],0)
  assert.equal(mask.hard[0],0)
})
test('per-line spans avoid the padded subject and union vision-protected scenery', () => {
  const raw=new Uint8Array(10000)
  const geometry=foregroundGeometry(raw,100,100,[{x:40,y:30,width:30,height:60}],3)
  const top=lineSpan(geometry,{x:0,y:0,width:100,height:100},{x:8,y:8,width:84,height:84},0,10)!
  assert.ok(top.width>80)
  const middle=lineSpan(geometry,{x:0,y:0,width:100,height:100},{x:8,y:8,width:84,height:84},30,10)!
  assert.ok(middle.x+middle.width<=29 || middle.x>=65)
})
