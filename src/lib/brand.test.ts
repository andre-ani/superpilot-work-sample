import assert from 'node:assert/strict'
import test from 'node:test'
import { brandAssetUrl, brandStylesheetUrls, parseBrandHtml } from './brand-parse.server.ts'
import { normalizeFirecrawlBrand } from './brand-firecrawl.server.ts'

test('extracts source-backed identity without turning product/promotion data into brand facts', () => {
  const html = `<head><title>Fallback title</title><meta property="og:site_name" content="Actual &amp; Brand"><meta name="description" content="Actual description">
    <script type="application/ld+json">{"@type":"Organization","logo":"/brand.svg"}</script>
    <style>:root{--color-primary:#abc;--color-background:255, 255, 255;--font-heading-family:'Brand Serif',serif;--font-body-family:'Brand Sans',sans-serif;--spacing:24px}</style></head>
    <body><header><img src="/payment-logo.svg" alt="Visa logo"><img src="/header.svg" alt="Actual logo"></header>
    <main><h1>Our useful headline</h1><div hidden><h2>Hidden offer</h2></div></main><script>window.offer='invented'</script></body>`
  const summary = parseBrandHtml(html, 'https://store.com')
  assert.equal(summary.name, 'Actual & Brand')
  assert.equal(summary.logoUrl, 'https://store.com/brand.svg')
  assert.deepEqual(summary.colors, ['#AABBCC', '#FFFFFF'])
  assert.deepEqual(summary.fonts, { heading: 'Brand Serif', body: 'Brand Sans' })
  assert.deepEqual(summary.headings, ['Our useful headline'])
  assert.ok(summary.logoCandidates.every(x => !x.includes('payment')))
  assert.ok(summary.warnings.some(x => x.includes('static source')))
})

test('missing values stay unknown and unsafe asset URLs are rejected', () => {
  const summary = parseBrandHtml('<main>Hello</main>', 'https://store.com')
  assert.equal(summary.logoUrl, null)
  assert.deepEqual(summary.colors, [])
  assert.deepEqual(summary.fonts, { heading: null, body: null })
  for (const value of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'https://user:pass@store.com/logo.png', 'https://localhost/logo.png', 'https://unrelated.com/logo.png']) assert.equal(brandAssetUrl(value, 'https://store.com'), null)
  assert.equal(brandAssetUrl('//cdn.shopify.com/a.svg', 'https://store.com'), 'https://cdn.shopify.com/a.svg')
})

test('stylesheet discovery is bounded and prefers store styles', () => {
  const html = `<link rel="stylesheet" href="/first.css"><link rel="stylesheet" href="https://unrelated.com/track.css"><link rel="stylesheet" href="/theme.css"><link rel="stylesheet" href="/base.css">`
  assert.deepEqual(brandStylesheetUrls(html, 'https://store.com'), ['https://store.com/theme.css', 'https://store.com/base.css'])
})

test('font roles use family rules, not weight or size variables', () => {
  const summary = parseBrandHtml(`<style>:root{--font-heading-weight:700;--font-body-size:18px;--copy-face:'Brand Sans'}body{font-family:var(--copy-face)}h1,h2{font-family:'Brand Serif',serif}</style>`, 'https://store.com')
  assert.deepEqual(summary.fonts, { heading: 'Brand Serif', body: 'Brand Sans' })
})

test('provider page failures are rejected and favicon is not presented as an approved logo', () => {
  assert.throws(() => normalizeFirecrawlBrand({ success: true, data: { branding: { colors: {} }, metadata: { statusCode: 403 } } }, 'https://store.com'))
  assert.throws(() => normalizeFirecrawlBrand({ success: true, data: { branding: { colors: {} }, metadata: {} } }, 'https://store.com'))
  const summary = normalizeFirecrawlBrand({ success: true, data: { metadata: { statusCode: 200, url: 'https://store.com', title: 'Store' }, branding: { logo: 'https://store.com/favicon.png', colors: { primary: '#abcdef', bad: 'red' } } } }, 'https://store.com')
  assert.equal(summary.logoUrl, null)
  assert.deepEqual(summary.logoCandidates, ['https://store.com/favicon.png'])
  assert.deepEqual(summary.colors, ['#ABCDEF'])
  assert.ok(summary.warnings.some(w => w.includes('small site icon')))
})

test('basics omit inline theme defaults so fast rendering never suggests unverified styles', () => {
  const summary = parseBrandHtml('<meta property="og:site_name" content="Brand"><meta name="theme-color" content="#123456"><style>:root{--color-primary:#abcdef;--font-heading-family:Helvetica}</style>', 'https://store.com', [], false)
  assert.equal(summary.name, 'Brand')
  assert.deepEqual(summary.colors, [])
  assert.deepEqual(summary.fonts, { heading: null, body: null })
  assert.ok(summary.provenance.every(line => !line.includes('font candidate') && !line.startsWith('Color')))
})
