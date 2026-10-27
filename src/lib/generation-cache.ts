import type { Generation, GenerationInput } from './studio.ts'

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]))
  return value
}

// Session IDs and UI revision counters do not change the requested artwork.
export function generationCacheInput(input: GenerationInput): unknown {
  const { requestId: _request, snapshotId: _snapshot, flowId: _flow, fresh: _fresh, creative, brand, ...content } = input
  const { fontResolution: _resolution, ...brandIdentity } = brand
  const requested = { ...content, brand: brandIdentity }
  if (!creative) return stable(requested)
  const { revision: _revision, ...direction } = creative
  return stable({ ...requested, creative: direction })
}

/** Keep the immutable execution/artifact identity and identify the request allowed to adopt it. */
export function generationCacheReuse(job: Generation, input: GenerationInput): Generation {
  if (job.status !== 'complete' || !job.images.length) throw new Error('Only a completed saved image can be reused.')
  return { ...job, cacheReuse: {
    sourceGenerationId: job.id,
    flowId: input.flowId ?? null,
    snapshotId: input.snapshotId,
    requestId: input.requestId,
    creativeRevision: input.creative?.revision ?? null,
    reusedAt: new Date().toISOString(),
  } }
}

/** Content reuse is separate from execution: each deliberate request gets its own recoverable journal. */
export function generationExecutionInput(input: GenerationInput, storeUrl: string, model: string) {
  const {requestId,fresh:_fresh,snapshotId:_snapshot,...creative}=input
  return {version:2,model,creative,storeUrl,requestId}
}
