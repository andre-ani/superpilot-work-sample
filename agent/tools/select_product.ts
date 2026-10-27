import { defineTool } from 'eve/tools'
import { z } from 'zod'
import { readSnapshot } from '../../src/lib/studio-storage.server.ts'
import { selectProduct, productImages } from '../../src/lib/product-selection.ts'
export default defineTool({
  description: 'Add or refine a product in the collected context without replacing other products when the merchant explicitly chooses one. For a fresh product with multiple variants, choose a concrete variant or explicitly choose all variants. Does not generate an image.',
  inputSchema: z.object({ snapshotId: z.string(), productId: z.string(), variantId: z.string().optional(), allVariants: z.boolean().optional(), imageUrls: z.array(z.string()).min(1).nullable().optional() }),
  async execute({ snapshotId, productId, variantId, allVariants, imageUrls }) {
    const snapshot = await readSnapshot(snapshotId), product = snapshot.catalog.products.find(p => p.id === productId)
    if (!product || imageUrls?.some(url => !productImages(product).includes(url))) throw new Error('Choose a product and reference photos from the current saved catalog.')
    if (product.variants.length > 1 && variantId === undefined && allVariants !== true) throw new Error('Choose a specific variant or explicitly choose all variants for this product.')
    const selection = selectProduct(product, variantId, imageUrls, undefined, allVariants === true)
    return { kind: 'product-selection', snapshotId, productId, variantId: selection.variant.id, allVariants: allVariants === true, image: selection.image, imageUrls: selection.imageUrls, selection, preserveImageSelection: imageUrls === undefined, preserveVariantSelection: variantId === undefined, title: product.title }
  },
})
