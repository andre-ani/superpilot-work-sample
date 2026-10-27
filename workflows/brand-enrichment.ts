import { getWorkflowMetadata } from 'workflow'
import { beginBrandEnrichment, fetchBrandEnrichment, publishBrandEnrichment, verifyBrandIdentity, understandBrandEnrichment, finishBrandEnrichment, failBrandEnrichment } from '../src/lib/brand-enrichment.server'

export async function enrichBrandWorkflow(sourceScanId: string): Promise<void> {
  'use workflow'
  const { workflowRunId } = getWorkflowMetadata()
  try {
    const storeUrl = await beginBrandEnrichment(sourceScanId, workflowRunId)
    if (!storeUrl) return
    const brand = await fetchBrandEnrichment(storeUrl, sourceScanId)
    await publishBrandEnrichment(sourceScanId, workflowRunId, brand)
    await verifyBrandIdentity(sourceScanId, workflowRunId, brand)
    const understood = await understandBrandEnrichment(sourceScanId)
    await finishBrandEnrichment(sourceScanId, workflowRunId, understood)
  } catch {
    // Provider failures become visible state; reopening the page never restarts paid work.
    await failBrandEnrichment(sourceScanId, workflowRunId)
  }
}
