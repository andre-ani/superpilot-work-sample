import { createServerFn } from '@tanstack/react-start'
export const loadCatalog = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    if (!input || typeof input !== 'object') throw new Error('Invalid catalog request.')
    const data = input as Record<string, unknown>
    if (typeof data.storeUrl !== 'string' || data.storeUrl.length > 2048 || typeof data.page !== 'number' || !Number.isInteger(data.page) || data.page < 1 || data.page > 20) throw new Error('Invalid catalog request.')
    return { storeUrl: data.storeUrl, page: data.page }
  })
  .handler(async ({ data }) => {
    const { getCatalogPage } = await import('./catalog.server')
    return getCatalogPage(data.storeUrl, data.page)
  })

export const loadCatalogTotal = createServerFn({ method: 'POST' }).validator((id: string) => {
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) throw new Error('Invalid saved catalog.')
  return id
}).handler(async ({ data }) => {
  const { resolveCatalogTotal } = await import('./catalog-total.server')
  return resolveCatalogTotal(data)
})
