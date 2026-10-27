import { defineTool } from 'eve/tools'
import { z } from 'zod'
import { normalizeStoreUrl } from '../../src/lib/catalog.ts'
export default defineTool({ description: 'Ask the app to open a Shopify store supplied by the merchant. The browser starts the saved-data/scan workflow and reports progress. Do not claim the store is already scanned.', inputSchema: z.object({ url: z.string().max(2048) }), endsTurn: true, async execute({ url }) { return { kind: 'scan-request', storeUrl: normalizeStoreUrl(url) } } })
