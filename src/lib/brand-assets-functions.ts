import { createServerFn } from '@tanstack/react-start'

export const uploadBrandLogo = createServerFn({ method: 'POST' }).validator((input: unknown) => {
  if (typeof input !== 'string' || input.length > 5_600_000) throw new Error('Choose a PNG, JPG or WebP image under 4 MB.')
  return input
}).handler(async ({ data }) => {
  const { saveBrandLogo } = await import('./brand-assets.server')
  return saveBrandLogo(data)
})
