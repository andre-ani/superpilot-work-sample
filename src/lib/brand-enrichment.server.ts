import { enrichBrand } from './brand.server.ts'
import { readSnapshot, updateSnapshot } from './studio-storage.server.ts'
import type { BrandSummary } from './brand.ts'
import { ensureBrandVisualUnderstanding } from './brand-understanding.server.ts'
import { refineBrandIdentity } from './brand-identity.server.ts'

export async function beginBrandEnrichment(sourceScanId: string, runId: string): Promise<string | null> {
  'use step'
  const snapshot = await updateSnapshot(sourceScanId, current => {
    const state = current.enrichment
    if (!state || state.sourceScanId !== sourceScanId || state.status === 'complete' || state.status === 'failed' || state.runId && state.runId !== runId) return current
    return { ...current, enrichment: { ...state, status: 'running', phase:'reading', summary:'Starting storefront design extraction.', runId } }
  })
  return snapshot.enrichment?.status === 'running' && snapshot.enrichment.runId === runId ? snapshot.storeUrl : null
}

export async function fetchBrandEnrichment(storeUrl: string, sourceScanId?: string): Promise<BrandSummary> {
  'use step'
  // Raw provider evidence is retained by enrichBrand before this step returns.
  const snapshot = sourceScanId ? await readSnapshot(sourceScanId) : null
  if (sourceScanId) await updateSnapshot(sourceScanId, current => current.enrichment?.status === 'running' && current.enrichment.runId === snapshot?.enrichment?.runId ? { ...current, enrichment: { ...current.enrichment, phase: 'reading', summary: 'Extracting storefront colors, typography and imagery.' } } : current)
  return enrichBrand(storeUrl, { bypassCache: snapshot?.bypassCache, sourceScanId })
}
fetchBrandEnrichment.maxRetries = 0

export async function publishBrandEnrichment(sourceScanId: string, runId: string, brand: BrandSummary): Promise<void> {
  'use step'
  await updateSnapshot(sourceScanId,current=>{
    const state=current.enrichment
    if (!state || state.runId!==runId || state.status!=='running') return current
    const logoUrl=brand.logoUrl??current.brand.logoUrl
    return {...current,enrichment:{...state,phase:'identity',summary:'Checking the original logo, palette and fonts.'},brand:{...brand,name:brand.name||current.brand.name,description:brand.description||current.brand.description,logoUrl,logoCandidates:[...new Set([...brand.logoCandidates,...current.brand.logoCandidates])],warnings:logoUrl?brand.warnings.filter(w=>!w.includes('small site icon')&&!w.includes('usable logo URL')):brand.warnings}}
  })
}

export async function understandBrandEnrichment(sourceScanId: string): Promise<BrandSummary> {
  'use step'
  await updateSnapshot(sourceScanId,current=>current.enrichment?.status==='running'?{...current,enrichment:{...current.enrichment,phase:'understanding',summary:'Preparing homepage imagery and brand background.'}}:current)
  const result=await ensureBrandVisualUnderstanding(sourceScanId)
  return result.brand
}
understandBrandEnrichment.maxRetries = 0

export async function verifyBrandIdentity(sourceScanId:string,runId:string,brand:BrandSummary):Promise<void>{
  'use step'
  const refined=await refineBrandIdentity(brand).catch(()=>brand)
  await updateSnapshot(sourceScanId,current=>{
    if(current.enrichment?.runId!==runId||current.enrichment.status!=='running')return current
    return {...current,brand:refined}
  })
}

export async function finishBrandEnrichment(sourceScanId: string, runId: string, brand: BrandSummary): Promise<void> {
  'use step'
  const completedAt = new Date().toISOString()
  await updateSnapshot(sourceScanId, current => {
    const state = current.enrichment
    if (!state || state.sourceScanId !== sourceScanId || state.runId !== runId || state.status !== 'running') return current
    // Patch only this original scan. Catalog pages, baseBrand, drafts and store pointers are untouched.
    return { ...current, brand, enrichment: { ...state, status: 'complete', phase:'complete', summary:brand.researchStatus === 'complete' && brand.brandContext?.trim() ? brand.visualAnalysis?.status === 'complete' ? 'Brand context and visual guidance are ready.' : 'Brand context is ready; visual guidance is unavailable.' : 'Original brand facts are saved; brand research is unavailable.', completedAt, error: undefined } }
  })
}

export async function failBrandEnrichment(sourceScanId: string, runId: string): Promise<void> {
  'use step'
  const completedAt = new Date().toISOString()
  await updateSnapshot(sourceScanId, current => {
    const state = current.enrichment
    if (!state || state.sourceScanId !== sourceScanId || state.runId && state.runId !== runId || state.status === 'complete' || state.status === 'failed') return current
    return { ...current, brand: { ...current.brand, researchStatus: current.brand.brandContext?.trim() ? 'complete' : 'unavailable' }, enrichment: { ...state, status: 'failed', phase:'failed', summary:'Storefront refinement could not finish. Basic brand facts remain available.', runId, completedAt, error: 'Visual refinement could not finish. Your basic details and edits are saved; refresh the store to try again.' } }
  })
}
