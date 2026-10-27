import { defineTool } from 'eve/tools'
import { z } from 'zod'
import { classifyProducts } from '../../src/lib/decisions.server.ts'
export default defineTool({
  description: 'Find products matching a semantic or visual condition using optional OpenAI Decisions with validated regular-inference fallback, including product photos. Set useDecisions false to skip the optional Decisions fast path; failure automatically uses configured regular inference once per batch. Use for requests such as find all red products, suitable for travel, or gifts for runners. Copy bypassCache exactly from current page context; when unavailable it defaults to true. Expands the saved catalog up to the demo cap and reports coverage.',
  inputSchema: z.object({ snapshotId: z.string(), query: z.string().min(1).max(500), bypassCache: z.boolean().default(true), useDecisions: z.boolean().default(true) }),
  async execute({ snapshotId, query, bypassCache, useDecisions }, ctx) { const result = await classifyProducts(snapshotId, query, bypassCache, `${ctx.session.id}:${ctx.callId}`, useDecisions); return { ...result, kind: 'product-results', productIds: result.matches.map(x => x.productId), count: result.matches.length } },
})
