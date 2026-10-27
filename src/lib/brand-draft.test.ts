import assert from 'node:assert/strict'
import test from 'node:test'
import type { BrandSummary } from './brand.ts'
import { brandDraftFromSummary, inferBrandEdits, markBrandEdits, mergeBrandEnrichment } from './brand-draft.ts'

const basic: BrandSummary = { sourceUrl: 'https://store.com', extractedAt: '2026-10-27T02:17:00Z', name: 'Store', description: 'Original', logoUrl: 'https://store.com/logo.png', logoCandidates: [], colors: [], fonts: { heading: null, body: null }, headings: [], warnings: [], provenance: [] }
const full: BrandSummary = { ...basic, name: 'Store official', description: 'Enriched', logoUrl: 'https://store.com/better-logo.png', colors: ['#112233'], fonts: { heading: 'Heading', body: 'Body' } }

test('background enrichment fills untouched fields without mutating the generation draft', () => {
  const draft = brandDraftFromSummary(basic)
  const frozenInput = structuredClone(draft)
  const merged = mergeBrandEnrichment(draft, basic, full)
  assert.equal(merged.description, 'Enriched')
  assert.deepEqual(merged.colors, ['#112233'])
  assert.equal(merged.headingFont, 'Heading')
  assert.deepEqual(draft, frozenInput)
  merged.colors.push('#FFFFFF')
  assert.deepEqual(full.colors, ['#112233'])
})

test('edited, cleared, and reverted fields remain protected after marker serialization', () => {
  const original = brandDraftFromSummary(basic)
  const changed = { ...original, name: 'My store', logoUrl: '/api/brand-assets/' + 'a'.repeat(64) + '.png', direction: 'My intent' }
  let edited = markBrandEdits(original, changed)
  const reverted = { ...changed, name: original.name, colors: [] }
  edited = markBrandEdits(changed, reverted, edited, 'colors')
  const merged = mergeBrandEnrichment(reverted, basic, full, JSON.parse(JSON.stringify(edited)))
  assert.equal(merged.name, 'Store')
  assert.equal(merged.logoUrl, changed.logoUrl)
  assert.deepEqual(merged.colors, [])
  assert.equal(merged.direction, 'My intent')
  assert.equal(merged.bodyFont, 'Body')
})

test('begin-edit lock protects input before a value has been committed', () => {
  const draft = brandDraftFromSummary(basic)
  const edited = markBrandEdits(draft, draft, {}, 'description')
  assert.equal(mergeBrandEnrichment(draft, basic, full, edited).description, 'Original')
})

test('legacy draft differences and known values survive missing or partial enrichment', () => {
  const draft = { ...brandDraftFromSummary(basic), description: 'Already edited', headingFont: 'Manual font' }
  assert.deepEqual(inferBrandEdits(basic, draft), { description: true, headingFont: true })
  const merged = mergeBrandEnrichment(draft, basic, { ...full, logoUrl: null, name: '' })
  assert.equal(merged.description, 'Already edited')
  assert.equal(merged.headingFont, 'Manual font')
  assert.equal(merged.logoUrl, basic.logoUrl)
  assert.equal(merged.name, 'Store')
})

test('legacy optional visual fields are not mistaken for edits, while explicit clears survive', () => {
  const legacy=brandDraftFromSummary(basic)
  delete legacy.visualStyle
  delete legacy.visualReferences
  assert.deepEqual(inferBrandEdits(basic,legacy),{})
  const incoming={...full,visualStyle:'Photographic with illustrated packaging',visualReferences:['/api/brand-assets/'+ 'a'.repeat(64)+'.png']}
  const merged=mergeBrandEnrichment(legacy,basic,incoming)
  assert.equal(merged.visualStyle,incoming.visualStyle)
  assert.deepEqual(merged.visualReferences,incoming.visualReferences)
  const cleared={...legacy,visualStyle:'',visualReferences:[]}
  const protectedDraft=mergeBrandEnrichment(cleared,basic,incoming,{visualStyle:true,visualReferences:true})
  assert.equal(protectedDraft.visualStyle,'')
  assert.deepEqual(protectedDraft.visualReferences,[])
})

test('successive automatic enrichment stages update untouched fields, while explicit edits remain locked', () => {
  const first=mergeBrandEnrichment(brandDraftFromSummary(basic),basic,full,{})
  const polished={...full,description:'A polished brand introduction.'}
  assert.equal(mergeBrandEnrichment(first,basic,polished,{}).description,polished.description)
  assert.equal(mergeBrandEnrichment(first,basic,polished,{description:true}).description,first.description)
})
