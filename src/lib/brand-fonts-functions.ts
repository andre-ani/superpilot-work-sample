import { createServerFn } from '@tanstack/react-start'

export const loadBrandFonts = createServerFn({ method: 'POST' }).validator((input: unknown) => {
  if (!input || typeof input !== 'object') throw new Error('Invalid brand font request.')
  const data = input as Record<string,unknown>
  if (typeof data.sourceUrl !== 'string' || data.sourceUrl.length > 2048 || typeof data.headingName !== 'string' || data.headingName.length > 100 || typeof data.bodyName !== 'string' || data.bodyName.length > 100) throw new Error('Invalid brand font request.')
  if (data.secondaryName !== undefined && (typeof data.secondaryName !== 'string' || data.secondaryName.length > 100)) throw new Error('Invalid supporting font request.')
  return { sourceUrl: data.sourceUrl, headingName: data.headingName, bodyName: data.bodyName, secondaryName: typeof data.secondaryName === 'string' ? data.secondaryName : '' }
}).handler(async ({ data }) => {
  const { getBrandFonts } = await import('./brand-fonts.server')
  return getBrandFonts(data.sourceUrl,data.headingName,data.bodyName,data.secondaryName)
})
