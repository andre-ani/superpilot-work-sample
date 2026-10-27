import path from 'node:path'
import { resolveBrandFontsForGeneration } from './brand-fonts.server.ts'
import { dataRoot, writeJson, atomicWrite, finishSavedResponse, jobDir, readBinary, readGeneration, readSnapshot, saveGeneration } from './studio-storage.server.ts'
import { projectEnv } from './project-env.server.ts'
import { assertRevisionSource, localLogoName, rasterLogo } from './studio.ts'
import { readBrandLogo } from './brand-assets.server.ts'
import { normalizeGenerationContext, generationPrompt } from './generation-context.ts'
import { preparationFailureDetails, preparationFailureMessage } from './creative-wire.ts'
import { prepareCreative } from './creative-preparation.server.ts'
import { ensureBrandVisualUnderstanding } from './brand-understanding.server.ts'
import { inferBrandEdits, mergeBrandEnrichment } from './brand-draft.ts'
import { brandReferenceSchema } from './brand-actions.ts'

/** Read-only gate: brand-only jobs reuse the active background research run. */
export async function brandContextReady(id: string): Promise<boolean> {
  'use step'
  const job = await readGeneration(id)
  if (!job || job.status === 'complete' || job.status === 'failed') return true
  if ((job.input.products ?? (job.input.productId ? [{}] : [])).length || job.input.brand.brandContext?.trim()) return true
  const snapshot = await readSnapshot(job.input.snapshotId)
  return !snapshot.enrichment || !['queued', 'running'].includes(snapshot.enrichment.status)
}

export async function markBrandContextTimeout(id: string) {
  'use step'
  const job = await readGeneration(id)
  if (!job || job.status !== 'queued') return
  await saveGeneration({ ...job, status: 'failed', error: 'Brand research is taking longer than expected. Your context is saved. Try creating again after it finishes.' })
}

export async function prepareImageGeneration(id: string) {
  'use step'
  const job = await readGeneration(id)
  if (!job || job.prepared || job.status === 'complete' || job.status === 'failed') return
  const snapshot = await readSnapshot(job.input.snapshotId)
  const activeEnrichment = snapshot.enrichment && ['queued', 'running'].includes(snapshot.enrichment.status)
  const ownResearchReady = snapshot.brand.researchStatus || snapshot.brand.brandContext?.trim()
  const understood = activeEnrichment || ownResearchReady ? { brand: snapshot.brand } : await ensureBrandVisualUnderstanding(job.input.snapshotId)
  const edited = job.input.brandEdited ?? inferBrandEdits(snapshot.baseBrand ?? snapshot.brand, job.input.brand)
  // Reference selections are exact: analysis can describe them, never add/replace them.
  const effectiveBrand = mergeBrandEnrichment(job.input.brand, snapshot.baseBrand ?? snapshot.brand, understood.brand, { ...edited, visualReferences: true })
  const brand = await resolveBrandFontsForGeneration(snapshot.storeUrl, effectiveBrand)
  const input = normalizeGenerationContext(snapshot, { ...job.input, brand })
  let creative
  try { creative=await prepareCreative(input,{
    requestScope:job.id,
    onAttempt:async attempt=>{const current=await readGeneration(id);if(current?.status==='queued')await saveGeneration({...current,preparation:{attempt,status:attempt===1?'planning':'retrying',message:attempt===1?'Planning your ad':'Retrying ad planning (2 of 2)'}})},
    onFailure:async(error,attempt)=>{await writeJson(path.join(dataRoot,'generation-preparation-errors',`${id}-attempt-${attempt}.json`),{...preparationFailureDetails(error),recordedAt:new Date().toISOString()}).catch(()=>{})},
    onFallback:async()=>{const current=await readGeneration(id);if(current?.status==='queued')await saveGeneration({...current,preparation:{attempt:current.preparation?.attempt??1,status:'fallback',message:'Using your saved ad plan'}})},
  }) }
  catch(error){
    const detail=error&&typeof error==='object'?error as {name?:string;message?:string;statusCode?:number;responseBody?:string;isRetryable?:boolean}:{}
    let upstream:unknown;try{const parsed=JSON.parse(detail.responseBody??'{}');upstream=parsed.error}catch{}
    await import('./studio-storage.server.ts').then(({writeJson,dataRoot})=>writeJson(path.join(dataRoot,'generation-preparation-errors',`${job.id}.json`),{...preparationFailureDetails(error),upstream,recordedAt:new Date().toISOString()}))
    await saveGeneration({...job,status:'failed',error:preparationFailureMessage(error)})
    throw error
  }
  const prepared = { ...input, creative }
  await atomicWrite(path.join(jobDir(id), 'prompt.txt'), generationPrompt(snapshot, prepared))
  const current=await readGeneration(id)??job
  await saveGeneration({ ...current, input: prepared, prepared: true, preparation:current.preparation?.status==='fallback'?current.preparation:{attempt:current.preparation?.attempt??1,status:'complete',message:'Ad plan ready'} })
}
prepareImageGeneration.maxRetries = 0

export async function runImageGeneration(id: string, workflowRunId: string) {
  'use step'
  let job = await readGeneration(id)
  if (!job || job.status === 'complete' || job.status === 'failed') return
  const input = job.input
  if (await finishSavedResponse(job)) return
  const key = (await projectEnv()).OPENROUTER_API_KEY
  if (!key) throw new Error('Project OpenRouter key missing.')
  const prompt = await readBinary(path.join(jobDir(id), 'prompt.txt'))
  if (!prompt) throw new Error('Saved image prompt missing.')
  const snapshot = await readSnapshot(job.input.snapshotId)
  const normalized = normalizeGenerationContext(snapshot, input)
  const references = normalized.products!.flatMap(product => product.images)
  for (const reference of input.brand.visualReferences ?? []) {
    brandReferenceSchema.parse(reference)
    const name = localLogoName(reference)
    if (name) { const asset = await readBrandLogo(name); references.push(`data:${asset.type};base64,${asset.bytes.toString('base64')}`) }
    else references.push(reference)
  }
  const localLogo = !job.input.artworkOnly && localLogoName(job.input.brand.logoUrl)
  if (localLogo) { const asset = await readBrandLogo(localLogo); references.push(`data:${asset.type};base64,${asset.bytes.toString('base64')}`) }
  else if (!job.input.artworkOnly && rasterLogo(job.input.brand.logoUrl)) references.push(job.input.brand.logoUrl)
  if (job.input.sourceGenerationId) {
    const source = await readGeneration(job.input.sourceGenerationId)
    assertRevisionSource(source, job.storeUrl, job.input)
    const filename = source.images[0]
    if (!filename || !/^\d+\.(png|jpg)$/.test(filename)) throw new Error('The source image is unavailable.')
    const bytes = await readBinary(path.join(jobDir(source.id), filename))
    if (!bytes) throw new Error('The source image is unavailable.')
    references.push(`data:image/${filename.endsWith('.png') ? 'png' : 'jpeg'};base64,${bytes.toString('base64')}`)
  }
  job = { ...job, status: 'generating', workflowRunId }
  await saveGeneration(job)
  const response = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(480000),
    body: JSON.stringify({ model: job.model, prompt: prompt.toString('utf8'), n: 1, quality: 'medium', output_format: 'png', aspect_ratio: job.input.format === 'story' ? '9:16' : '1:1', ...(references.length ? { input_references: references.map(url => ({ type: 'image_url', image_url: { url } })) } : {}) }),
  })
  const chunks: Uint8Array[] = []
  const reader = response.body?.getReader()
  try {
    if (reader) while (true) { const next = await reader.read(); if (next.done) break; chunks.push(next.value) }
  } catch (error) {
    if (chunks.length) await atomicWrite(path.join(jobDir(id), 'response.partial'), Buffer.concat(chunks))
    throw error
  } finally { reader?.releaseLock() }
  await atomicWrite(path.join(jobDir(id), 'response.json'), Buffer.concat(chunks))
  if (!response.ok || !await finishSavedResponse(job)) throw new Error('The image response is retained, but generation did not produce a usable image.')
}
// Never replay a paid image request automatically after an ambiguous network failure.
runImageGeneration.maxRetries = 0

export async function markImageFailure(id: string) {
  'use step'
  const job = await readGeneration(id)
  if (!job || job.status === 'complete' || job.status==='failed'&&!!job.error) return
  if (await finishSavedResponse(job).catch(() => null)) return
  await saveGeneration({ ...job, status: 'failed', error: 'Image creation could not finish. Your request and received output are retained. Try a new version when ready.' })
}

export async function markCompositionUnavailable(id: string) {
  'use step'
  const job = await readGeneration(id)
  if (!job || job.status !== 'complete' || job.compositionStatus === 'complete') return
  await saveGeneration({ ...job, compositionStatus: 'unavailable', compositionError: 'Your artwork is saved. Placement was interrupted. Retry placement to continue.',...(job.placement?{placement:{...job.placement,status:'failed' as const,message:'Placement interrupted',updatedAt:new Date().toISOString()}}:{}) })
}
