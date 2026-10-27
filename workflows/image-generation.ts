import { brandContextReady, markBrandContextTimeout, prepareImageGeneration, runImageGeneration, markImageFailure, markCompositionUnavailable } from '../src/lib/image-generation.server'
import { analyzeGeneratedComposition } from '../src/lib/composition-analysis.server'
import { getWorkflowMetadata, sleep } from 'workflow'

export async function generateImageWorkflow(id: string) {
  'use workflow'
  try {
    let ready = await brandContextReady(id)
    for (let attempt = 0; !ready && attempt < 45; attempt++) { await sleep('2s'); ready = await brandContextReady(id) }
    if (!ready) { await markBrandContextTimeout(id); return }
    await prepareImageGeneration(id)
    await runImageGeneration(id, getWorkflowMetadata().workflowRunId)
  }
  catch { await markImageFailure(id); return }
  try { await analyzeGeneratedComposition(id) }
  catch { await markCompositionUnavailable(id) }
}
