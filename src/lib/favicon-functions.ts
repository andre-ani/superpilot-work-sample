import { createServerFn } from '@tanstack/react-start'
import { normalizeStoreUrl } from './catalog'
export const loadFavicon = createServerFn({ method: 'GET' })
  .validator((value: unknown) => { if (typeof value !== 'string') throw new Error('A store URL is required.'); return normalizeStoreUrl(value) })
  .handler(async ({ data }) => {
    const { getStoreFavicon } = await import('./favicon.server')
    return getStoreFavicon(data)
  })
