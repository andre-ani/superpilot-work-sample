import { defineTool } from 'eve/tools'
import { z } from 'zod'
export default defineTool({
  description: 'Remove one product from collected context only when the merchant asks. Preserve every other product and reference choice.',
  inputSchema: z.object({ snapshotId: z.string(), productId: z.string() }),
  execute(input) { return { kind: 'product-removal', ...input } },
})
