import { defineTool } from 'eve/tools'
import { z } from 'zod'
export default defineTool({ description: 'Navigate the merchant to the brand, product, idea (create), or artwork (studio) step, or return to changing the store. This does not generate or discard saved data.', inputSchema: z.object({ step: z.enum(['brand', 'products', 'create', 'studio', 'store']) }), execute: async ({ step }) => ({ kind: 'navigation', step }) })
