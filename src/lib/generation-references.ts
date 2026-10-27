import type { CatalogProduct } from './catalog'
import type { GenerationInput } from './studio'
import { productImages } from './product-selection'

/** Demo budget for all references: product photos, optional logo, and previous artwork. */
export const MAX_GENERATION_REFERENCES = 16
export function generationProductReferences(product: CatalogProduct, input: Pick<GenerationInput, 'image' | 'imageUrls'>): string[] {
  const available = productImages(product)
  const selected = input.imageUrls === undefined ? [input.image] : input.imageUrls === null ? available : [...new Set(input.imageUrls)]
  if (!selected.length || selected.some(url => !available.includes(url)) || !selected.includes(input.image)) throw new Error('Choose a primary photo and reference images from the selected product.')
  return [input.image, ...selected.filter(url => url !== input.image)]
}
export function assertReferenceBudget(productCount: number, extras: number) {
  if (productCount + extras > MAX_GENERATION_REFERENCES) throw new Error(`This demo accepts ${MAX_GENERATION_REFERENCES} reference images in total. Select at most ${MAX_GENERATION_REFERENCES - extras} product photos for this generation.`)
}
