import { defineTool } from 'eve/tools'
import { z } from 'zod'
import { brandPatchSchema, brandUpdateActionSchema } from '../../src/lib/brand-actions.ts'
import { readSnapshot } from '../../src/lib/studio-storage.server.ts'

export default defineTool({
  description: 'Apply a merchant-requested correction to the shared editable brand context. Return only fields the merchant asked to change. Add or update informationSections by stable ID to retain additional supported brand knowledge. Send status loading before gathering an added section, then update the same ID with complete and source-grounded content; do not invent content. The UI upserts sections by ID and preserves other sections; an empty array explicitly clears them. This uses the same brand-update action and edit markers as manual UI editing; do not change original extraction evidence.',
  inputSchema:z.object({snapshotId:z.string().uuid(),patch:brandPatchSchema}),outputSchema:brandUpdateActionSchema,
  execute:async({snapshotId,patch})=>{await readSnapshot(snapshotId);return{kind:'brand-update' as const,snapshotId,mode:'edit' as const,patch}},
})
