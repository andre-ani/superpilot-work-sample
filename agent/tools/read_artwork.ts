import path from 'node:path'
import { defineTool, toolOutput, toolOutputPart } from 'eve/tools'
import { z } from 'zod'
import { jobDir, readBinary, readGeneration, readSnapshot } from '../../src/lib/studio-storage.server.ts'

export default defineTool({
  description: 'Inspect the actual selected generated artwork pixels and its saved placement reasoning before suggesting visual/layout changes. Does not generate or modify an image.',
  inputSchema: z.object({ generationId: z.string().regex(/^[a-f0-9]{64}$/), snapshotId: z.string().max(64) }),
  async execute({ generationId, snapshotId }) {
    const [job, snapshot] = await Promise.all([readGeneration(generationId), readSnapshot(snapshotId)])
    if (!job || job.status !== 'complete' || job.storeUrl !== snapshot.storeUrl) throw new Error('Choose a saved image from the current store.')
    const filename = job.images[0]
    if (!filename || !/^\d+\.(png|jpg)$/.test(filename)) throw new Error('Saved image is unavailable.')
    const bytes = await readBinary(path.join(jobDir(job.id), filename))
    if (!bytes) throw new Error('Saved image is unavailable.')
    return { generationId, productTitle: job.productTitle, analysis: job.composition?.imageAnalysis ?? null, base64: bytes.toString('base64'), mediaType: filename.endsWith('.png') ? 'image/png' : 'image/jpeg' }
  },
  toModelOutput(output) {
    return toolOutput.content([toolOutputPart.text(JSON.stringify({ generationId:output.generationId, productTitle:output.productTitle, analysis:output.analysis })), toolOutputPart.file(output.base64, { mediaType:output.mediaType })])
  },
})
