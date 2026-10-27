import { AD_COPY_POLICY_VERSION } from './ad-typography.ts'
import { randomUUID } from 'node:crypto'
import { generationCacheInput, generationCacheReuse, generationExecutionInput } from './generation-cache.ts'
import path from 'node:path'
import { start } from 'workflow/api'
import { normalizeStoreUrl } from './catalog.ts'
import { getCatalogPage } from './catalog.server.ts'
import { extractBrandBasics } from './brand.server.ts'
import { cachedSnapshot, listGenerations, dataRoot, digest, entries, jobDir, readBinary, readGeneration, readJson, readSnapshot, reserveGeneration, saveGeneration, saveSnapshot, updateSnapshot } from './studio-storage.server.ts'
import { projectEnv } from './project-env.server.ts'
import { enrichBrandWorkflow } from '../../workflows/brand-enrichment'
import { generateImageWorkflow } from '../../workflows/image-generation'
import type { Generation, GenerationInput, SavedStore, StoreSnapshot } from './studio.ts'
import type { BrandSummary } from './brand.ts'
import { assertRevisionSource, localLogoName, rasterLogo } from './studio.ts'
import { normalizeGenerationContext, generationPrompt } from './generation-context.ts'
import { brandReferenceSchema } from './brand-actions.ts'

async function upgradeCachedBrandContext(cached: StoreSnapshot): Promise<StoreSnapshot> {
  if (cached.brand.brandContext?.trim() || cached.brand.researchStatus || cached.enrichment && ['queued', 'running'].includes(cached.enrichment.status)) return cached
  const sourceId = cached.enrichment?.sourceScanId ?? cached.id
  let claimed = false
  await updateSnapshot(sourceId, current => {
    if (current.brand.brandContext?.trim() || current.brand.researchStatus || current.enrichment && ['queued', 'running'].includes(current.enrichment.status)) return current
    claimed = true
    return { ...current, enrichment: { sourceScanId: sourceId, status: 'queued', requestedAt: new Date().toISOString() } }
  })
  if (claimed) {
    try {
      const run = await start(enrichBrandWorkflow, [sourceId])
      await updateSnapshot(sourceId, current => current.enrichment && !current.enrichment.runId ? { ...current, enrichment: { ...current.enrichment, runId: run.runId } } : current)
    } catch {
      await updateSnapshot(sourceId, current => ({ ...current, brand: { ...current.brand, researchStatus: 'unavailable' }, enrichment: current.enrichment ? { ...current.enrichment, status: 'complete', completedAt: new Date().toISOString(), error: 'Additional brand research could not start. Existing context is available.' } : current.enrichment }))
    }
  }
  return readSnapshot(cached.id)
}

export async function scanStore(input: string, refresh = false, bypassCache = false): Promise<{ snapshot: StoreSnapshot; cached: boolean }> {
  const storeUrl = normalizeStoreUrl(input)
  if (!refresh && !bypassCache) {
    const cached = await cachedSnapshot(storeUrl)
    if (cached?.catalog.products.length) return { snapshot: await upgradeCachedBrandContext(cached), cached: true }
  }
  const [catalog, brand] = await Promise.all([getCatalogPage(storeUrl, 1), extractBrandBasics(storeUrl).catch((): BrandSummary => ({
    sourceUrl: storeUrl, extractedAt: new Date().toISOString(), name: '', description: '', logoUrl: null, logoCandidates: [], colors: [], fonts: { heading: null, body: null }, headings: [],
    warnings: ['We could read your products, but could not read the brand details. Add them here, or refresh the store data to retry.'], provenance: ['Brand extraction unavailable; these fields have not been inferred.'],
  }))])
  if (!catalog.ok) throw new Error(catalog.error)
  const id = randomUUID(), now = new Date().toISOString()
  const snapshot: StoreSnapshot = { bypassCache, id, storeUrl, scannedAt: now, catalog: catalog.catalog, brand, baseBrand: brand, enrichment: { sourceScanId: id, status: 'queued', requestedAt: now } }
  await saveSnapshot(snapshot)
  let acceptedRunId: string | undefined
  try {
    const run = await start(enrichBrandWorkflow, [id])
    acceptedRunId = run.runId
    const updated = await updateSnapshot(id, current => ({ ...current, enrichment: current.enrichment ? { ...current.enrichment, runId: run.runId } : current.enrichment }))
    return { snapshot: updated, cached: false }
  } catch {
    if (acceptedRunId) return { snapshot: await readSnapshot(id), cached: false }
    const updated = await updateSnapshot(id, current => current.enrichment?.status !== 'queued' || current.enrichment.runId ? current : ({ ...current, enrichment: { sourceScanId: id, status: 'failed', requestedAt: now, completedAt: new Date().toISOString(), error: 'Your products and basic brand details are saved. Optional enrichment could not start.' } }))
    return { snapshot: updated, cached: false }
  }
}

export async function savedStores(): Promise<SavedStore[]> {
  const pointers = await Promise.all((await entries('stores')).filter(name => /^[a-f0-9]{64}\.json$/.test(name)).map(name => readJson<{ id: string }>(path.join(dataRoot, 'stores', name))))
  const snapshots = await Promise.all(pointers.flatMap(pointer => pointer ? [readSnapshot(pointer.id)] : []))
  return snapshots.sort((a, b) => b.scannedAt.localeCompare(a.scannedAt)).map(s => ({ id: s.id, storeUrl: s.storeUrl, name: s.brand.name, scannedAt: s.scannedAt, productCount: s.catalog.products.length }))
}

export { loadMoreSnapshot } from './catalog-snapshot.server.ts'

export async function startGeneration(input: GenerationInput) {
  if (input.bypassCache) input = { ...input, fresh: true }
  const snapshot = await readSnapshot(input.snapshotId)
  input = { ...normalizeGenerationContext(snapshot, input), copyPolicyVersion: AD_COPY_POLICY_VERSION }
  for (const reference of input.brand.visualReferences ?? []) brandReferenceSchema.parse(reference)
  if (rasterLogo(input.brand.logoUrl) && !localLogoName(input.brand.logoUrl)) normalizeStoreUrl(input.brand.logoUrl)
  if (input.sourceGenerationId) {
    if (!/^[a-f0-9]{64}$/.test(input.sourceGenerationId)) throw new Error('Choose a saved image to revise.')
    const source = await readGeneration(input.sourceGenerationId)
    assertRevisionSource(source, snapshot.storeUrl, input)
  }
  const model = 'openai/gpt-image-2'
  const cacheKey = digest({ version: 1, model, input: generationCacheInput(input) })
  if (input.fresh === false) {
    const match = (await listGenerations(snapshot.storeUrl)).find(job => {
      if (job.model !== model || job.status !== 'complete' || !job.images.length) return false
      if (job.cacheKey === cacheKey) return true
      // The visible brief may already contain the saved preparation; old jobs may lack cacheKey.
      try { return digest({ version: 1, model, input: generationCacheInput(normalizeGenerationContext(snapshot, job.input)) }) === cacheKey }
      catch { return false }
    })
    if (match) return generationCacheReuse(match, input)
  }
  const { requestId, fresh, snapshotId: _snapshotId, ...creative } = input
  const id = digest(generationExecutionInput(input, snapshot.storeUrl, model))
  const existing = await readGeneration(id)
  if (existing) return existing
  const legacyId = digest({ version: 1, model, creative, storeUrl: snapshot.storeUrl, ...(fresh ? { requestId } : {}) })
  const legacy = await readGeneration(legacyId)
  if (legacy?.input.requestId === requestId) return legacy
  // Cached results require no credential. New inference uses only the project key.
  const configured = !!(await projectEnv()).OPENROUTER_API_KEY
  if (!configured) throw new Error('Add the project OpenRouter key to .env before generating.')
  const now = new Date().toISOString()
  const generation: Generation = { id, cacheKey, storeUrl: snapshot.storeUrl, createdAt: now, updatedAt: now, status: 'queued', input, productTitle: input.products!.map(item => snapshot.catalog.products.find(product => product.id === item.productId)!.title).join(', ') || input.brand.name, model, images: [], compositionStatus: 'pending', workflowRunId: 'pending' }
  const prompt = generationPrompt(snapshot, input)
  const raced = await reserveGeneration(generation, prompt)
  if (raced) return raced
  try {
    const run = await start(generateImageWorkflow, [id])
    // The first step records its actual run ID without racing status updates here.
  } catch {
    await saveGeneration({ ...generation, status: 'failed', error: 'The durable image workflow could not start. Your request is saved; try a new version.' })
  }
  return (await readGeneration(id))!
}

export async function outputImage(id: string, index: number) {
  const job = await readGeneration(id)
  const filename = job?.images[index]
  if (!filename || !/^\d+\.(png|jpg)$/.test(filename)) return null
  const bytes = await readBinary(path.join(jobDir(id), filename))
  return bytes ? { bytes, type: filename.endsWith('.png') ? 'image/png' : 'image/jpeg', filename } : null
}
