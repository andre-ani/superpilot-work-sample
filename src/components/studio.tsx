import { getAdDirections } from '@/lib/ad-directions-functions'
import { ideaBrandReady } from '@/lib/idea-readiness'
import { unwrapAdDirections, withIdeaDeadline, appendIdeas, revealIdeas, adDirectionError, type AdIdeaCollection, type AdDirectionResult, type AdDirectionRequest } from '@/lib/ad-directions'
import type { CreateResearchState } from '@/components/create-intent'
import { assertStudioContext, assertStudioEffects, creativeModel, applyStudioAction, creativeDirection, creativeSchema, emptyCreative, mergeReviewCopyOptions, mergeReviewComposition, studioBatchSchema, type CreativeState, type StudioAction } from '@/lib/creative'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from 'motion/react'
import { IconArrowLeft, IconArrowRight, IconCheck, IconClock, IconDatabase, IconLoader2, IconRefresh, IconShoppingBag, IconPalette, IconPackage, IconPhoto, IconArrowsExchange, IconBulb, IconLayoutSidebar } from '@tabler/icons-react'
import { AgentWorkspace, type AgentAction, type WorkspaceNavigation } from '@/components/agent-workspace'
import { brandDraftFromSummary, markBrandEdits, inferBrandEdits, mergeBrandEnrichment, type BrandEditedFields, type BrandField } from '@/lib/brand-draft'
import { normalizeStoreUrl, type CatalogFilters } from '@/lib/catalog'
import { AppHeader } from '@/components/app-header'
import { ThemeToggle, ThemeSwitch } from '@/components/theme-toggle'
import { HeaderProjectMenu, SavedWorkspaceList } from '@/components/chat-project-menu'
import { StudioSidebar } from '@/components/studio-sidebar'
import { brandReferenceSchema, mergeInformationSections, brandPatchSchema, brandUpdateActionSchema } from '@/lib/brand-actions'
import { idleActivity, researchActivity, type AgentActivity } from '@/lib/agent-activity'
import { StoreUrlForm } from '@/components/store-url-form'
import { ErrorNotice } from '@/components/error-notice'
import { readWorkspace, readLegacyWorkspace, writeWorkspace } from '@/lib/workspace-persistence'
import { userError } from '@/lib/user-error'
import { ProductPicker } from '@/components/product-picker'
import { ProductFilters } from '@/components/product-filters'
import { loadCatalogTotal } from '@/lib/catalog-functions'
import { retryComposition } from '@/lib/composition-functions'
import { ProductDiscoveryChip } from '@/components/product-discovery-chip'
import { ProductContexts } from '@/components/product-context'
import { productImages, selectProduct, selectionImages, saveSelections, restoreSelections, upsertSelection, productReferences, applyProductAction, type SavedProductSelection, type ProductSelection } from '@/lib/product-selection'
import { BrandDock, StudioBrand } from '@/components/studio-brand'
import { useCachePolicy } from '@/components/use-cache-policy'
import { readCachePolicy } from '@/lib/cache-policy'
import { StudioCreate } from '@/components/studio-create'
import type { ExportControls } from '@/components/export-actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { scan, getSavedScan, getSavedStores, getGenerations, generate, loadMoreProducts } from '@/lib/studio-functions'
import { generationProductIdentity } from '@/lib/studio'
import type { BrandDraft, Generation, SavedStore, StoreSnapshot, StudioStep, StoreOpenOptions } from '@/lib/studio'

type CacheReuseReceipt = NonNullable<Generation['cacheReuse']>
type Workspace = { placementRetries?: Record<string,{requestId:string;revision:number}>; exportSelections?:Record<string,string[]>; ideaCollections?:AdIdeaCollection[]; bypassCache?: boolean; flowId?: string; cacheReceipts?: Record<string, CacheReuseReceipt>; generationRevisions?: Record<string, number>; creative: CreativeState; compositions: Record<string, CreativeState>; compositionFormats: Record<string, 'square' | 'story'>; snapshot: StoreSnapshot; brand: BrandDraft; selection: ProductSelection | null; selections: ProductSelection[]; direction: string; format: 'square' | 'story'; step: StudioStep; activeId: string | null; edited: BrandEditedFields }
type Remembered = Omit<Workspace, 'snapshot' | 'selection' | 'selections'> & { selections?: SavedProductSelection[]; snapshotId: string; productId?: string; variantId?: string; image?: string | null; imageUrls?: string[] | null }
const currentKey = 'superpilot-studio-current-v1'
const viewKey = 'superpilot-studio-view-v1'
const sidebarKey = 'superpilot-sidebar-open-v1'
const storageKey = (store: string) => `superpilot-studio-v1:${store}`
const steps: { id: StudioStep; label: string }[] = [{ id: 'brand', label: 'Brand' }, { id: 'products', label: 'Products' }, { id: 'create', label: 'Ideate' }, { id: 'studio', label: 'Create' }]
const titles = { brand: ['Here’s what we found.', 'A little context makes a much better creative. Review your brand before we move on.'], products: ['Put a product in the spotlight.', 'Choose the product, variant, and photo you want to work with.'], create: ['Let’s make something yours.', 'Set the direction. We’ll bring your brand and product together.'] }
function newBrand(snapshot: StoreSnapshot): BrandDraft {
  return brandDraftFromSummary(snapshot.brand)
}
function remembered(store: string, flowId?: string): Remembered | null {
  try { return readWorkspace<Remembered>(store, flowId) } catch { return null }
}
function validCacheReceipt(value: unknown): value is CacheReuseReceipt {
  if (!value || typeof value !== 'object') return false
  const receipt = value as Partial<CacheReuseReceipt>
  return typeof receipt.sourceGenerationId === 'string' && (typeof receipt.flowId === 'string' || receipt.flowId === null) && typeof receipt.snapshotId === 'string' && typeof receipt.requestId === 'string' && (typeof receipt.creativeRevision === 'number' || receipt.creativeRevision === null) && typeof receipt.reusedAt === 'string'
}
function savedCacheReceipts(value: unknown): Record<string, CacheReuseReceipt> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([, receipt]) => validCacheReceipt(receipt))) as Record<string, CacheReuseReceipt>
}
function savedExportSelections(value: unknown): Record<string,string[]> {
  if(!value||typeof value!=='object'||Array.isArray(value))return {}
  return Object.fromEntries(Object.entries(value).filter(([key,ids])=>key.length<=100&&Array.isArray(ids)).map(([key,ids])=>[key,[...new Set((ids as unknown[]).filter((id):id is string=>typeof id==='string'&&id.length<=100))].slice(0,16)]))
}
function restore(snapshot: StoreSnapshot, saved: Remembered | null): Workspace {
  const selections = restoreSelections(snapshot.catalog.products, saved?.selections ?? (saved?.productId ? [saved] : []))
  const selection = selections.find(item => item.product.id === saved?.productId) ?? selections[0] ?? null
  const restoredBrand = saved?.brand && typeof saved.brand.name === 'string' && Array.isArray(saved.brand.colors) ? saved.brand : newBrand(snapshot)
  const edited = saved?.edited ?? inferBrandEdits(snapshot.baseBrand ?? snapshot.brand, restoredBrand)
  const brand = snapshot.enrichment?.status === 'complete' || snapshot.brand.visualAnalysis?.status === 'complete' ? mergeBrandEnrichment(restoredBrand, snapshot.baseBrand ?? snapshot.brand, snapshot.brand, edited) : restoredBrand
  const step = saved?.step === 'studio' || saved?.step === 'create' && saved.activeId ? 'studio' : saved?.step === 'products' || saved?.step === 'create' ? saved.step : 'brand'
  return { exportSelections:savedExportSelections(saved?.exportSelections), ideaCollections:Array.isArray(saved?.ideaCollections)?saved.ideaCollections:[], bypassCache: saved?.bypassCache ?? false, flowId: saved?.flowId, cacheReceipts: savedCacheReceipts(saved?.cacheReceipts), generationRevisions: saved?.generationRevisions ?? {}, creative: creativeSchema.safeParse(saved?.creative).success ? creativeSchema.parse(saved?.creative) : emptyCreative(), compositions: saved?.compositions ?? {}, compositionFormats: saved?.compositionFormats ?? {}, snapshot, brand, selection, selections, direction: saved?.direction ?? '', format: saved?.format === 'story' ? 'story' : 'square', step, activeId: saved?.activeId ?? null, edited }
}
function refreshedDraft(previous: StoreSnapshot, next: StoreSnapshot, draft: BrandDraft): BrandDraft {
  const original = newBrand(previous), updated = newBrand(next)
  return Object.fromEntries(Object.entries(draft).map(([key, value]) => [key,
    JSON.stringify(value) === JSON.stringify(original[key as keyof BrandDraft]) ? updated[key as keyof BrandDraft] : value,
  ])) as BrandDraft
}

export function Studio({ initialStore, initialStep, initialPreview }: { initialStore?: string; initialStep?: StudioStep; initialPreview?: { snapshot: StoreSnapshot; generation: Generation; reviewCreative?: CreativeState } } = {}) {
  const reviewMode = !!initialPreview
  const reviewFlowId = initialPreview ? `review-${initialPreview.generation.id}` : undefined
  const previewKey = initialPreview ? `superpilot-studio-review-v1:${initialPreview.generation.id}` : null
  const previewBaseline = useRef<Workspace | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [view, setView] = useState<'home' | 'scan' | 'workspace'>('home')
  const [homeVisit, setHomeVisit] = useState(0)
  const [store, setStore] = useState('')
  const [stores, setStores] = useState<SavedStore[]>([])
  const [jobs, setJobs] = useState<Generation[]>([])
  const jobsRef = useRef<Generation[]>([])
  jobsRef.current = jobs
  const [error, setError] = useState('')
  const [checkingStore, setCheckingStore] = useState(false)
  const [freshCatalogPending, setFreshCatalogPending] = useState(false)
  const [scanFailed, setScanFailed] = useState(false)
  const [storageError, setStorageError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [agentBusy, setAgentBusy] = useState(false)
  const [directionResearch,setDirectionResearch]=useState<CreateResearchState>({status:'idle'})
  const [directionRefresh,setDirectionRefresh]=useState(0)
  const directionRequests=useRef(new Map<string,Promise<AdDirectionResult>>())
  const directionResults=useRef(new Map<string,AdDirectionResult>())
  const [operations, setOperations] = useState<AgentActivity['entries']>([])
  const [activity, setActivity] = useState<AgentActivity>(idleActivity)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(72)
  const menuRef = useRef<HTMLButtonElement>(null)
  const headerChatRef = useRef<HTMLButtonElement>(null)
  const navigationRef = useRef<WorkspaceNavigation | null>(null)
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false)
  const [sidebarTarget, setSidebarTarget] = useState<HTMLDivElement | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [sidebarResizing, setSidebarResizing] = useState(false)
  useEffect(() => { try { const saved = Number(localStorage.getItem('superpilot-sidebar-width-v1')); if (saved >= 288 && saved <= 560) setSidebarWidth(saved) } catch {} }, [])
  const changeSidebarWidth = (width: number) => { setSidebarWidth(width); try { localStorage.setItem('superpilot-sidebar-width-v1', String(width)) } catch {} }
  const [agentRequest, setAgentRequest] = useState<{ id: string; text: string; storeUrl: string; flowId?: string } | null>(null)
  const [exportRequest, setExportRequest] = useState(0)
  const [exportControls,setExportControls] = useState<ExportControls|null>(null)
  const receiveExportControls = useCallback((controls:ExportControls|null)=>setExportControls(controls), [])
  function selectExportOptions(artworkId:string, ids:string[]) {
    const current=working.current
    if(!current||current.activeId!==artworkId)return
    const valid=ids.filter(id=>current.creative.copyOptions?.some(option=>option.id===id))
    const next={...current,exportSelections:{...current.exportSelections,[artworkId]:[...new Set(valid)]}}
    const {snapshot,selection,selections,...rest}=next
    try { const saved={...rest,snapshotId:snapshot.id,selections:saveSelections(selections),productId:selection?.product.id,variantId:selection?.variant.id,image:selection?.image,imageUrls:selection?.imageUrls??null}; previewKey?localStorage.setItem(previewKey,JSON.stringify(saved)):writeWorkspace(snapshot.storeUrl,saved);setStorageError('') } catch { setStorageError('Could not save your export selection. Keep this tab open.') }
    working.current=next;setWorkspace(next)
  }
  const working = useRef<Workspace | null>(null)
  working.current = workspace
  const generationLock = useRef(false)
  const preparedSnapshotReads = useRef(new Set<string>())
  const researchSnapshotReads = useRef(new Set<string>())
  const [loadingMore, setLoadingMore] = useState(false)
  const [retryingPlacementId, setRetryingPlacementId] = useState<string | null>(null)
  const [fast, setFast] = useState(false)
  const [debug, setDebug] = useState(false)
  const [cacheEnabled, changeCache] = useCachePolicy()
  const [brandReplay, setBrandReplay] = useState<{ scanId: string; run: string; phase: 'blank' | 'basics' } | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [filters, setFilters] = useState<CatalogFilters>({ query: '', type: 'all', availability: 'all', sort: 'store' })
  const [aiResults, setAiResults] = useState<string[] | null>(null)
  const [resultNote, setResultNote] = useState('')
  const scanVersion = useRef(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const focusedScreen = useRef('')
  const reduced = useReducedMotion()
  const duration = fast || reduced ? 0.12 : 0.5
  const set = (patch: Partial<Workspace>) => setWorkspace(current => current ? { ...current, ...patch } : current)
  const refreshStores = useCallback(() => getSavedStores().then(setStores), [])
  const changeSidebar = useCallback((open: boolean) => {
    setSidebarOpen(open)
    try { localStorage.setItem(sidebarKey, String(open)) } catch {}
  }, [])
  useEffect(() => { try { setSidebarOpen(localStorage.getItem(sidebarKey) === 'true') } catch {} }, [])
  useEffect(() => {
    if (hydrated && !reviewMode) { try { localStorage.setItem(viewKey, view === 'home' ? 'home' : 'workspace') } catch {} }
  }, [view, hydrated, reviewMode])

  useEffect(() => {
    let alive = true
    if (!reviewMode) refreshStores().catch(() => { if (alive) setError('Saved work could not be loaded. Check the local server and reload.') })
    async function resume() {
      try {
        if (initialPreview && previewKey) {
          const { snapshot, generation } = initialPreview
          const creative = initialPreview.reviewCreative ?? (generation.compositionStatus === 'complete' ? generation.composition : undefined) ?? generation.input.creative ?? emptyCreative()
          if (!generation.input.creative) creative.layers.logo.visible = false
          const sourceProducts = generation.input.products ?? (generation.input.productId ? [{ productId: generation.input.productId, variantId: generation.input.variantId, images: generation.input.imageUrls ?? [generation.input.image] }] : [])
          const sourceSelections = sourceProducts.map(item => ({ productId:item.productId, variantId:item.variantId, image:item.images[0] ?? null, imageUrls:item.images,...('allVariants' in item && item.allVariants ? {allVariants:true} : {}) }))
          const baseline = restore(snapshot, { snapshotId: snapshot.id, selections: sourceSelections, productId: generation.input.productId, variantId: generation.input.variantId, image: generation.input.image, brand: generation.input.brand, direction: generation.input.direction, format: generation.input.format, step: 'studio', activeId: generation.id, creative, compositions: {}, compositionFormats: {}, edited: Object.fromEntries(Object.keys(generation.input.brand).filter(key => key !== 'fontResolution').map(key => [key, true])) })
          baseline.flowId = reviewFlowId
          previewBaseline.current = baseline
          let restored = baseline
          try {
            const saved = JSON.parse(localStorage.getItem(previewKey) ?? 'null') as Remembered | null
            if (saved?.snapshotId === snapshot.id && saved.productId === generation.input.productId && saved.variantId === generation.input.variantId) { restored = { ...restore(snapshot, saved), step: 'studio' }; const seed = initialPreview.reviewCreative ?? (generation.compositionStatus === 'complete' ? generation.composition : undefined); if (seed) restored = { ...restored, creative: mergeReviewComposition(restored.creative, seed, generation.input.creative) } }
          } catch { /* Use the genuine saved execution if this isolated draft cannot be read. */ }
          restored = { ...restored, flowId: reviewFlowId }
          if (alive) { setWorkspace(restored); setJobs([generation]); setStore(snapshot.storeUrl); setView('workspace') }
          return
        }
        if (initialStore) {
          const url = normalizeStoreUrl(initialStore)
          const result = await scan({ data: { storeUrl: url, refresh: !readCachePolicy(), bypassCache: !readCachePolicy() } })
          if (alive) { setOperations([{ id: `scan:${result.snapshot.id}`, kind: 'operation', label: result.cached ? 'Brand context' : 'Read store context', state: 'complete' }]); const restored = restore(result.snapshot, remembered(url)); setWorkspace({ ...restored, step: initialStep ?? restored.step }); setStore(url); setView('workspace') }
          return
        }
        if (localStorage.getItem(viewKey) === 'home') return
        const origin = localStorage.getItem(currentKey)
        const saved = origin ? remembered(origin) : null
        if (saved?.snapshotId) {
          const snapshot = await getSavedScan({ data: saved.snapshotId })
          if (alive) { setOperations([{ id: `cached:${snapshot.id}`, kind: 'operation', label: 'Brand context', state: 'complete' }]); setWorkspace(restore(snapshot, saved)); setStore(snapshot.storeUrl); setView(localStorage.getItem(viewKey) === 'home' ? 'home' : 'workspace'); setNotice('Your workspace is ready where you left it.') }
        }
      } catch { if (alive) setError('Your last workspace could not be restored. Open a saved store below; generated images remain on disk.') }
      finally { if (alive) setHydrated(true) }
    }
    void resume()
    return () => { alive = false }
  }, [refreshStores, initialStore, initialStep, initialPreview, previewKey, reviewMode, reviewFlowId])

  useEffect(() => {
    if (!workspace || !hydrated) return
    const { snapshot, selection, selections, ...rest } = workspace
    const saved: Remembered = { ...rest, selections: saveSelections(selections), snapshotId: snapshot.id, productId: selection?.product.id, variantId: selection?.variant.id, image: selection?.image, imageUrls: selection?.imageUrls ?? null }
    try {
      previewKey ? localStorage.setItem(previewKey, JSON.stringify(saved)) : writeWorkspace(snapshot.storeUrl, saved)
      if (!reviewMode) localStorage.setItem(currentKey, snapshot.storeUrl)
      setStorageError('')
    } catch { setStorageError('This browser could not save your edits. Keep this tab open. Scans and generated images are still saved on the server.') }
  }, [workspace, hydrated, previewKey, reviewMode])

  function automaticBrandPatch(current: Workspace, brand: BrandDraft) {
    if (JSON.stringify(brand) === JSON.stringify(current.brand)) return { brand, creative: current.creative, generationRevisions: current.generationRevisions }
    const revision = current.creative.revision + 1
    const pending = jobsRef.current.find(job => job.id === current.activeId)
    const canFollowResearch = pending && !current.cacheReceipts?.[pending.id] && current.selections.length === 0 && current.generationRevisions?.[pending.id] === current.creative.revision && (
      pending.status === 'queued' && !pending.prepared || Object.entries(brand).every(([field, value]) => current.edited[field as BrandField] || JSON.stringify(pending.input.brand[field as BrandField]) === JSON.stringify(value))
    )
    return { brand, creative: { ...current.creative, revision }, generationRevisions: canFollowResearch ? { ...current.generationRevisions, [pending!.id]: revision } : current.generationRevisions }
  }

  useEffect(() => {
    if (reviewMode || !workspace || workspace.brand.brandContext?.trim() || workspace.edited.brandContext) return
    const { id } = workspace.snapshot, flowId = workspace.flowId
    const key = `${flowId ?? 'legacy'}:${id}`
    if (researchSnapshotReads.current.has(key)) return
    researchSnapshotReads.current.add(key)
    let alive = true
    void getSavedScan({ data: id }).then(latest => {
      if (!alive) return
      setWorkspace(current => {
        if (!current || current.snapshot.id !== id || current.flowId !== flowId) return current
        const brand = mergeBrandEnrichment(current.brand, current.snapshot.baseBrand ?? current.snapshot.brand, latest.brand, current.edited)
        return { ...current, ...automaticBrandPatch(current, brand), snapshot: { ...current.snapshot, brand: latest.brand, enrichment: latest.enrichment } }
      })
    }).catch(() => { researchSnapshotReads.current.delete(key) })
    return () => { alive = false }
  }, [reviewMode, workspace?.snapshot.id, workspace?.flowId, workspace?.brand.brandContext, workspace?.edited.brandContext])

  function applyPrepared(job: Generation) {
    if (!job.prepared || !job.input.creative || job.compositionStatus === 'pending') return
    setWorkspace(current => {
      if (!current || current.activeId !== job.id) return current
      if (reviewMode && initialPreview?.generation.id === job.id && job.compositionStatus === 'complete' && job.composition) {
        const seed = initialPreview.reviewCreative ?? job.composition
        const creative = mergeReviewComposition(current.creative, seed, job.input.creative)
        if (JSON.stringify(creative) === JSON.stringify(current.creative)) return current
        return { ...current, creative, compositions: { ...current.compositions, [job.id]: creative } }
      }
      const {revision:_capturedRevision,...captured}=job.input.creative!
      const {revision:_displayRevision,...displayed}=current.creative
      const lateRecovery=job.placement?.status==='complete'&&job.composition&&job.input.flowId===current.flowId&&job.input.snapshotId===current.snapshot.id&&JSON.stringify(captured)===JSON.stringify(displayed)
      const revision = current.generationRevisions?.[job.id] ?? (lateRecovery ? current.creative.revision : undefined)
      if (revision === undefined || current.creative.revision !== revision) return current
      const placementRetry=current.placementRetries?.[job.id]
      const authorizedPlacement=placementRetry?.requestId===job.placement?.requestId&&placementRetry?.revision===revision&&job.storeUrl===current.snapshot.storeUrl
      const receipt = job.cacheReuse ?? current.cacheReceipts?.[job.id]
      if (receipt && !authorizedPlacement) {
        const stored = current.cacheReceipts?.[job.id]
        const flowId = current.flowId ?? null
        if (!stored || receipt.sourceGenerationId !== job.id || stored.sourceGenerationId !== job.id || receipt.flowId !== flowId || stored.flowId !== flowId || receipt.snapshotId !== current.snapshot.id || stored.snapshotId !== current.snapshot.id || receipt.requestId !== stored.requestId || receipt.creativeRevision !== stored.creativeRevision || (receipt.creativeRevision !== null && receipt.creativeRevision !== revision)) return current
      } else if (!authorizedPlacement && (current.snapshot.id !== job.input.snapshotId || current.flowId !== job.input.flowId)) return current
      const creative = { ...(job.compositionStatus === 'complete' && job.composition ? job.composition : job.input.creative!), revision: revision + 1 }
      const brand = { ...current.brand, ...Object.fromEntries(Object.entries(job.input.brand).filter(([field]) => !current.edited[field as BrandField])) }
      const generationRevisions = { ...current.generationRevisions }; delete generationRevisions[job.id]
      const placementRetries = { ...current.placementRetries }; delete placementRetries[job.id]
      return { ...current, brand, creative, generationRevisions, placementRetries, compositions: { ...current.compositions, [job.id]: creative } }
    })
  }

  const catalogSourceId = workspace?.snapshot.enrichment?.sourceScanId ?? workspace?.snapshot.id
  const catalogTotalStatus = workspace?.snapshot.catalog.totalCountStatus
  useEffect(() => {
    if (reviewMode || !workspace || view === 'home' || checkingStore || workspace.snapshot.catalog.totalCount !== undefined || catalogTotalStatus === 'unavailable') return
    let alive = true
    const { snapshot, flowId } = workspace
    void loadCatalogTotal({data:snapshot.id}).then(total => {
      if (!alive) return
      setWorkspace(current => !current || current.flowId !== flowId || (current.snapshot.enrichment?.sourceScanId ?? current.snapshot.id) !== catalogSourceId ? current : { ...current, snapshot: { ...current.snapshot, catalog: { ...current.snapshot.catalog, ...(total === null ? {} : {totalCount:total}), totalCountStatus: total === null ? 'unavailable' : 'ready' } } })
    }).catch(() => {})
    return () => { alive = false }
  }, [catalogSourceId, catalogTotalStatus, reviewMode, checkingStore, view === 'home'])

  const currentFlow = workspace?.flowId
  const origin = workspace?.snapshot.storeUrl
  useEffect(() => {
    if (!origin) { setJobs([]); return }
    let alive = true
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const current = working.current
        const flowId = current?.flowId ?? currentFlow
        const snapshotId = current?.snapshot.id
        const receipts = current?.cacheReceipts ?? {}
        const list = (await getGenerations({ data: origin })).flatMap(job => {
          if (reviewMode && job.id === initialPreview?.generation.id) return [job]
          const stored = receipts[job.id]
          const receipt = job.cacheReuse ?? stored
          if (receipt || stored) {
            if (!stored || !validCacheReceipt(receipt) || receipt.sourceGenerationId !== job.id || receipt.flowId !== (flowId ?? null) || receipt.snapshotId !== snapshotId || receipt.sourceGenerationId !== stored.sourceGenerationId || receipt.flowId !== stored.flowId || receipt.snapshotId !== stored.snapshotId || receipt.requestId !== stored.requestId || receipt.creativeRevision !== stored.creativeRevision) return []
            return [{ ...job, cacheReuse: stored }]
          }
          return job.input.flowId === flowId ? [job] : []
        })
        if (reviewMode && initialPreview && !list.some(job => job.id === initialPreview.generation.id)) list.push(initialPreview.generation)
        if (!alive || working.current?.flowId !== flowId || working.current?.snapshot.id !== snapshotId) return
        setJobs(list)
        for (const job of list) {
          if (job.prepared && job.id === working.current?.activeId && !preparedSnapshotReads.current.has(job.id)) {
            preparedSnapshotReads.current.add(job.id)
            try {
              const latest = await getSavedScan({ data: job.cacheReuse?.snapshotId ?? job.input.snapshotId })
              if (!alive) return
              setWorkspace(current => current?.snapshot.id === latest.id ? { ...current, snapshot: { ...current.snapshot, brand: latest.brand, baseBrand: latest.baseBrand, enrichment: latest.enrichment } } : current)
            } catch { preparedSnapshotReads.current.delete(job.id) }
          }
          applyPrepared(job)
        }
        // Output selection is explicit; polling must not attach another product's image.
      } catch { if (alive) setError('Could not check your saved images. Reconnecting automatically; your work remains saved.') }
      if (alive) timer = setTimeout(poll, 2500)
    }
    void poll()
    return () => { alive = false; clearTimeout(timer) }
  }, [origin, reviewMode, currentFlow, initialPreview])

  useEffect(() => {
    if (view !== 'scan') return
    setElapsed(0)
    const start = Date.now(), timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [view])

  function goHome() {
    setHomeVisit(value => value + 1)
    ++scanVersion.current
    changeCache(false)
    working.current = null
    setWorkspace(null); setJobs([]); setOperations([]); setActivity(idleActivity); setAgentBusy(false); setDirectionResearch({status:'idle'}); setAgentRequest(null); setStore('')
    setCheckingStore(false); setBrandReplay(null); setView('home'); setError('')
    try { localStorage.setItem(viewKey, 'home') } catch {}
    if (!reviewMode) void refreshStores().catch(() => {})
    window.scrollTo({ top: 0, behavior: reduced || fast ? 'instant' : 'smooth' })
  }
  function go(step: StudioStep) {
    set({ step }); setView('workspace'); setError('')
    window.scrollTo({ top: 0, behavior: reduced || fast ? 'instant' : 'smooth' })
  }
  async function openStore(url: string, refresh = false, propagateFailure = false, options?: StoreOpenOptions) {
    if (reviewMode) { setError('Exit saved review to scan another store.'); return }
    if (options?.bypassCache) changeCache(false)
    const bypassCache = options?.bypassCache === true || !readCachePolicy()
    const version = ++scanVersion.current
    setOperations([{ id: `scan:${version}`, kind: 'operation', label: 'Read store context', state: 'running' }])
    setFreshCatalogPending(options?.fresh === true || !working.current || working.current.snapshot.storeUrl !== url)
    setAgentRequest(null); setCheckingStore(true); setScanFailed(false); setStore(url); setError(''); setNotice(''); setAiResults(null); setFilters({ query: '', type: 'all', availability: 'all', sort: 'store' })
    try {
      let saved = options?.fresh ? null : options?.flowId ? remembered(url, options.flowId) : options?.fresh === false ? readLegacyWorkspace<Remembered>(url) ?? remembered(url) : remembered(url)
      if (options?.fresh === false && options.flowId && !saved) throw new Error('Saved workspace not found.')
      const restoringSession = options?.fresh === false || options?.resume === true
      const result = restoringSession && saved ? { snapshot: await getSavedScan({ data: saved.snapshotId }), cached: true } : await scan({ data: { storeUrl: url, refresh: refresh || bypassCache, bypassCache } })
      if (!result.snapshot.catalog.products.length) throw new Error('No usable products found in this catalog.')
      if (version !== scanVersion.current) { setOperations([]); return }
      setOperations([{ id: `scan:${version}`, kind: 'operation', label: restoringSession ? 'Open brand' : result.cached ? 'Brand context' : 'Read store context', state: 'complete' }])
      if (refresh && saved) {
        const previous = workspace?.snapshot.storeUrl === url ? workspace.snapshot : await getSavedScan({ data: saved.snapshotId })
        const edited = saved.edited ?? inferBrandEdits(previous.baseBrand ?? previous.brand, saved.brand)
        saved = { ...saved, brand: mergeBrandEnrichment(saved.brand, previous.baseBrand ?? previous.brand, result.snapshot.brand, edited), edited, step: 'brand' }
      }
      setWorkspace({ ...restore(result.snapshot, saved), flowId: options?.fresh ? options.flowId || crypto.randomUUID() : saved?.flowId, bypassCache: options?.fresh ? bypassCache : saved?.bypassCache ?? false, step: options?.fresh ? 'brand' : saved?.step ?? 'brand' }); setJobs([]); setView('workspace')
      setNotice(result.cached ? 'Your brand workspace is open.' : 'Store scanned and saved. Let’s make sure it feels like your brand.')
      await refreshStores()
    } catch (failure) {
      if (version !== scanVersion.current) return
      setOperations([{ id: `scan:${version}`, kind: 'operation', label: 'Read store context', state: 'error' }])
      setScanFailed(true)
      const message = userError(failure, 'catalog').message
      if (propagateFailure) throw new Error(message)
      setError(message)
    } finally { if (version === scanVersion.current) setCheckingStore(false) }
  }
  async function more() {
    if (reviewMode || !workspace || loadingMore) return
    const snapshot = workspace.snapshot, flowId = workspace.flowId
    setLoadingMore(true); setError('')
    try {
      const next = await loadMoreProducts({ data: snapshot.id })
      const current = working.current
      if (!current || current.snapshot.id !== snapshot.id || current.flowId !== flowId) return
      const updated = { ...current, snapshot: next }
      const { snapshot: savedSnapshot, selection, selections, ...rest } = updated
      // Save the exact expanded snapshot before exposing its count to the UI.
      try {
        writeWorkspace(savedSnapshot.storeUrl, { ...rest, selections: saveSelections(selections), snapshotId: savedSnapshot.id, productId: selection?.product.id, variantId: selection?.variant.id, image: selection?.image, imageUrls: selection?.imageUrls ?? null })
        setStorageError('')
      } catch { setStorageError('This browser could not save the expanded catalog. Keep this tab open; refreshing may show the previously saved count.') }
      working.current = updated
      setWorkspace(updated)
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not load more products. Try again.') }
    finally { setLoadingMore(false) }
  }
  async function makeImage(fresh: boolean, current = working.current, revisionPrompt?: string, reviewAuthorized = false) {
    if (reviewMode && !reviewAuthorized) throw new Error('Ask the agent to make an image change in saved review.')
    if (!current || generationLock.current) return
    const products = productReferences(current.selections)
    if (revisionPrompt && !jobs.some(job => job.id === current.activeId && job.status === 'complete' && generationProductIdentity(job.input) === generationProductIdentity({ productId: '', variantId: '', products }))) throw new Error('Choose a completed image of this product and variant to revise.')
    generationLock.current = true; setSubmitting(true); setError(''); set({ step: 'studio' })
    try {
      const requestId = crypto.randomUUID()
      const job = await generate({ data: { requestId, snapshotId: current.snapshot.id, flowId: current.flowId, bypassCache: !readCachePolicy(), products, productId: products[0]?.productId ?? '', variantId: products[0]?.variantId ?? '', image: products[0]?.images[0] ?? '', brand: current.brand, brandEdited: current.edited, direction: revisionPrompt ? JSON.stringify({ direction: current.direction, revision: revisionPrompt }) : current.direction, format: current.format, fresh: !readCachePolicy(), artworkOnly: true, creative: current.creative, sourceGenerationId: revisionPrompt ? current.activeId ?? undefined : undefined } })
      const receipt = job.cacheReuse
      const acceptedReceipt = receipt && validCacheReceipt(receipt) && receipt.sourceGenerationId === job.id && receipt.flowId === (current.flowId ?? null) && receipt.snapshotId === current.snapshot.id && receipt.requestId === requestId && (receipt.creativeRevision === null || receipt.creativeRevision === current.creative.revision) ? receipt : null
      if (receipt && !acceptedReceipt) throw new Error('The saved image did not match this workspace. Try again.')
      setWorkspace(value => value?.flowId === current.flowId && value?.snapshot.id === current.snapshot.id && JSON.stringify(productReferences(value.selections)) === JSON.stringify(products) && value.creative.revision === current.creative.revision ? { ...value, ...(acceptedReceipt ? { cacheReceipts: { ...value.cacheReceipts, [job.id]: acceptedReceipt } } : {}), activeId: job.id, generationRevisions: { ...value.generationRevisions, [job.id]: current.creative.revision }, compositions: { ...value.compositions, [job.id]: current.creative }, compositionFormats: { ...value.compositionFormats, [job.id]: current.format } } : value)
      if (working.current?.snapshot.storeUrl === current.snapshot.storeUrl && working.current?.flowId === current.flowId) setJobs(previous => [job, ...previous.filter(item => item.id !== job.id)])
      applyPrepared(job)
      if (job.status === 'failed') throw new Error(job.error || 'Image generation could not start.')
    } finally { generationLock.current = false; setSubmitting(false) }
  }
  async function retryPlacement() {
    const current=working.current, id=current?.activeId
    if(!current||!id||retryingPlacementId)return
    const scope={flowId:current.flowId,snapshotId:current.snapshot.id,revision:current.creative.revision}
    setRetryingPlacementId(id); setError('')
    try {
      const job=await retryComposition({data:id})
      const latest=working.current
      if(!latest||latest.flowId!==scope.flowId||latest.snapshot.id!==scope.snapshotId||latest.activeId!==id)return
      setWorkspace(value=>value&&value.flowId===scope.flowId&&value.snapshot.id===scope.snapshotId&&value.creative.revision===scope.revision?{...value,generationRevisions:{...value.generationRevisions,[id]:scope.revision},placementRetries:job.placement?{...value.placementRetries,[id]:{requestId:job.placement.requestId,revision:scope.revision}}:value.placementRetries}:value)
      setJobs(previous=>[job,...previous.filter(value=>value.id!==id)])
      applyPrepared(job)
    } catch(failure) { setError(userError(failure,'workspace').message) }
    finally { setRetryingPlacementId(null) }
  }
  function setProductCollection(selections: ProductSelection[], focusId?: string) {
    const current = working.current
    if (!current) return
    if (JSON.stringify(saveSelections(current.selections)) === JSON.stringify(saveSelections(selections))) return
    const selection = selections.find(item => item.product.id === focusId) ?? selections.find(item => item.product.id === current.selection?.product.id) ?? selections[0] ?? null
    const next: Workspace = { ...current, selections, selection, activeId: null, creative: { ...current.creative, revision: current.creative.revision + 1 } }
    working.current = next; setWorkspace(next)
    // Persist collection changes synchronously so an immediate refresh cannot race the effect.
    const { snapshot, selection: focused, selections: items, ...rest } = next
    try { previewKey ? localStorage.setItem(previewKey, JSON.stringify({ ...rest, selections: saveSelections(items), snapshotId: snapshot.id, productId: focused?.product.id, variantId: focused?.variant.id, image: focused?.image, imageUrls: focused?.imageUrls ?? null })) : writeWorkspace(snapshot.storeUrl, { ...rest, selections: saveSelections(items), snapshotId: snapshot.id, productId: focused?.product.id, variantId: focused?.variant.id, image: focused?.image, imageUrls: focused?.imageUrls ?? null }); setStorageError('') }
    catch { setStorageError('This browser could not save your context. Keep this tab open and try again.') }
  }
  function chooseProduct(selection: ProductSelection | null) {
    const current = working.current
    if (current) setProductCollection(selection ? upsertSelection(current.selections, selection) : [], selection?.product.id)
  }
  function removeProduct(productId: string) {
    const current = working.current
    if (current) setProductCollection(current.selections.filter(item => item.product.id !== productId))
  }
  async function studioActions(actions: StudioAction[], model?: string, reviewAuthorized = false) {
    const currentWorkspace = working.current
    if (!currentWorkspace) throw new Error('Choose a brand first.')
    let next: Workspace = currentWorkspace
    const effect = assertStudioEffects(actions)
    if (reviewMode && effect?.op === 'generate' && !reviewAuthorized) throw new Error('Ask the agent to make an image change in saved review.')
    // Validate and reduce the entire batch before applying anything.
    for (const action of actions) {
      if (action.op === 'select-output') {
        const job = jobs.find(job => job.id === action.id && generationProductIdentity(job.input) === generationProductIdentity({ productId: '', variantId: '', products: productReferences(next.selections) }))
        if (!job) throw new Error('Choose an image from the current product and variant.')
        const saved: CreativeState = next.compositions[job.id] ?? job.composition ?? job.input.creative ?? emptyCreative()
        next = { ...next, activeId: job.id, format: next.compositionFormats[job.id] ?? job.input.format, creative: { ...saved, revision: next.creative.revision } }
      }
      next = { ...next, creative: applyStudioAction(next.creative, action), ...(action.op === 'format' ? { format: action.format } : {}) }
    }
    if (effect?.op === 'export' && !jobs.some(job => job.id === next.activeId && job.status === 'complete')) throw new Error('Choose a completed image to export.')
    if (next.activeId) next = { ...next, compositions: { ...next.compositions, [next.activeId]: next.creative }, compositionFormats: { ...next.compositionFormats, [next.activeId]: next.format } }
    next = { ...next, step: effect?.op === 'generate' || effect?.op === 'export' || next.activeId && actions.some(action => action.op === 'select-output' || action.op === 'choose-copy' || action.op === 'focus-artwork') ? 'studio' : next.step, creative: model === creativeModel ? { ...next.creative, model } : next.creative }
    if (actions.length === 1 && actions[0].op === 'select-output' && next.activeId && jobs.some(job => job.id === next.activeId && (!job.prepared && ['queued', 'generating'].includes(job.status) || job.compositionStatus === 'pending'))) next = { ...next, generationRevisions: { ...next.generationRevisions, [next.activeId]: next.creative.revision } }
    working.current = next; setWorkspace(next); setView('workspace')
    if (effect?.op === 'generate') await makeImage(true, next, effect.revisionPrompt, reviewAuthorized)
    if (effect?.op === 'export') setExportRequest(Date.now())
  }
  function uiAction(action: StudioAction) {
    void studioActions([action]).catch(failure => setError(failure instanceof Error ? failure.message : 'That change could not be applied.'))
  }
  function quickProduct() {
    const product = workspace?.snapshot.catalog.products.find(p => p.images.length && p.variants.length && p.available)
      ?? workspace?.snapshot.catalog.products.find(p => p.images.length && p.variants.length)
    const variant = product?.variants.find(v => v.available) ?? product?.variants[0]
    if (product && variant) { chooseProduct({ product, variant, image: variant.image ?? product.images[0] }); setView('workspace') }
  }
  const step = workspace?.step ?? 'brand'
  const directionInput:AdDirectionRequest|null=workspace?{snapshotId:workspace.snapshot.id,brand:Object.fromEntries(Object.entries(workspace.brand).filter(([field])=>field in brandPatchSchema.shape)) as AdDirectionRequest['brand'],products:productReferences(workspace.selections),preferences:workspace.brand.direction,flowId:workspace.flowId,bypassCache:'bypassCache' in workspace&&workspace.bypassCache===true}:null
  const directionSourceId=workspace?.snapshot.enrichment?.sourceScanId??workspace?.snapshot.id
  const directionSignature=directionInput?JSON.stringify({...directionInput,snapshotId:directionSourceId}):''
  const directionBrandReady=!!workspace&&ideaBrandReady(workspace.brand,workspace.snapshot)
  function currentIdeaCollection() {
    const collections=working.current?.ideaCollections??[]
    return collections.find(item=>item.signature===directionSignature)??collections.find(item=>{
      try { return JSON.stringify({...JSON.parse(item.signature),snapshotId:directionSourceId})===directionSignature } catch { return false }
    })
  }
  function rememberIdeas(signature:string,collection:AdIdeaCollection){
    setWorkspace(current=>!current||JSON.stringify({sourceId:current.snapshot.enrichment?.sourceScanId??current.snapshot.id,flowId:current.flowId})!==JSON.stringify({sourceId:directionSourceId,flowId:directionInput?.flowId})?current:{...current,ideaCollections:[...(current.ideaCollections??[]).filter(item=>item.signature!==signature),collection]})
  }
  useEffect(()=>{
    if(view!=='workspace'||!directionSignature||reviewMode||checkingStore)return
    if(!directionBrandReady){
      const retained=currentIdeaCollection()
      setDirectionResearch(retained?.result.directions.length?{status:'loading',result:retained.result,revealed:retained.revealed,focusIndex:retained.focusIndex}:{status:'idle'})
      return
    }
    let alive=true
    const stored=currentIdeaCollection()
    const existing=stored?{...stored,signature:directionSignature}:undefined
    // Preserve current-session results from before append-only history was introduced.
    const previous=[...directionResults.current.entries()].filter(([key])=>key.startsWith(`${directionSignature}:`)).map(([,result])=>result).at(-1)
    const collection:AdIdeaCollection=existing??{signature:directionSignature,result:previous??{contextKey:'',directions:[],summary:'',cached:false},revealed:Math.min(2,previous?.directions.length??0)}
    if(collection.error){setDirectionResearch({status:'error',result:collection.result,revealed:collection.revealed,focusIndex:collection.focusIndex,error:collection.error});return}
    if(collection.result.directions.length&&!collection.pending){rememberIdeas(directionSignature,collection);setDirectionResearch({status:'ready',result:collection.result,revealed:collection.revealed,focusIndex:collection.focusIndex});return}
    const pending=collection.pending??{id:'initial',count:3 as const,refresh:false}
    const retained={...collection,pending}
    rememberIdeas(directionSignature,retained)
    const key=`${directionSignature}:${pending.id}`
    let request=directionRequests.current.get(key)
    if(!request){request=withIdeaDeadline(getAdDirections({data:{...directionInput!,...pending,requestId:pending.id,avoid:collection.result.directions.slice(-12).map(direction=>direction.title)}}).then(unwrapAdDirections));directionRequests.current.set(key,request);request.catch(()=>directionRequests.current.delete(key))}
    setDirectionResearch({status:'loading',result:collection.result,revealed:collection.revealed,focusIndex:collection.focusIndex})
    request.then(fresh=>{
      const complete=appendIdeas(retained,fresh)
      directionResults.current.set(key,complete.result)
      rememberIdeas(directionSignature,complete)
      if(alive)setDirectionResearch({status:'ready',result:complete.result,revealed:complete.revealed,focusIndex:complete.focusIndex})
    }).catch(error=>{const message=adDirectionError(error,userError(error,'workspace').message);rememberIdeas(directionSignature,{...retained,error:message});if(alive)setDirectionResearch({status:'error',result:collection.result,revealed:collection.revealed,focusIndex:collection.focusIndex,error:message})})
    return()=>{alive=false}
  },[view,directionSignature,directionRefresh,reviewMode,directionBrandReady,checkingStore])
  function moreDirections(){
    if(directionResearch.status==='loading')return
    const previous=currentIdeaCollection()
    if(!previous)return
    const revealed=revealIdeas(previous)
    rememberIdeas(directionSignature,{...revealed,error:undefined,pending:{id:crypto.randomUUID(),count:2,refresh:true}})
    setDirectionRefresh(value=>value+1)
  }
  function retryDirections(){const collection=currentIdeaCollection();if(collection)rememberIdeas(directionSignature,{...collection,error:undefined});setDirectionRefresh(value=>value+1)}
  function chooseDirection(id:string){
    const direction=directionResearch.result?.directions.find(direction=>direction.id===id)
    if(working.current?.creative.adDirectionId===id){uiAction({op:'brief',patch:{message:'',hook:'',headline:'',body:'',visual:''}});return}
    if(direction)uiAction({op:'ad-direction',id:direction.id,angle:direction.angle,hook:direction.headline,headline:direction.headline,subheading:direction.subheading??'',visual:direction.visual})
  }

  const replayReady = !!workspace && (!workspace.snapshot.enrichment || workspace.snapshot.enrichment.status === 'complete')
  const replaying = !!brandReplay && brandReplay.scanId === workspace?.snapshot.id && view === 'workspace' && step === 'brand'
  function replayBrand() {
    if (brandReplay) { setBrandReplay(null); return }
    if (!workspace || !replayReady) return
    go('brand'); setView('workspace')
    setBrandReplay({ scanId: workspace.snapshot.id, run: crypto.randomUUID(), phase: 'blank' })
  }
  useEffect(() => {
    if (!brandReplay) return
    if (!debug || brandReplay.scanId !== workspace?.snapshot.id || view !== 'workspace' || step !== 'brand') { setBrandReplay(null); return }
    const run = brandReplay.run
    const basics = setTimeout(() => setBrandReplay(current => current?.run === run ? { ...current, phase: 'basics' } : current), 600)
    const complete = setTimeout(() => setBrandReplay(current => current?.run === run ? null : current), 2400)
    return () => { clearTimeout(basics); clearTimeout(complete) }
  }, [brandReplay?.run, workspace?.snapshot.id, view, step, debug])
  const screenKey = view === 'scan' ? 'brand' : view === 'workspace' ? step : view
  const pendingJob = jobs.find(job => job.status === 'queued' || job.status === 'generating')
  const lastImage = jobs.find(job => job.status === 'complete')

  const sourceScanId = workspace?.snapshot.enrichment?.sourceScanId
  const enrichmentStatus = workspace?.snapshot.enrichment?.status
  useEffect(() => {
    if (reviewMode || !sourceScanId || !['queued', 'running'].includes(enrichmentStatus ?? '')) return
    let alive = true
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const latest = await getSavedScan({ data: sourceScanId })
        if (!alive) return
        setWorkspace(current => {
          if (!current || current.snapshot.enrichment?.sourceScanId !== sourceScanId) return current
          const brand = mergeBrandEnrichment(current.brand, current.snapshot.baseBrand ?? current.snapshot.brand, latest.brand, current.edited)
          return { ...current, ...automaticBrandPatch(current, brand), snapshot: { ...current.snapshot, brand: latest.brand, enrichment: latest.enrichment } }
        })
        if (latest.enrichment?.status === 'queued' || latest.enrichment?.status === 'running') timer = setTimeout(poll, 2000)
      } catch { if (alive) timer = setTimeout(poll, 4000) }
    }
    void poll()
    return () => { alive = false; clearTimeout(timer) }
  }, [sourceScanId, enrichmentStatus, reviewMode])

  async function agentAction(action: AgentAction, expectedFlowId?: string) {
    if (working.current?.flowId !== expectedFlowId) throw new Error('Your context changed. Return to the current chat and try again.')
    if (action.kind === 'scan-request' && typeof action.storeUrl === 'string') {
      await openStore(action.storeUrl)
      return
    }
    if (action.kind === 'brand-update') {
      const update = brandUpdateActionSchema.parse(action), current = working.current
      if (!current || update.snapshotId !== current.snapshot.id) throw new Error('Your context changed. Ask again with the current brand.')
      const patch = Object.fromEntries(Object.entries(update.patch).filter(([field]) => update.mode === 'edit' || !current.edited[field as BrandField]))
      if (update.patch.informationSections !== undefined && 'informationSections' in patch) patch.informationSections = mergeInformationSections(current.brand.informationSections, update.patch.informationSections)
      const brand = { ...current.brand, ...patch }
      const edited = update.mode === 'edit' ? Object.keys(patch).reduce((markers, field) => markBrandEdits(current.brand, brand, markers, field as BrandField), current.edited) : current.edited
      const next = { ...current, brand, edited, creative: { ...current.creative, revision: current.creative.revision + 1 } }
      working.current = next; setWorkspace(next); return
    }
    if(action.kind==='ad-directions'&&action.snapshotId===working.current?.snapshot.id&&Array.isArray(action.directions)){setDirectionResearch({status:'ready',result:action as unknown as AdDirectionResult});return}
    if (action.kind === 'studio-actions') {
      if (Array.isArray(action.actions) && !action.actions.length) return
      const batch = studioBatchSchema.parse(action), current = working.current
      if (!current) throw new Error('Choose a brand first.')
      assertStudioContext(batch, { snapshotId: current.snapshot.id, productId: current.selection?.product.id ?? '', revision: current.creative.revision })
      await studioActions(batch.actions, typeof action.model === 'string' ? action.model : undefined, reviewMode); return
    }
    if (action.kind === 'navigation' && typeof action.step === 'string') {
      if (action.step === 'store') goHome()
      else if (['brand', 'products', 'create', 'studio'].includes(action.step)) go(action.step as StudioStep)
      return
    }
    if (typeof action.snapshotId !== 'string') return
    const snapshot = await getSavedScan({ data: action.snapshotId })
    if (working.current?.flowId !== expectedFlowId) throw new Error('Your context changed. Return to the current chat and try again.')
    if (action.kind === 'store-scan') {
      setWorkspace(restore(snapshot, remembered(snapshot.storeUrl))); setStore(snapshot.storeUrl); setView('workspace'); await refreshStores(); return
    }
    if (snapshot.storeUrl !== workspace?.snapshot.storeUrl) return
    if (action.kind === 'product-results' && Array.isArray(action.productIds)) {
      setWorkspace(current => current?.snapshot.storeUrl === snapshot.storeUrl ? { ...current, snapshot, step: 'products' } : current)
      setAiResults(action.productIds.filter((id): id is string => typeof id === 'string'))
      setFilters({ query: '', type: 'all', availability: 'all', sort: 'store' })
      setResultNote(`${action.productIds.length} suggestions from ${Number(action.examined) || snapshot.catalog.products.length} examined products${action.complete === false ? '; catalog coverage is partial' : ''}.`)
      setView('workspace')
    }
    if ((action.kind === 'product-selection' || action.kind === 'product-removal') && typeof action.productId === 'string') {
      const current = working.current
      if (current?.snapshot.id !== snapshot.id) throw new Error('Your context changed. Ask again with the current products.')
      if (action.imageUrls !== undefined && action.imageUrls !== null && (!Array.isArray(action.imageUrls) || !action.imageUrls.every(url => typeof url === 'string'))) throw new Error('Choose valid product references.')
      const selections = applyProductAction(snapshot.catalog.products, current.selections, {
        productId: action.productId, variantId: typeof action.variantId === 'string' ? action.variantId : undefined,
        imageUrls: action.imageUrls as string[] | null | undefined, image: typeof action.image === 'string' ? action.image : undefined,
        allVariants: typeof action.allVariants === 'boolean' ? action.allVariants : undefined, preserveImageSelection: action.preserveImageSelection === true, preserveVariantSelection: action.preserveVariantSelection === true,
        remove: action.kind === 'product-removal',
      })
      setProductCollection(selections, action.productId); setView('workspace')
    }
  }
  const shownCatalog = workspace && aiResults ? { ...workspace.snapshot.catalog, products: workspace.snapshot.catalog.products.filter(p => aiResults.includes(p.id)), hasMore: false } : workspace?.snapshot.catalog
  const icons = { brand: IconPalette, products: IconPackage, create: IconBulb, studio: IconPhoto }
  function updateBrand(brand: BrandDraft, field?: BrandField) {
    setWorkspace(current => {
      if (!current || current.snapshot.storeUrl !== workspace?.snapshot.storeUrl) return current
      const next = field ? { ...current.brand, [field]: brand[field] } : brand
      const { fontResolution: beforeResolution, ...beforeIntent } = current.brand
      const { fontResolution: afterResolution, ...afterIntent } = next
      const metadataOnly = field === undefined && JSON.stringify(beforeIntent) === JSON.stringify(afterIntent)
      return { ...current, creative: metadataOnly ? current.creative : { ...current.creative, revision: current.creative.revision + 1 }, brand: next, edited: markBrandEdits(current.brand, next, current.edited, field) }
    })
  }
  function addReferences(urls: string[]) {
    const current = working.current
    if (!current || view !== 'workspace') throw new Error('Choose a store before adding reference images.')
    const visualReferences = [...new Set([...(current.brand.visualReferences ?? []), ...urls.map(url => brandReferenceSchema.parse(url))])]
    const brand = { ...current.brand, visualReferences }
    const next = { ...current, brand, edited: markBrandEdits(current.brand, brand, current.edited, 'visualReferences'), creative: { ...current.creative, revision: current.creative.revision + 1 } }
    const { snapshot, selection, selections, ...rest } = next
    // A failed chat send must not discard successfully uploaded context.
    previewKey ? localStorage.setItem(previewKey, JSON.stringify({ ...rest, selections: saveSelections(selections), snapshotId: snapshot.id, productId: selection?.product.id, variantId: selection?.variant.id, image: selection?.image, imageUrls: selection?.imageUrls ?? null })) : writeWorkspace(snapshot.storeUrl, { ...rest, selections: saveSelections(selections), snapshotId: snapshot.id, productId: selection?.product.id, variantId: selection?.variant.id, image: selection?.image, imageUrls: selection?.imageUrls ?? null })
    working.current = next; setWorkspace(next)
    return { brandDraft: brand, creative: next.creative, contextRevision: next.creative.revision }
  }
  const operationEntries: AgentActivity['entries'] = [...operations,...researchActivity(workspace?.snapshot.enrichment)]
  if(directionResearch.status==='loading')operationEntries.push({id:'ad-directions',kind:'operation',label:'Develop ad directions',state:'running'})
  else if(directionResearch.status==='ready')operationEntries.push({id:'ad-directions',kind:'operation',label:'Develop ad directions',detail:directionResearch.result?.summary,state:'complete'})
  else if(directionResearch.status==='error')operationEntries.push({id:'ad-directions',kind:'operation',label:'Develop ad directions',detail:directionResearch.error,state:'error'})
  operationEntries.push(...jobs.filter(job => ['queued', 'generating'].includes(job.status) || job.id === workspace?.activeId).map(job => ({ id: `generation:${job.id}`, kind: 'operation' as const, label: job.prepared ? 'Create image' : job.preparation?.message || 'Prepare ad context', state: job.status === 'complete' ? 'complete' as const : job.status === 'failed' || job.status === 'interrupted' ? 'error' as const : job.status === 'generating' ? 'running' as const : 'pending' as const })))
  operationEntries.push(...jobs.filter(job => job.status === 'complete' && job.id === workspace?.activeId && job.compositionStatus).map(job => ({ id: `composition:${job.id}`, kind: 'operation' as const, label: job.placement?.message || 'Place ad text', state: job.compositionStatus === 'pending' ? 'pending' as const : job.compositionStatus === 'complete' ? 'complete' as const : 'error' as const })))
  const showCard = view === 'scan' || view === 'workspace' && step === 'brand'
  const hasProgress = !!workspace || stores.length > 0 || view === 'scan' || activity.hasProgress
  const sidebarVisible = view === 'home' ? sidebarOpen : chatSidebarOpen && hasProgress
  const loadedProductCount = checkingStore && freshCatalogPending ? 0 : new Set(workspace?.snapshot.catalog.products.map(product => product.id) ?? []).size
  const catalogTotal = checkingStore && freshCatalogPending ? 0 : workspace?.snapshot.catalog.totalCount ?? (workspace?.snapshot.catalog.hasMore ? null : loadedProductCount)
  const catalogCountLabel = catalogTotal ?? (catalogTotalStatus === 'unavailable' ? `${loadedProductCount}+` : '…')
  const activeArtwork = jobs.find(job=>job.id===workspace?.activeId)
  const artworkIdeaId = activeArtwork?.input.creative?.adDirectionId ?? workspace?.creative.adDirectionId
  const artworkIdea = workspace?.ideaCollections?.flatMap(collection=>collection.result.directions).find(direction=>direction.id===artworkIdeaId)
  return <MotionConfig reducedMotion="user"><LayoutGroup><div className="studio-shell min-h-svh bg-transparent" data-sidebar-open={sidebarVisible} data-sidebar-resizing={sidebarResizing} style={{ '--studio-sidebar-width': `${sidebarWidth}px` } as CSSProperties}>
    <AppHeader sidebar={<StudioSidebar width={sidebarWidth} onWidthChange={changeSidebarWidth} onResizingChange={setSidebarResizing} open={sidebarVisible} onOpenChange={changeSidebar} headerHeight={headerHeight} menuRef={menuRef} onMount={setSidebarTarget}>{view === 'home' ? <SavedWorkspaceList onProject={project => { changeSidebar(false); navigationRef.current?.selectProject(project) }} /> : null}</StudioSidebar>} sidebarSettings={<ThemeToggle currentStoreUrl={workspace?.snapshot.storeUrl} onProject={project => navigationRef.current?.selectProject(project)} onNewConversation={() => navigationRef.current?.newConversation()} />} actions={view === 'home' ? <ThemeSwitch /> : undefined} onHome={goHome} hasProgress={hasProgress || view === 'home'} sidebarOpen={sidebarVisible} active={activity.active} onSidebarToggle={() => changeSidebar(!sidebarOpen)} menuRef={menuRef} onHeightChange={setHeaderHeight}><AnimatePresence initial={false}>{view !== 'home' ? <motion.nav key="workspace-nav" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: reduced ? 0 : .2 }} aria-label="Workspace steps" className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex items-center gap-4">{steps.filter(item => item.id === 'brand' || item.id === 'products').map(item => {
        const Icon = icons[item.id]
        return <div key={item.id} className="flex items-center"><Button variant={view === 'workspace' && step === item.id ? 'secondary' : 'ghost'} size="sm" disabled={!workspace || checkingStore} aria-current={view === 'workspace' && step === item.id ? 'step' : undefined} onClick={() => go(item.id)}><Icon aria-hidden="true" />{item.label}{item.id === 'products' ? <Badge variant="secondary" className="min-w-7 px-1.5 py-0 text-[10px] tabular-nums" aria-label={catalogTotal === null ? `${loadedProductCount} products loaded, total ${catalogTotalStatus === 'unavailable' ? 'unavailable' : 'being counted'}` : `${catalogTotal} products`} aria-live="polite"><AnimatePresence initial={false} mode="popLayout"><motion.span key={catalogCountLabel} className="block" initial={{opacity:0,y:reduced?0:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced?0:-5}} transition={{duration:reduced?0:.2}}>{catalogCountLabel}</motion.span></AnimatePresence></Badge> : null}</Button>{item.id === 'brand' ? <HeaderProjectMenu currentStoreUrl={workspace?.snapshot.storeUrl} onProject={project => navigationRef.current?.selectProject(project)} /> : null}</div>
      })}</div>
      <div className="ml-auto flex items-center gap-4">{steps.filter(item => item.id === 'create' || item.id === 'studio').map(item => {
        const Icon = icons[item.id]
        return <Button key={item.id} variant={view === 'workspace' && step === item.id ? 'secondary' : 'ghost'} size="sm" disabled={!workspace || checkingStore || item.id === 'create' && !directionBrandReady || item.id === 'studio' && !workspace.activeId && !jobs.length} aria-current={view === 'workspace' && step === item.id ? 'step' : undefined} onClick={() => go(item.id)}><Icon aria-hidden="true" />{item.label}</Button>
      })}<ThemeSwitch /></div>
    </motion.nav> : null}</AnimatePresence></AppHeader>
    <div className="sidebar-region-motion ml-[var(--studio-sidebar-offset)] transition-[margin] duration-200 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"><main className="mx-auto max-w-7xl px-5 pt-3 sm:px-8">
      <h1 className="sr-only">superpilot workspace</h1>
      {error || storageError ? <ErrorNotice className="mx-auto mb-4 max-w-lg" error={error || storageError} context={!error ? 'storage' : scanFailed ? 'catalog' : 'workspace'} onRetry={scanFailed ? () => openStore(store, true) : undefined} onDismiss={() => { setError(''); setStorageError(''); setScanFailed(false) }} /> : null}
      {reviewMode ? <div className="mb-4 flex justify-end gap-1"><Button variant="outline" size="sm" onClick={() => { if (previewBaseline.current) { const baseline = structuredClone(previewBaseline.current); baseline.creative = { ...baseline.creative, revision: (working.current?.creative.revision ?? baseline.creative.revision) + 1 }; working.current = baseline; setWorkspace(baseline); setView('workspace'); setError(''); setExportRequest(0) } }}>Reset review</Button><Button variant="ghost" size="sm" asChild><a href="/">Exit review</a></Button></div> : null}
      <AgentWorkspace composerExport={view === 'workspace' && step === 'studio' ? exportControls ?? undefined : undefined} contextReady={directionBrandReady && !checkingStore} composerGenerate={workspace && view === 'workspace' && (step === 'create' || step === 'studio' && (!workspace.activeId || jobs.some(job => job.id === workspace.activeId && ['failed', 'interrupted'].includes(job.status)))) ? { format: workspace.format, busy: submitting, disabled: reviewMode || checkingStore || agentBusy || !directionBrandReady, onGenerate: () => uiAction({ op: 'generate' }), onFormat: format => uiAction({ op: 'format', format }) } : undefined} onOpenConversation={() => changeSidebar(true)} sidebarRequested={sidebarOpen && hasProgress} sidebarTarget={sidebarTarget} navigationRef={navigationRef} headerChatRef={headerChatRef} onChatSidebarChange={setChatSidebarOpen} centeredContent={showCard} headerHeight={headerHeight} onCreate={workspace && !checkingStore && step !== 'create' && step !== 'studio' ? () => go('create') : undefined} onReferences={addReferences} operationEntries={view === 'home' && !checkingStore ? [] : operationEntries} reviewMode={reviewMode} request={agentRequest} onBusyChange={setAgentBusy} onActivityChange={setActivity}
        context={{ adDirections:directionResearch.result?.directions, adDirectionSelected:workspace?.creative.adDirectionId, reviewId: initialPreview?.generation.id, reviewMode, view, homeVisit, checkingStore, flowId: workspace?.flowId, bypassCache: !cacheEnabled, step, snapshotId: workspace?.snapshot.id, storeUrl: workspace?.snapshot.storeUrl, brandDraft: workspace?.brand, brandResearch: workspace?.snapshot.brand.researchStatus, brandSources: workspace?.snapshot.brand.researchSources, enrichment: workspace?.snapshot.enrichment, creative: workspace?.creative, format: workspace?.format, activeOutputId: workspace?.activeId, outputs: jobs.filter(job => generationProductIdentity(job.input) === generationProductIdentity({ productId: '', variantId: '', products: workspace ? productReferences(workspace.selections) : [] })).map(job => ({ id: job.id, status: job.status, variantId: job.input.variantId })), selectedProducts: workspace?.selections.map(item => ({ id: item.product.id, title: item.product.title, description: item.product.description, variantId: item.variant.id, variantTitle: item.allVariants ? 'All variants' : item.variant.title, allVariants: item.allVariants === true, image: item.image, imageUrls: item.imageUrls ?? null, includedImages: selectionImages(item), availableImages: productImages(item.product), variants: item.product.variants })), products: workspace ? productReferences(workspace.selections) : [], contextRevision: workspace?.creative.revision, selectionRule: 'Use all collected products and only their includedImages. availableImages are choices, not selected references. Do not substitute or omit items without asking.', selectedProduct: workspace?.selection ? { id: workspace.selection.product.id, title: workspace.selection.product.title, description: workspace.selection.product.description, variantId: workspace.selection.variant.id, allVariants: workspace.selection.allVariants === true, image: workspace.selection.image, imageUrls: workspace.selection.imageUrls ?? null, includedImages: selectionImages(workspace.selection), availableImages: productImages(workspace.selection.product), variants: workspace.selection.product.variants.map(({ id, title, image }) => ({ id, title, image })) } : null }}
        catalog={workspace?.snapshot.catalog} brandName={workspace?.brand.name}
        dock={workspace && view === 'workspace' ? <div className="flex min-w-0 max-w-full flex-wrap items-end gap-2">{!showCard ? <BrandDock snapshot={workspace.snapshot} draft={workspace.brand} onChange={updateBrand} /> : null}<ProductDiscoveryChip key={workspace.flowId ?? workspace.snapshot.storeUrl} count={loadedProductCount} discovering={checkingStore || loadingMore} announce={operations.some(entry => entry.label === 'Read store context' && entry.state === 'complete')} selectedCount={workspace.selections.length} hidden={step === 'products'} catalog={workspace.snapshot.catalog} onProduct={productId => { void agentAction({kind:'product-selection',snapshotId:workspace.snapshot.id,productId,preserveImageSelection:true},workspace.flowId).catch(() => setError('Could not select this product. Try again.')) }} /><ProductContexts catalog={workspace.snapshot.catalog} onClear={() => chooseProduct(null)} selections={workspace.selections} onSelect={chooseProduct} onRemove={removeProduct} /></div> : undefined}
        filters={filters} onFilters={value => { setFilters(value); if (workspace) go('products') }} onAction={action => agentAction(action, workspace?.flowId)} onStore={(url, options?: StoreOpenOptions) => openStore(url, false, true, { ...options, fresh: options?.fresh ?? (options?.resume !== undefined ? !options.resume : view === 'home') })} onSearch={query => { setAiResults(null); setFilters(current => ({ ...current, query })); if (workspace) go('products') }} disabled={!hydrated || checkingStore || view === 'scan'}>
        <AnimatePresence mode="wait" initial={false}><motion.div key={screenKey} inert={checkingStore} initial={{ opacity: 0, y: reduced || fast ? 0 : 10, filter: reduced ? 'none' : 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: reduced ? 'none' : 'blur(0px)' }} exit={{ opacity: 0, y: reduced || fast ? 0 : 10, filter: reduced ? 'none' : 'blur(10px)' }} transition={{ duration, ease: [.25, .1, .25, 1] }}>
          {view === 'home' ? <div aria-label="Start workspace" /> : showCard ? <div inert={replaying} aria-label={replaying ? 'Brand preview' : undefined}><StudioBrand snapshot={view === 'scan' || replaying && brandReplay?.phase === 'blank' ? null : workspace?.snapshot} draft={view === 'scan' || replaying && brandReplay?.phase === 'blank' ? null : replaying && workspace ? { ...workspace.brand, colors: [], headingFont: '', bodyFont: '' } : workspace?.brand} sourceUrl={store} pending={view === 'scan' || replaying} onChange={replaying ? undefined : updateBrand} /></div> : workspace ? <>
            {step === 'products' ? <>
              {aiResults ? <div className="mb-3 flex items-center justify-between gap-3 text-sm"><span>{resultNote}</span><Button variant="ghost" size="sm" onClick={() => setAiResults(null)}>All products</Button></div> : null}
              <ProductPicker embedded hideControls pageActions={sidebarVisible ? <ProductFilters side="bottom" catalog={workspace.snapshot.catalog} filters={filters} onChange={setFilters} onSearch={query => { setAiResults(null); setFilters(current => ({...current, query})) }} /> : undefined} catalog={shownCatalog!} store={workspace.snapshot.storeUrl} filters={filters} onFiltersChange={setFilters} scopeNote={aiResults ? resultNote : undefined} loadingMore={loadingMore} selections={workspace.selections} onRemove={removeProduct} onLoadMore={() => void more()} onSelect={chooseProduct} onClearSelection={() => chooseProduct(null)} />
            </> : <StudioCreate onIdeas={() => go('create')} selectedExportIds={workspace.exportSelections?.[workspace.activeId ?? ''] ?? []} onExportSelection={selectExportOptions} onExportControls={receiveExportControls} composerFloating={!sidebarOpen} ideaTitle={artworkIdea?.title} ideaDescription={artworkIdea?.angle} stage={step === 'studio' ? 'studio' : 'idea'} researchSources={[...new Map([{url:workspace.snapshot.brand.sourceUrl,title:'Storefront'},...(workspace.snapshot.brand.researchSources??[])].map(source=>[source.url,source])).values()]} research={directionResearch} activity={activity} onChooseDirection={chooseDirection} onRetryDirections={retryDirections} onMoreDirections={moreDirections} inferenceDisabled={reviewMode} creative={workspace.creative} onAction={uiAction} onRequest={text => { if (!reviewMode) setAgentRequest({ id: crypto.randomUUID(), text, storeUrl: workspace.snapshot.storeUrl, flowId: workspace.flowId }) }} storeUrl={workspace.snapshot.storeUrl} exportRequest={exportRequest} onExported={() => setExportRequest(0)} selection={workspace.selection} selections={workspace.selections} brand={workspace.brand} format={workspace.format} jobs={jobs.filter(job => generationProductIdentity(job.input) === generationProductIdentity({ productId: '', variantId: '', products: productReferences(workspace.selections) }))} activeId={workspace.activeId} submitting={submitting} onFormat={format => uiAction({ op: 'format', format })} onGenerate={() => uiAction({ op: 'generate' })} onSelectVersion={id => uiAction({ op: 'select-output', id })} onBrand={() => go('brand')} onProduct={() => go('products')} />}
          </> : null}
        </motion.div></AnimatePresence>
      </AgentWorkspace>
    </main></div>
  </div></LayoutGroup></MotionConfig>
}
