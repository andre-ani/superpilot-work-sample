import { defineTool } from 'eve/tools'
import { studioBatchSchema } from '../../src/lib/creative'
export default defineTool({
  description: 'Apply explicitly requested studio actions through the same controls as the UI: choose concept/output, change format, edit brief or layout, generate/revise artwork, or export. Use current snapshotId, focused productId (empty for brand-only context) and creative revision; all collected products remain in context. Generate/export must be last; never generate without a merchant request. For creative invention use creative_studio instead.',
  inputSchema: studioBatchSchema,
  execute(input) { return { kind: 'studio-actions', ...input } },
})
