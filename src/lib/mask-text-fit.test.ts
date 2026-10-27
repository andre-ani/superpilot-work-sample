import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fitText } from './text-fit.ts'
import { foregroundGeometry, lineSpan } from './foreground-geometry.ts'

// Exercise Pretext's real segmentation/cursor API with deterministic canvas metrics.
class TestCanvas {
  getContext() {
    return { font:'10px Test', measureText(text:string) { const size=Number(/([\d.]+)px/.exec(this.font)?.[1]??10); return {width:text.length*size*0.6,actualBoundingBoxAscent:size*0.8,actualBoundingBoxDescent:size*0.2} } }
  }
}

test('actual Pretext line stepping fits above a padded mask without shrinking below the ad floor', () => {
  const previous=globalThis.OffscreenCanvas
  globalThis.OffscreenCanvas=TestCanvas as unknown as typeof OffscreenCanvas
  try {
    const geometry=foregroundGeometry(new Uint8Array(256*256),256,256,[{x:33,y:20,width:36,height:68}],3)
    const box={x:86.4,y:86.4,width:907.2,height:118.8}
    const result=fitText('APPLE POP','Test',box,{minSize:84,maxSize:240,maxLines:2,spanAtLine:(top,height)=>lineSpan(geometry,{x:0,y:0,width:1080,height:1080},box,top,height)})
    assert.equal(result.fits,true)
    assert.ok(result.size>=84)
    assert.equal(result.lines.map(line=>line.text).join(' '),'APPLE POP')
    assert.ok(result.lines.every(line=>line.width<=(line.availableWidth??box.width)))
  } finally { globalThis.OffscreenCanvas=previous }
})
