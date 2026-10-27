import { retryPlanning } from './planning-retry.ts'
import { AD_COPY_POLICY_VERSION } from './ad-typography.ts'
import path from 'node:path'
import { z } from 'zod'
import { generateText, Output } from 'ai'
import { strictJsonProvider, creativePlanSettings } from './strict-json.server.ts'
import { copyOptionSchema, creativeModel, imageAnalysisSchema, creativeSchema, emptyCreative, type CreativeState } from './creative.ts'
import { creativeForContext, creativeNeedsPreparation, creativePreparationInstructions, currentCreativeFallback, mergePreparedCreative } from './creative-preparation.ts'
import { dataRoot, digest, readJson, readSnapshot, writeJson } from './studio-storage.server.ts'
import { projectEnv } from './project-env.server.ts'
import { creativeWireSchema } from './creative-wire.ts'
import { creativePixels } from './creative-pixels.server.ts'
import type { GenerationInput } from './studio.ts'

type ProductInput = { productId: string; variantId: string; images: string[] }
const pending = new Map<string, Promise<CreativeState>>()

/** Shared Go preparation. Cached independently of image jobs; no invented preview seed. */
export async function prepareCreative(input: GenerationInput & { products?: ProductInput[] }, options: {requestScope?:string;onAttempt?:(attempt:number)=>Promise<void>;onFailure?:(error:unknown,attempt:number)=>Promise<void>;onFallback?:()=>Promise<void>} = {}): Promise<CreativeState> {
  const snapshot = await readSnapshot(input.snapshotId)
  const bypass=input.bypassCache===true||snapshot.bypassCache===true
  const requestKey=digest({policy:AD_COPY_POLICY_VERSION,scope:options.requestScope??{requestId:input.requestId,snapshotId:input.snapshotId,brand:input.brand,products:input.products},model:creativeModel})
  const requestFile=path.join(dataRoot,'creative-preparation-requests',`${requestKey}.json`)
  if(bypass){const own=await readJson<{creative:CreativeState}>(requestFile);if(own)return creativeSchema.parse(own.creative)}
  let current = input.creative ? creativeSchema.parse(input.creative) : emptyCreative()
  const requested = input.products ?? (input.productId ? [{ productId: input.productId, variantId: input.variantId, images: input.image ? [input.image] : [] }] : [])
  const products = requested.map(item => {
    const product = snapshot.catalog.products.find(product => product.id === item.productId)
    const variant = product?.variants.find(variant => variant.id === item.variantId)
    if (!product || !variant) throw new Error('A context product or variant is missing from the saved catalog.')
    const allowed = new Set([...product.images, ...product.variants.flatMap(variant => variant.image ? [variant.image] : [])])
    if (item.images.some(image => !allowed.has(image))) throw new Error('Use saved product images for creative context.')
    return { id: product.id, title: product.title, description: product.description, variant: 'allVariants' in item && item.allVariants ? 'All variants' : variant.title, ...('allVariants' in item && item.allVariants ? { allVariants: true, variants: product.variants.map(({ id, title }) => ({ id, title })) } : {}), images: item.images }
  })
  const pixels = await creativePixels([...requested.flatMap(item => item.images), ...(input.brand.visualReferences ?? [])],bypass?input.flowId??options.requestScope??snapshot.id:undefined)
  const visionSourceHash = digest(pixels.images.map(image => image.hash))
  const preparedContext = digest({ policy:AD_COPY_POLICY_VERSION,brand: input.brand, products, format: input.format, sourceHeadings: snapshot.brand.headings })
  current = creativeForContext(current, preparedContext)
  if (!bypass && !creativeNeedsPreparation(current) && current.copyOptions?.length === 4 && current.visionSourceHash === visionSourceHash) return { ...current, preparedContext }
  const context = { imageSources: pixels.images.map(image => ({source:image.source,hash:image.hash})), unavailableImages:pixels.unavailable, brand: input.brand, sourceHeadings: snapshot.brand.headings, products, direction: input.direction, format: input.format, brief: current.brief, composition: current.composition, layers: current.layers }
  const hash = digest({ version: 6, policy:AD_COPY_POLICY_VERSION, model: creativeModel, context })
  const file = path.join(dataRoot, 'creative-preparations', `${hash}.json`)
  const cached = bypass ? null : await readJson<{ creative: CreativeState }>(file)
  if (cached) return { ...mergePreparedCreative(current, creativeSchema.parse(cached.creative)), preparedContext }
  const pendingKey=bypass?requestKey:hash
  const running = pending.get(pendingKey)
  if (running) return { ...mergePreparedCreative(current, await running), preparedContext }
  const request = (async () => {
    const key = (await projectEnv()).OPENROUTER_API_KEY
    if (!key) throw new Error('Project OpenRouter key is required to prepare the ad.')
    const provider = strictJsonProvider(key)
    let planned
    try {
      planned = await retryPlanning(async attempt => {
        await options.onAttempt?.(attempt)
        const result = await generateText({
      model: provider.chat(creativeModel), maxRetries: 0, maxOutputTokens: creativePlanSettings.maxOutputTokens, providerOptions: creativePlanSettings.providerOptions, abortSignal: AbortSignal.timeout(creativePlanSettings.timeoutMs),
      system: creativePreparationInstructions,
      messages:[{role:'user',content:[{type:'text',text:JSON.stringify(context)}, ...pixels.images.map(image => ({type:'file' as const,data:image.base64,mediaType:image.mediaType}))]}],
      output: Output.object({ name: 'creative_plan', schema: creativeWireSchema }),
    })
        const proposed=creativeSchema.parse({...current,...result.output,imageAnalysis:{...result.output.imageAnalysis,kind:'source'}})
        if(proposed.copyOptions?.length!==4)throw new Error('Ad planning did not return four usable copy options.')
        const creative = { ...mergePreparedCreative(current, proposed), preparedContext, imageAnalysis: proposed.imageAnalysis, visionSourceHash }
        return { result, creative }
      }, options.onFailure)
    } catch(error) {
      const fallback=currentCreativeFallback(current)
      if(!fallback)throw error
      await options.onFallback?.()
      const creative={...fallback,preparedContext}
      await writeJson(requestFile,{creative,fallback:true,model:creativeModel,createdAt:new Date().toISOString()})
      return creative
    }
    const {result,creative}=planned
    await writeJson(requestFile,{creative,model:creativeModel,createdAt:new Date().toISOString()})
    if(!bypass)await writeJson(file, { model: creativeModel, providerModel: result.response.modelId, createdAt: new Date().toISOString(), contextHash: hash, context, creative, usage: result.usage })
    return creative
  })()
  pending.set(pendingKey, request)
  try { return await request } finally { pending.delete(pendingKey) }
}
