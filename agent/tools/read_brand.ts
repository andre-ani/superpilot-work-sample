import { defineTool, toolOutput, toolOutputPart } from 'eve/tools'
import { z } from 'zod'
import { readSnapshot } from '../../src/lib/studio-storage.server.ts'
import { savedBrandVisualEvidence, brandEvidencePixels } from '../../src/lib/brand-visual-evidence.server.ts'
export default defineTool({
  description: 'Read saved brand facts and actual screenshot/brand-image pixels. Current merchant edits take precedence. Missing images mean visual style is unknown; URLs alone are not visual inspection.',
  inputSchema: z.object({ snapshotId: z.string() }),
  execute: async ({ snapshotId }) => {
    const snapshot = await readSnapshot(snapshotId)
    const evidence = await savedBrandVisualEvidence(snapshot.storeUrl, snapshot.bypassCache ? snapshot.enrichment?.sourceScanId ?? snapshot.id : undefined).catch(() => null)
    return { storeUrl: snapshot.storeUrl, brand: snapshot.brand, evidenceHash: evidence?.hash ?? null, pixels: await brandEvidencePixels(evidence) }
  },
  toModelOutput(output) {
    return toolOutput.content([
      toolOutputPart.text(JSON.stringify({ storeUrl: output.storeUrl, brand: output.brand, evidenceHash: output.evidenceHash, imageSources: output.pixels.map(({url,kind})=>({url,kind})), visualEvidenceAvailable: output.pixels.length>0 })),
      ...output.pixels.map(image=>toolOutputPart.file(image.base64,{mediaType:image.mediaType})),
    ])
  },
})
