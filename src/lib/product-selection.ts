import { variantImages as catalogVariantImages } from './catalog.ts'
import type { CatalogProduct, ProductVariant } from './catalog.ts'

export { variantImages } from './catalog.ts'

/** Undefined photos pick one scoped hero; null explicitly includes the whole product gallery. */
export type ProductSelection = { product: CatalogProduct; variant: ProductVariant; image: string | null; imageUrls?: string[] | null; allVariants?: boolean }
export function productImages(product: CatalogProduct): string[] {
  return [...new Set([...product.images, ...product.variants.map(v => v.image).filter((url): url is string => !!url)])]
}
export function selectionImages(selection: ProductSelection): string[] {
  const productGallery = productImages(selection.product)
  if (selection.imageUrls === null) return productGallery
  if (selection.imageUrls?.length) return selection.imageUrls.filter(url => productGallery.includes(url))
  if (selection.imageUrls === undefined) return selection.image && productGallery.includes(selection.image) ? [selection.image] : []
  const scoped = selection.allVariants === true ? productGallery : catalogVariantImages(selection.product, selection.variant.id)
  return scoped.slice(0, 1)
}
export function selectProduct(product: CatalogProduct, variantId?: string, imageUrls?: string[] | null, primary?: string | null, allVariants = false): ProductSelection {
  const variant = variantId ? product.variants.find(v => v.id === variantId) : product.variants.find(v => v.available) ?? product.variants[0]
  if (!variant) throw new Error('Choose a variant from this product.')
  const available = productImages(product)
  const scoped = allVariants ? available : catalogVariantImages(product, variant.id)
  const refined = imageUrls == null ? imageUrls : [...new Set(imageUrls)].filter(url => available.includes(url))
  if (refined && !refined.length) throw new Error('Keep at least one reference image.')
  const images = refined === null ? available : refined ?? scoped
  const hero = allVariants ? available[0] ?? null : variant.image && scoped.includes(variant.image) ? variant.image : scoped[0] ?? null
  return {
    product,
    variant,
    imageUrls: refined,
    image: primary && images.includes(primary) ? primary : imageUrls === undefined ? hero : variant.image && images.includes(variant.image) ? variant.image : images[0] ?? hero,
    ...(allVariants ? { allVariants: true } : {}),
  }
}

export type SavedProductSelection = { productId: string; variantId: string; image: string | null; imageUrls: string[] | null; allVariants?: boolean }
export function saveSelections(selections: ProductSelection[]): SavedProductSelection[] {
  return selections.map(({ product, variant, image, imageUrls, allVariants }) => {
    const saved = { productId: product.id, variantId: variant.id, image, imageUrls: imageUrls === undefined ? image ? [image] : null : imageUrls === null ? null : [...imageUrls] }
    return allVariants === true ? { ...saved, allVariants: true } : saved
  })
}
export function restoreSelections(products: CatalogProduct[], saved: unknown): ProductSelection[] {
  if (!Array.isArray(saved)) throw new Error('Your saved product context could not be read. Keep the saved workspace and try again.')
  const ids = new Set<string>()
  return saved.map(item => {
    const entry = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    const product = products.find(product => product.id === entry.productId)
    if (!product || ids.has(product.id) || typeof entry.variantId !== 'string' || (entry.allVariants !== undefined && typeof entry.allVariants !== 'boolean')) throw new Error('Your saved product context does not match this catalog.')
    ids.add(product.id)
    const imageUrls = entry.imageUrls === undefined && typeof entry.image === 'string' ? [entry.image] : entry.imageUrls
    if (imageUrls !== null && imageUrls !== undefined && (!Array.isArray(imageUrls) || !imageUrls.length || imageUrls.some(url => typeof url !== 'string' || !productImages(product).includes(url)))) throw new Error('Your saved reference images do not match this product.')
    return selectProduct(product, entry.variantId, imageUrls as string[] | null | undefined, typeof entry.image === 'string' ? entry.image : null, entry.allVariants === true)
  })
}
export function upsertSelection(selections: ProductSelection[], selection: ProductSelection): ProductSelection[] {
  const index = selections.findIndex(item => item.product.id === selection.product.id)
  return index < 0 ? [...selections, selection] : selections.map((item, i) => i === index ? selection : item)
}
export function productReferences(selections: ProductSelection[]) {
  return selections.map(selection => {
    const images = selectionImages(selection)
    const reference = { productId: selection.product.id, variantId: selection.variant.id, images: selection.image && images.includes(selection.image) ? [selection.image, ...images.filter(image => image !== selection.image)] : images }
    return selection.allVariants === true ? { ...reference, allVariants: true } : reference
  })
}
/** Omitted fields refine the existing item, never reset its variant or reference choices. */
export function applyProductAction(products: CatalogProduct[], selections: ProductSelection[], action: { productId: string; variantId?: string; imageUrls?: string[] | null; image?: string | null; allVariants?: boolean; preserveImageSelection?: boolean; preserveVariantSelection?: boolean; remove?: boolean }): ProductSelection[] {
  if (action.remove) return selections.filter(item => item.product.id !== action.productId)
  const product = products.find(item => item.id === action.productId)
  if (!product) throw new Error('Choose a product from the current catalog.')
  const current = selections.find(item => item.product.id === product.id)
  const images = action.preserveImageSelection || action.imageUrls === undefined ? current?.imageUrls : action.imageUrls
  if (images && images.some(url => !productImages(product).includes(url))) throw new Error('Choose reference images from this product.')
  const variantId = action.preserveVariantSelection || action.variantId === undefined ? current?.variant.id : action.variantId
  const sameVariant = !variantId || variantId === current?.variant.id
  const primary = sameVariant && (action.preserveImageSelection || action.image === undefined) ? current?.image : action.image
  const allVariants = action.allVariants === undefined
    ? action.preserveVariantSelection || action.variantId === undefined ? current?.allVariants === true : false
    : action.allVariants
  const selection = selectProduct(product, variantId, images, primary, allVariants)
  if (!selection.image) throw new Error('Choose a product with a reference image.')
  return upsertSelection(selections, selection)
}
