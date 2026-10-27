import { countPublicProducts } from './catalog.server.ts'
import { readSnapshot, updateSnapshot } from './studio-storage.server.ts'
const pending = new Map<string, Promise<number | null>>()
export async function resolveCatalogTotal(id: string): Promise<number | null> {
  const snapshot = await readSnapshot(id)
  if (typeof snapshot.catalog.totalCount === 'number') return snapshot.catalog.totalCount
  const sourceId = snapshot.enrichment?.sourceScanId ?? id
  if (pending.has(sourceId)) return pending.get(sourceId)!
  const request = (async () => {
    let total: number | null = null
    try { total = await countPublicProducts(snapshot.storeUrl, snapshot.catalog.catalogOrigin) } catch {}
    if (total !== null && total < snapshot.catalog.products.length) total = null
    await updateSnapshot(sourceId, current => ({ ...current, catalog: { ...current.catalog, ...(total === null ? {} : { totalCount: total }), totalCountStatus: total === null ? 'unavailable' : 'ready' } }))
    return total
  })()
  pending.set(sourceId, request)
  try { return await request } finally { pending.delete(sourceId) }
}
