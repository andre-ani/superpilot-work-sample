import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, mkdtemp } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { localLogoName, rasterLogo } from './studio.ts'

const source = path.resolve('src/lib/brand-assets.server.ts')
await mkdir(path.resolve('.work'), { recursive: true })
const temporary = await mkdtemp(path.resolve('.work/logo-test-'))
process.chdir(temporary)
const { saveBrandLogo, readBrandLogo } = await import(pathToFileURL(source).href) as typeof import('./brand-assets.server.ts')

test('uploaded logos retain their exact bytes and resolve as generation references', async () => {
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6S9sAAAAASUVORK5CYII='
  const url = await saveBrandLogo(png)
  assert.equal(await saveBrandLogo(png), url)
  const name = localLogoName(url)
  assert.ok(name)
  assert.equal(rasterLogo(url), true)
  const saved = await readBrandLogo(name)
  assert.equal(saved.type, 'image/png')
  assert.deepEqual(saved.bytes, Buffer.from(png, 'base64'))
})

test('logo uploads reject executable content, oversize input and path traversal', async () => {
  await assert.rejects(saveBrandLogo(Buffer.from('<svg onload="alert(1)"></svg>').toString('base64')), /PNG, JPG or WebP/)
  await assert.rejects(saveBrandLogo('a'.repeat(5_600_001)), /under 4 MB/)
  await assert.rejects(readBrandLogo('../.env'), /Invalid logo/)
  assert.equal(localLogoName('/api/brand-assets/../../.env'), null)
  assert.equal(rasterLogo('/api/brand-assets/../../.env'), false)
})
