import { test } from 'node:test'
import assert from 'node:assert/strict'
import { brandPatchSchema, MIN_PALETTE_COLORS, MAX_PALETTE_COLORS } from './brand-actions.ts'
import { brandDraftFromSummary, markBrandEdits, mergeBrandEnrichment } from './brand-draft.ts'
import type { BrandSummary } from './brand.ts'
const summary: BrandSummary = {name:'Brand',description:'Facts',sourceUrl:'https://shop.com',extractedAt:'now',logoUrl:null,logoCandidates:[],colors:['#123456'],fonts:{heading:null,body:null},headings:[],warnings:[],provenance:[]}
test('primary and secondary palettes validate independently with the same bounds',()=>{
  assert.equal(MIN_PALETTE_COLORS,1);assert.equal(MAX_PALETTE_COLORS,8)
  assert.deepEqual(brandPatchSchema.parse({colors:['#123456'],secondaryColors:['#ABCDEF']}),{colors:['#123456'],secondaryColors:['#ABCDEF']})
  assert.throws(()=>brandPatchSchema.parse({secondaryColors:Array(9).fill('#123456')}))
  assert.throws(()=>brandPatchSchema.parse({secondaryColors:['not a color']}))
  assert.deepEqual(brandPatchSchema.parse({secondaryColors:[]}).secondaryColors,[])
})
test('palette edits and explicit secondary clears survive serialization and enrichment',()=>{
  const original=brandDraftFromSummary({...summary,colors:Array(8).fill('#123456'),secondaryColors:['#ABCDEF']})
  assert.equal(original.colors.length,8)
  const cleared={...original,secondaryColors:[]}
  const markers=JSON.parse(JSON.stringify(markBrandEdits(original,cleared,{},'secondaryColors')))
  const result=mergeBrandEnrichment(cleared,summary,{...summary,secondaryColors:['#FFFFFF']},markers)
  assert.deepEqual(result.secondaryColors,[])
  assert.deepEqual(brandDraftFromSummary(summary).secondaryColors,[])
})
