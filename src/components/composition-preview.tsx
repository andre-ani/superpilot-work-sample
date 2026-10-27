import { useEffect, useRef, useState } from 'react'
import { IconX, IconPlus, IconDownload, IconArrowsMaximize, IconCheck } from '@tabler/icons-react'
import { useBrandFonts } from '@/components/use-brand-fonts'
import { ArtworkAction } from '@/components/artwork-action'
import { Button, selectionCardSurface } from '@/components/ui/button'
import { generationImageUrl, type BrandDraft } from '@/lib/studio'
import type { CreativeState, StudioAction } from '@/lib/creative'
import { foregroundGeometry, type ForegroundGeometry } from '@/lib/foreground-geometry'
import { compositionLogo } from '@/lib/composition-functions'
import { drawComposition, downloadComposition, loadCompositionImage } from '@/lib/composition'

const logoCache = new Map<string, Promise<string>>()
const imageCache = new Map<string, Promise<HTMLImageElement>>()
function cachedImage(url: string) {
  let image = imageCache.get(url)
  if (!image) { image = loadCompositionImage(url); imageCache.set(url, image); image.catch(() => imageCache.delete(url)) }
  return image
}

const geometryCache = new Map<string, Promise<ForegroundGeometry>>()
function cachedGeometry(state: CreativeState) {
  const mask=state.imageAnalysis?.foregroundMask
  if(!mask)return undefined
  const key=JSON.stringify([mask,state.imageAnalysis?.protectedAreas])
  let geometry=geometryCache.get(key)
  if(!geometry){
    geometry=(async()=>{
      const image=await cachedImage(mask.maskUrl),canvas=document.createElement('canvas')
      canvas.width=image.naturalWidth;canvas.height=image.naturalHeight
      const ctx=canvas.getContext('2d')
      if(!ctx)throw new Error('Foreground geometry could not be loaded.')
      ctx.drawImage(image,0,0)
      const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data
      const raw=Uint8Array.from({length:canvas.width*canvas.height},(_,i)=>rgba[i*4])
      return foregroundGeometry(raw,canvas.width,canvas.height,state.imageAnalysis?.protectedAreas,mask.paddingPercent)
    })()
    geometryCache.set(key,geometry);geometry.catch(()=>geometryCache.delete(key))
  }
  return geometry
}
export function focusComposer() {
  document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message superpilot"]')?.focus()
}
export function CompositionPreview({ id, state, brand, storeUrl, format, exportRequest = 0, onExported, selected = false, onSelect, onAction, label, onReady, onError, onCanvasReady, onView, onToggleSelection, onExport, readOnly = false }: {
  id: string; state: CreativeState; brand: BrandDraft; storeUrl: string; format: 'square' | 'story'; exportRequest?: number; onExported?: () => void
  onCanvasReady?: (artworkId:string,optionId:string,canvas:HTMLCanvasElement|null)=>void; onView?:()=>void; onToggleSelection?:()=>void; onExport?:()=>void;
  readOnly?: boolean; onReady?: () => void; onError?: (message: string) => void; selected?: boolean; onSelect?: () => void; onAction?: (action: StudioAction) => void; label: string
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const handledExport = useRef(0)
  const [readyKey, setReadyKey] = useState(''), [error, setError] = useState('')
  const fonts = useBrandFonts(storeUrl, brand.headingFont, brand.bodyFont)
  const heading = fonts.heading?.fontFamily?.replace('var(--font-sans)', 'sans-serif'), body = fonts.body?.fontFamily?.replace('var(--font-sans)', 'sans-serif')
  const renderKey = JSON.stringify([id, state, brand.logoUrl, format, heading, body, fonts.heading?.fontWeight, fonts.body?.fontWeight])
  const ready = readyKey === renderKey
  useEffect(() => { if (ready) onReady?.() }, [ready, onReady])
  useEffect(() => {
    const optionId=state.selectedCopy ?? ''
    onCanvasReady?.(id,optionId,ready ? canvas.current : null)
    return () => onCanvasReady?.(id,optionId,null)
  }, [id,state.selectedCopy,ready,onCanvasReady])
  useEffect(() => {
    let alive = true
    setReadyKey(''); setError('')
    async function render() {
      const image = await cachedImage(generationImageUrl(id))
      let logo: HTMLImageElement | null = null
      if (state.layers.logo.visible && brand.logoUrl) {
        let source = logoCache.get(brand.logoUrl)
        if (!source) { source = compositionLogo({ data: brand.logoUrl }); logoCache.set(brand.logoUrl, source); source.catch(() => logoCache.delete(brand.logoUrl)) }
        logo = await cachedImage(await source)
      }
      const foreground=await cachedGeometry(state)
      if (!alive || !canvas.current) return
      drawComposition(canvas.current, image, logo, state, format, { heading, body, headingWeight: fonts.heading?.fontWeight, bodyWeight: fonts.body?.fontWeight }, { foreground }); setReadyKey(renderKey)
    }
    void render().catch(failure => { if (alive) { const message = failure instanceof Error ? failure.message : 'Could not render this composition.'; setError(message); onError?.(message) } })
    return () => { alive = false }
  }, [id, brand.logoUrl, format, heading, body, renderKey])
  useEffect(() => {
    if (!exportRequest || handledExport.current === exportRequest || !ready || !canvas.current) return
    handledExport.current = exportRequest
    void downloadComposition(canvas.current).catch(failure => setError(failure instanceof Error ? failure.message : 'Export failed.')).finally(() => onExported?.())
  }, [exportRequest, ready, onExported])
  return <article className="group group/artwork group/selection-card min-w-0 space-y-2" aria-label={label}>
    <div className={readOnly ? 'relative rounded-xl' : `relative ${selectionCardSurface}`} data-selected={!readOnly && selected}>
      <canvas ref={canvas} aria-label={`${label}: ${state.brief.headline}`} className="block h-auto w-full rounded-xl" style={{ aspectRatio: format === 'story' ? '9/16' : '1' }} />
      {!readOnly ? <Button variant="ghost" className="absolute inset-0 z-[1] h-full w-full rounded-xl bg-transparent p-0 hover:bg-transparent" aria-label={`${selected ? 'Remove' : 'Include'} ${label} ${selected ? 'from' : 'in'} export`} aria-pressed={selected} onClick={onToggleSelection ?? onSelect} /> : null}
      {!readOnly ? <div className="absolute right-2 top-2 z-[4] flex flex-col items-end gap-1"><ArtworkAction revealLabel label={selected ? 'Included in export' : 'Add to export'} hoverLabel={selected ? 'Remove from export' : undefined} hoverIcon={selected ? <IconX /> : undefined} variant={selected ? 'context-selected' : 'context-add'} aria-pressed={selected} onClick={onToggleSelection ?? onSelect}>{selected ? <IconCheck /> : <IconPlus />}</ArtworkAction>{onExport ? <ArtworkAction label="Export" disabled={!ready} onClick={onExport}><IconDownload /></ArtworkAction> : null}{onView ? <ArtworkAction label="View" variant="secondary" disabled={!ready} onClick={onView}><IconArrowsMaximize /></ArtworkAction> : null}</div> : null}

    </div>

    {error && !onError ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
  </article>
}
