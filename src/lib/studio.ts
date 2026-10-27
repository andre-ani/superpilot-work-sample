import type { CatalogPage } from './catalog'
import type { BrandSummary } from './brand'

export type StudioStep = 'brand' | 'products' | 'create' | 'studio'
export type StoreOpenOptions = { fresh?: boolean; flowId?: string; resume?: boolean; bypassCache?: boolean }
export type BrandDraft = {
  name: string
  description: string
  brandContext?: string
  informationSections?: import('./brand-actions').BrandInformationSection[]
  logoUrl: string
  /** Primary brand palette. */
  colors: string[]
  secondaryColors?: string[]
  headingFont: string
  bodyFont: string
  secondaryFont?: string
  /** Original font names stay above; this records the usable source/fallback assets. */
  fontResolution?: import('./brand-fonts').BrandFontResolutionMap
  direction: string
  visualStyle?: string
  visualReferences?: string[]
}
export type StoreSnapshot = {
  bypassCache?: boolean
  id: string
  storeUrl: string
  scannedAt: string
  catalog: CatalogPage
  brand: BrandSummary
  baseBrand?: BrandSummary
  enrichment?: { sourceScanId: string; status: 'queued' | 'running' | 'complete' | 'failed'; phase?: 'reading'|'identity'|'understanding'|'complete'|'failed'; summary?:string; requestedAt: string; completedAt?: string; error?: string; runId?: string }
}
export type GenerationInput = {
  copyPolicyVersion?: number
  bypassCache?: boolean
  flowId?: string
  requestId: string
  snapshotId: string
  productId: string
  variantId: string
  image: string
  imageUrls?: string[] | null
  products?: { productId: string; variantId: string; images: string[]; allVariants?: boolean }[]
  brandEdited?: import('./brand-draft').BrandEditedFields
  brand: BrandDraft
  direction: string
  format: 'square' | 'story'
  artworkOnly?: boolean
  sourceGenerationId?: string
  creative?: import('./creative').CreativeState
  fresh?: boolean
}
export type Generation = {
  cacheKey?: string
  /** Current-request adoption receipt; returned on reuse, never written into the original job. */
  cacheReuse?: {
    sourceGenerationId: string
    flowId: string | null
    snapshotId: string
    requestId: string
    creativeRevision: number | null
    reusedAt: string
  }
  id: string
  storeUrl: string
  createdAt: string
  updatedAt: string
  status: 'queued' | 'generating' | 'complete' | 'failed' | 'interrupted'
  input: GenerationInput
  productTitle: string
  model: string
  images: string[]
  error?: string
  cost?: number
  prepared?: boolean
  preparation?: { attempt: number; status: 'planning'|'retrying'|'complete'|'fallback'; message: string }
  composition?: import('./creative').CreativeState
  compositionStatus?: 'pending' | 'complete' | 'unavailable'
  compositionError?: string
  placement?: { requestId:string; attempt:number; maxAttempts:number; status:'queued'|'analyzing'|'retrying'|'complete'|'failed'; message:string; startedAt:string; updatedAt:string }
  workflowRunId?: string
}
export type SavedStore = { id: string; storeUrl: string; name: string; scannedAt: string; productCount: number }
export const generationImageUrl = (id: string, index = 0) => `/api/outputs/${id}/${index}`
export function rasterLogo(url: string): boolean {
  if (localLogoName(url)) return true
  try { const parsed = new URL(url); return parsed.protocol === 'https:' && !parsed.username && !parsed.password && /\.(png|jpe?g|webp)$/i.test(parsed.pathname) } catch { return false }
}
export function localLogoName(url: string): string | null {
  return /^\/api\/brand-assets\/([a-f0-9]{64}\.(?:png|jpg|webp))$/.exec(url)?.[1] ?? null
}

export function assertRevisionSource(source: Generation | null, storeUrl: string, input: Pick<GenerationInput, 'productId' | 'variantId' | 'products'>): asserts source is Generation {
  if (source?.status !== 'complete' || source.storeUrl !== storeUrl || generationProductIdentity(source.input) !== generationProductIdentity(input)) throw new Error('Choose a completed image of this product and variant to revise.')
}

export function generationProductIdentity(value: Pick<GenerationInput, 'productId' | 'variantId' | 'products'>): string {
  return JSON.stringify((value.products ?? (value.productId ? [{ productId: value.productId, variantId: value.variantId, allVariants: false }] : [])).map(p => `${p.productId}:${p.variantId}${p.allVariants === true ? ':all' : ''}`).sort())
}
