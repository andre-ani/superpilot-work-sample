import type { CatalogProduct, ProductVariant } from './catalog'

/** null means all product images; a list is an explicit, nonempty refinement. */
export type ProductSelection = { product: CatalogProduct; variant: ProductVariant; image: string | null; imageUrls?: string[] | null }
export function productImages(product: CatalogProduct): string[] {
  return [...new Set([...product.images, ...product.variants.map(v => v.image).filter((url): url is string => !!url)])]
}
export function selectionImages(selection: ProductSelection): string[] {
  const available = productImages(selection.product)
  return selection.imageUrls?.length ? selection.imageUrls.filter(url => available.includes(url)) : available
}
export function selectProduct(product: CatalogProduct, variantId?: string, imageUrls?: string[] | null, primary?: string | null): ProductSelection {
  const variant = variantId ? product.variants.find(v => v.id === variantId) : product.variants.find(v => v.available) ?? product.variants[0]
  if (!variant) throw new Error('Choose a variant from this product.')
  const available = productImages(product)
  const refined = imageUrls == null ? null : [...new Set(imageUrls)].filter(url => available.includes(url))
  if (refined && !refined.length) throw new Error('Keep at least one reference image.')
  const images = refined ?? available
  return { product, variant, imageUrls: refined, image: primary && images.includes(primary) ? primary : variant.image && images.includes(variant.image) ? variant.image : images[0] ?? null }
}
