import { randomUUID } from 'node:crypto'
import { getCatalogPage } from './catalog.server.ts'
import { readSnapshot, saveSnapshot } from './studio-storage.server.ts'
import type { StoreSnapshot } from './studio.ts'

export async function loadMoreSnapshot(id: string) {
  const previous = await readSnapshot(id)
  if (!previous.catalog.hasMore || previous.catalog.page >= 20) return previous
  const result = await getCatalogPage(previous.storeUrl, previous.catalog.page + 1, previous.catalog.catalogOrigin)
  if (!result.ok) throw new Error(result.error)
  const next: StoreSnapshot = { ...previous, id: randomUUID(), catalog: { ...result.catalog, currency: previous.catalog.currency, totalCount: previous.catalog.totalCount, totalCountStatus: previous.catalog.totalCountStatus, products: [...new Map([...previous.catalog.products, ...result.catalog.products].map(product => [product.id, product])).values()], skipped: previous.catalog.skipped + result.catalog.skipped } }
  if (!next.catalog.hasMore && next.catalog.totalCount === undefined) { next.catalog.totalCount = next.catalog.products.length; next.catalog.totalCountStatus = 'ready' }
  await saveSnapshot(next)
  return next
}
