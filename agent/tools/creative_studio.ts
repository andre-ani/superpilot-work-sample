import { defineWorkflowTool } from 'eve/tools'
import { z } from 'zod'
import { creativeModel, studioActionSchema } from '../../src/lib/creative'

export default defineWorkflowTool({
  description: 'Delegate creative briefs, ad hooks/copy and studio layout/revision requests to the pinned Sonnet creative specialist. Supply the complete current page context, original user request, snapshot ID, current product ID (empty for brand-only context), all selected products and creative revision. Returns shared workspace actions.',
  inputSchema: z.object({ request: z.string().max(4000), context: z.string().max(1_000_000), snapshotId: z.string().max(64), productId: z.string().max(64), revision: z.number().int().nonnegative() }),
  async execute(input, ctx) {
    'use workflow'
    const response = await ctx.agent('creative').send(JSON.stringify({ request: input.request, context: input.context }), {
      outputSchema: z.object({ summary: z.string().max(1200), actions: z.array(studioActionSchema).max(12) }), signal: ctx.abortSignal,
    })
    const result = await response.result()
    if (!result.data || result.status === 'failed') throw new Error('Creative work did not complete. No workspace changes were applied.')
    return { kind: 'studio-actions', model: creativeModel, snapshotId: input.snapshotId, productId: input.productId, revision: input.revision, ...result.data }
  },
})
