import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// Return image bytes from the existing DNS-pinned public transport so canvas export
// doesn't depend on a merchant's CORS headers. SVGs remain image-only resources.
export const compositionLogo = createServerFn({ method: 'GET' }).validator(z.string().max(2048)).handler(async ({ data }) => {
  const { localLogoName } = await import('./studio')
  const local = localLogoName(data)
  if (local) {
    const { readBrandLogo } = await import('./brand-assets.server')
    const asset = await readBrandLogo(local)
    return `data:${asset.type};base64,${asset.bytes.toString('base64')}`
  }
  const { publicResource } = await import('./catalog.server')
  const asset = await publicResource(data)
  if (asset.bytes.length > 2 * 1024 * 1024) throw new Error('Choose a logo under 2 MB.')
  const bytes = asset.bytes
  const type = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
    : bytes[0] === 255 && bytes[1] === 216 ? 'image/jpeg'
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp'
        : /<svg[\s>]/i.test(asset.body) && !/<(?:script|foreignObject)\b|(?:href|src)\s*=\s*["'](?!#)|url\s*\(/i.test(asset.body) ? 'image/svg+xml' : null
  if (!type) throw new Error('This logo cannot be composed. Upload a PNG, JPG, WebP or self-contained SVG logo.')
  return `data:${type};base64,${bytes.toString('base64')}`
})

/** Retry saved-image placement only; never creates another image. */
export const retryComposition=createServerFn({method:'POST'}).validator(z.string().regex(/^[a-f0-9]{64}$/)).handler(async({data})=>{
  const {startCompositionRetry}=await import('./composition-retry.server')
  return startCompositionRetry(data)
})
