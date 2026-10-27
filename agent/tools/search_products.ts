import { defineTool } from 'eve/tools'
import { z } from 'zod'
import { filterProducts } from '../../src/lib/catalog.ts'
import { readSnapshot } from '../../src/lib/studio-storage.server.ts'
export default defineTool({
  description: 'Quick exact keyword search of the current store catalog. Use classify_products for reasoning or visual attributes, such as red products. Returns IDs for the app to display.',
  inputSchema: z.object({ snapshotId: z.string(), query: z.string().max(500), availability: z.enum(['all', 'available', 'sold-out']).default('all') }),
  async execute({ snapshotId, query, availability }) {
    const snapshot = await readSnapshot(snapshotId)
    const products = filterProducts(snapshot.catalog.products, { query, availability, type: 'all', sort: 'store' })
    return { kind: 'product-results', snapshotId, query, productIds: products.map(p => p.id), products: products.slice(0, 20).map(p => ({ id: p.id, title: p.title, type: p.type, minPrice: p.minPrice })), count: products.length, examined: snapshot.catalog.products.length, complete: !snapshot.catalog.hasMore }
  },
})
