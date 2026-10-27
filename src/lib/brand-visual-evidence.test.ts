import assert from 'node:assert/strict'
import test from 'node:test'
import { brandCopyAvailable, brandUnderstandingInstructions, normalizeBrandAnalysis } from './brand-understanding.server.ts'
import { MAX_BRAND_EVIDENCE_IMAGES, rankHomepageImageCandidates, scoreBrandResearchLink } from './brand-visual-evidence.server.ts'

test('homepage evidence ranking prefers prominent large artwork and excludes noisy assets', () => {
  const ranked = rankHomepageImageCandidates([
    { value: 'https://store.test/product.jpg?width=1200', source: 'homepage-markdown', alt: 'Product', width: 1200, height: 900, position: 0 },
    { value: 'https://store.test/logo.svg', source: 'homepage-html', alt: 'Logo', width: 1800, height: 500, position: 1 },
    { value: 'https://store.test/hero.jpg?width=1600', source: 'homepage-html', alt: 'Campaign', context: 'main hero banner', width: 1600, height: 900, position: 4 },
    { value: 'https://store.test/icon.png', source: 'homepage-html', alt: 'Menu icon', width: 32, height: 32, position: 2 },
  ])
  assert.equal(ranked[0]?.value, 'https://store.test/hero.jpg?width=1600')
  assert.ok(ranked.findIndex(item => item.value.includes('icon')) > 0)
  assert.ok(ranked.findIndex(item => item.value.includes('logo')) > 0)
})

test('visual evidence is bounded and prompt requests reusable brand language', () => {
  assert.equal(MAX_BRAND_EVIDENCE_IMAGES, 5)
  for (const phrase of ['homepage screenshot', 'palette', 'typographic character', 'layout/composition', 'imagery/art direction', 'graphic treatment', 'not a caption', 'literal pictured products', 'brandContext', 'brand-only Instagram ad']) assert.match(brandUnderstandingInstructions, new RegExp(phrase.replace('/', '\\/'), 'i'))
})

test('research link scoring only accepts dedicated brand-story links', () => {
  assert.equal(scoreBrandResearchLink('Learn more about Chromaglow Pro', 'https://store.test/en-us/chromaglow-pro'), 0)
  assert.ok(scoreBrandResearchLink('Our Story', 'https://store.test/pages/our-story') > 0)
})

test('text-only brand context remains eligible without visual pixels', () => {
  assert.equal(brandCopyAvailable({ sourceText: '', sourceDescription: '', research: [], headings: [] }), false)
  assert.equal(brandCopyAvailable({ sourceText: 'Built for repeat-season projects.', research: [] }), true)
  assert.equal(brandCopyAvailable({ sourceText: '', research: [{ text: 'Our mission is practical and welcoming.' }] }), true)
  assert.match(brandUnderstandingInstructions, /no pixel parts[\s\S]*visualStyle must be an empty string/i)
  const analysis = normalizeBrandAnalysis({ introduction: 'Grounded introduction.', visualStyle: 'Should not survive.', brandContext: 'Reusable positioning and voice.', uncertainty: [] }, { hasPixels: false, evidenceHash: 'copy-only', model: 'test', visualReferences: [], researchSources: [] })
  assert.equal(analysis.status, 'unavailable')
  assert.equal(analysis.visualStyle, '')
  assert.equal(analysis.brandContext, 'Reusable positioning and voice.')
  assert.equal(analysis.researchStatus, 'complete')
  assert.match(analysis.reason ?? '', /visual pixels/i)
})
