import { createServerFn } from '@tanstack/react-start'
import { generationProductsSchema } from './generation-context'
import { brandPatchSchema, paletteSchema } from './brand-actions'
import { creativeSchema } from './creative'
import type { GenerationInput } from './studio'

const text = (value: unknown, max = 2048): string => {
  if (typeof value !== 'string' || value.length > max) throw new Error('Invalid studio request.')
  return value
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid studio request.')
  return value as Record<string, unknown>
}
export const scan = createServerFn({ method: 'POST' }).validator((input: unknown) => {
  const data = object(input)
  return { storeUrl: text(data.storeUrl), refresh: data.refresh === true, bypassCache: data.bypassCache === true }
}).handler(async ({ data }) => {
  const { scanStore } = await import('./studio.server')
  return scanStore(data.storeUrl, data.refresh, data.bypassCache)
})
export const getSavedStores = createServerFn({ method: 'GET' }).handler(async () => {
  const { savedStores } = await import('./studio.server')
  return savedStores()
})
export const getSavedScan = createServerFn({ method: 'GET' }).validator((value: unknown) => text(value, 64)).handler(async ({ data }) => {
  const { readSnapshot } = await import('./studio-storage.server')
  return readSnapshot(data)
})
export const loadMoreProducts = createServerFn({ method: 'POST' }).validator((value: unknown) => text(value, 64)).handler(async ({ data }) => {
  const { loadMoreSnapshot } = await import('./studio.server')
  return loadMoreSnapshot(data)
})
export const getGenerations = createServerFn({ method: 'GET' }).validator((value: unknown) => text(value)).handler(async ({ data }) => {
  const { listGenerations } = await import('./studio-storage.server')
  return listGenerations(data)
})
export const generate = createServerFn({ method: 'POST' }).validator((value: unknown): GenerationInput => {
  const input = object(value), brand = object(input.brand)
  paletteSchema.parse(brand.colors)
  if (input.format !== 'square' && input.format !== 'story') throw new Error('Choose a supported image format.')
  if (input.imageUrls !== undefined && input.imageUrls !== null && (!Array.isArray(input.imageUrls) || !input.imageUrls.length || !input.imageUrls.every(url => typeof url === 'string' && url.length <= 2048))) throw new Error('Choose product reference photos, or use the whole product.')
  return {
    bypassCache: input.bypassCache === true, flowId: input.flowId === undefined ? undefined : text(input.flowId, 100), requestId: text(input.requestId, 64), snapshotId: text(input.snapshotId, 64), productId: text(input.productId ?? '', 64), variantId: text(input.variantId ?? '', 64), image: text(input.image ?? ''),
    products: input.products === undefined ? undefined : generationProductsSchema.parse(input.products),
    brandEdited: input.brandEdited && typeof input.brandEdited === 'object' ? Object.fromEntries(Object.entries(input.brandEdited).filter(([key, value]) => key in brandPatchSchema.shape && value === true)) : undefined,
    imageUrls: input.imageUrls as string[] | null | undefined,
    direction: text(input.direction, 12000), format: input.format, fresh: input.fresh === true, artworkOnly: input.artworkOnly === true,
    sourceGenerationId: input.sourceGenerationId === undefined ? undefined : text(input.sourceGenerationId, 64),
    creative: input.creative === undefined ? undefined : creativeSchema.parse(input.creative),
    brand: { informationSections: brandPatchSchema.shape.informationSections.parse(brand.informationSections), name: text(brand.name, 300), description: text(brand.description, 4000), brandContext: brandPatchSchema.shape.brandContext.parse(brand.brandContext), logoUrl: text(brand.logoUrl), colors: brand.colors as string[], secondaryColors: brandPatchSchema.shape.secondaryColors.parse(brand.secondaryColors), headingFont: text(brand.headingFont, 200), bodyFont: text(brand.bodyFont, 200), secondaryFont: brandPatchSchema.shape.secondaryFont.parse(brand.secondaryFont), direction: text(brand.direction, 2000), visualStyle: brandPatchSchema.shape.visualStyle.parse(brand.visualStyle), visualReferences: brandPatchSchema.shape.visualReferences.parse(brand.visualReferences) },
  }
}).handler(async ({ data }) => {
  const { startGeneration } = await import('./studio.server')
  return startGeneration(data)
})
