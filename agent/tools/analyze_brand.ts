import { defineTool } from 'eve/tools'
import { z } from 'zod'
import { brandUpdateActionSchema } from '../../src/lib/brand-actions.ts'
import { ensureBrandVisualUnderstanding } from '../../src/lib/brand-understanding.server.ts'

export default defineTool({
  description: 'Obtain cached visual brand understanding from actual saved pixels using the pinned brand specialist. If missing, analyze once and retain it. Returns suggested fields for the shared brand editor; never overwrites merchant edits. If pixels are unavailable, report that and continue with known facts.',
  inputSchema: z.object({snapshotId:z.string().uuid(),retry:z.boolean().optional().describe('Only true when the merchant explicitly asks to retry an unavailable analysis.')}), outputSchema: brandUpdateActionSchema,
  execute: async ({snapshotId,retry}) => {
    const {brand,analysis}=await ensureBrandVisualUnderstanding(snapshotId,{retry})
    return {kind:'brand-update' as const,snapshotId,mode:'suggestion' as const,evidenceHash:analysis.evidenceHash,analysisStatus:analysis.status,reason:analysis.reason,
      patch:analysis.status==='complete'?{description:brand.description,visualStyle:brand.visualStyle,visualReferences:brand.visualReferences}:{}}
  },
})
