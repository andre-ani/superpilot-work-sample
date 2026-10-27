import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { CreateIntent, type CreateResearchState } from '@/components/create-intent'
import type { AgentActivity } from '@/lib/agent-activity'
import { CompositionPreview, focusComposer } from '@/components/composition-preview'
import { copyVariationState, type CreativeState, type StudioAction } from '@/lib/creative'
import { IconPhoto, IconDownload, IconArrowsMaximize, IconCheck, IconX, IconArrowLeft, IconArrowRight } from '@tabler/icons-react'
import { ArtworkAction } from '@/components/artwork-action'
import { Button, selectionCardSurface } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { ExportActions, type ExportControls } from '@/components/export-actions'
import { canvasPng, downloadFile, imageArchive } from '@/lib/export-files'
import { generationProgress } from '@/lib/generation-progress'
import type { ProductSelection } from '@/components/product-details'
import { generationImageUrl, type BrandDraft, type Generation } from '@/lib/studio'

export function StudioCreate({ selectedExportIds = [], onExportSelection, onExportControls, composerFloating = true, ideaTitle, ideaDescription, stage = 'studio', research, activity, onChooseDirection, onRetryDirections, onMoreDirections, selections = [], onProduct, inferenceDisabled = false, creative, onAction, storeUrl, exportRequest, onExported, brand, format, jobs, activeId, submitting, onGenerate, onSelectVersion, onIdeas, onFormat, onRetryPlacement, retryingPlacement = false, researchSources=[] }: {
  ideaDescription?:string; ideaTitle?:string; selectedExportIds?: string[]; onExportSelection?: (artworkId:string,ids:string[])=>void; onExportControls?: (controls:ExportControls|null)=>void; composerFloating?: boolean;
  onRetryPlacement?: () => void; retryingPlacement?: boolean; stage?: 'idea' | 'studio'; researchSources?:{url:string;title:string}[];research:CreateResearchState; activity:AgentActivity; onChooseDirection:(id:string)=>void; onRetryDirections:()=>void;onMoreDirections:()=>void
  inferenceDisabled?: boolean; creative: CreativeState; onAction: (action: StudioAction) => void; onRequest: (message: string) => void; storeUrl: string; exportRequest: number; onExported: () => void
  selection?: ProductSelection | null; selections?: ProductSelection[]; brand: BrandDraft; format: 'square' | 'story'; jobs: Generation[]; activeId: string | null; submitting: boolean
  onIdeas: () => void; onFormat: (format: 'square' | 'story') => void; onGenerate: (fresh: boolean) => void; onSelectVersion: (id: string) => void; onBrand: () => void; onProduct: () => void
}) {
  const active=jobs.find(job=>job.id===activeId)
  const progress=generationProgress(active,submitting)
  const starting=submitting&&!['queued','generating'].includes(active?.status??'')
  const hasArtwork=!!active?.images.length&&!starting
  const options=creative.copyOptions??[]
  const selectedOption=options.find(option=>option.id===creative.selectedCopy)
  const placementPending=!starting&&active?.compositionStatus==='pending'
  const placementUnavailable=!starting&&active?.compositionStatus==='unavailable'
  const previewFormat=active&&!starting?active.input.format:format
  const [reviewed, setReviewed] = useState<{artworkId:string;optionId:string}|null>(null)
  const [reviewReady, setReviewReady] = useState(false)
  const [baseOpen, setBaseOpen] = useState(false)
  const [exportBusy, setExportBusy] = useState(false), [exportError, setExportError] = useState('')
  const canvases = useRef(new Map<string,HTMLCanvasElement>())
  const [readyRevision, setReadyRevision] = useState(0)
  const reviewOption = reviewed?.artworkId === active?.id ? options.find(option => option.id === reviewed?.optionId) : undefined
  const reviewState = useMemo(() => reviewOption ? copyVariationState(creative,reviewOption.id) : null, [creative,reviewOption?.id])
  const markReviewReady = useCallback(() => setReviewReady(true), [])
  const registerCanvas = useCallback((artworkId:string,optionId:string,canvas:HTMLCanvasElement|null) => {
    const key=`${artworkId}:${optionId}`
    if ((canvases.current.get(key) ?? null) === canvas) return
    if (canvas) canvases.current.set(key,canvas); else canvases.current.delete(key)
    setReadyRevision(value=>value+1)
  }, [])
  const chosenKey = JSON.stringify(selectedExportIds)
  const chosen = useMemo(()=>selectedExportIds.filter(id=>options.some(option=>option.id===id)),[chosenKey,options])
  function toggleOption(id:string) { if(active)onExportSelection?.(active.id,chosen.includes(id)?chosen.filter(value=>value!==id):[...chosen,id]) }
  const currentOptionId = reviewOption?.id ?? selectedOption?.id ?? options[0]?.id
  const exportImages = useCallback(async (ids:string[]) => {
    if (!active || !ids.length || exportBusy) return
    const images=ids.map(id=>({id,canvas:canvases.current.get(`${active.id}:${id}`)}))
    if(images.some(image=>!image.canvas)){setExportError('Wait for the images to finish rendering before exporting.');return}
    setExportBusy(true); setExportError('')
    try {
      const prefix=(brand.name||'superpilot').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'superpilot'
      const files=await Promise.all(images.map(async image=>({name:`${prefix}-variation-${options.findIndex(option=>option.id===image.id)+1}.png`,blob:await canvasPng(image.canvas!)})))
      downloadFile(files.length===1?files[0].blob:await imageArchive(files),files.length===1?files[0].name:`${prefix}-ads.zip`)
    } catch { setExportError('The images could not be exported. Your selections are saved; try again.') }
    finally { setExportBusy(false) }
  },[active?.id,options,brand.name,exportBusy])
  async function exportBase() {
    if (!active || !hasArtwork || exportBusy) return
    setExportBusy(true); setExportError('')
    try {
      const response=await fetch(generationImageUrl(active.id))
      if(!response.ok)throw new Error('Image unavailable')
      const blob=await response.blob()
      const name=(brand.name||'superpilot').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'superpilot'
      downloadFile(blob,`${name}-artwork.${blob.type==='image/jpeg'?'jpg':'png'}`)
    } catch { setExportError('The saved artwork could not be exported. Try again.') }
    finally { setExportBusy(false) }
  }
  const controls = useMemo<ExportControls|null>(()=>!active||!options.length||placementPending||placementUnavailable?null:{count:chosen.length,total:options.length,busy:exportBusy,disabled:!(chosen.length?chosen:options.map(option=>option.id)).every(id=>canvases.current.has(`${active.id}:${id}`)),allDisabled:!options.every(option=>canvases.current.has(`${active.id}:${option.id}`)),currentDisabled:!currentOptionId||!canvases.current.has(`${active.id}:${currentOptionId}`),onExport:()=>{void exportImages(chosen.length?chosen:options.map(option=>option.id))},onExportCurrent:()=>{void exportImages(currentOptionId?[currentOptionId]:[])},onExportAll:()=>{void exportImages(options.map(option=>option.id))}},[active?.id,options,chosen,currentOptionId,exportBusy,readyRevision,placementPending,placementUnavailable,exportImages])
  useEffect(()=>{onExportControls?.(stage==='studio'?controls:null)},[controls,stage,onExportControls])
  useEffect(()=>()=>onExportControls?.(null),[onExportControls])
  function viewOption(optionId: string) {
    if (!active) return
    onAction({op:'choose-copy',id:optionId})
    setReviewReady(false); setReviewed({artworkId:active.id,optionId})
  }
  return <section aria-label="Composing workspace" className="mx-auto w-full max-w-7xl space-y-6">
    {stage==='idea'?<CreateIntent storeUrl={storeUrl} brand={brand} selections={selections} research={research} activity={activity} selectedId={creative.adDirectionId} intent={creative.brief} format={format} sources={researchSources} onFormat={onFormat} onSelect={onChooseDirection} onGenerate={()=>onGenerate(!!active)} onRetry={onRetryDirections} onMore={onMoreDirections} onProduct={onProduct} submitting={submitting} disabled={inferenceDisabled}/>:<>

      {active?.preparation?.status==='fallback'?<p role="status" className="text-sm text-muted-foreground">Using your saved ad plan. Automatic replanning was unavailable.</p>:null}
      {progress.error?<div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"><p className="text-destructive">{progress.error}</p>{!inferenceDisabled?<p className="mt-1 text-muted-foreground"><Button variant="outline" size="sm" disabled={submitting} onClick={()=>onGenerate(true)}>Retry generation</Button></p>:null}</div>:null}
      <div className="grid items-stretch gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] xl:gap-x-8">
        <div className="flex h-full min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">
          <div className="flex w-full items-start gap-3 text-left"><Button variant="ghost" size="icon-sm" className="shrink-0" aria-label="Back to ideas" onClick={onIdeas}><IconArrowLeft aria-hidden="true" /></Button><div className="min-w-0 max-w-prose"><h2 className="text-sm font-semibold">{ideaTitle || research.result?.directions.find(direction=>direction.id===creative.adDirectionId)?.title || 'Your ad options'}</h2><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">{ideaDescription || 'Choose the versions you want to export'}</p></div></div>
        <div className="group group/artwork relative mt-auto w-full">
          <ArtworkReveal id={hasArtwork&&active ? active.id : undefined} title={active?.productTitle ?? 'your ad'} format={previewFormat} loading={progress.loading}>
            {hasArtwork&&active ? <><Button type="button" variant="ghost" className="absolute inset-0 size-full rounded-xl bg-transparent p-0 hover:bg-transparent" aria-label="View base artwork" onClick={()=>setBaseOpen(true)}/><div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1"><ArtworkAction revealLabel label="Export" disabled={exportBusy} onClick={()=>{void exportBase()}}><IconDownload/></ArtworkAction><ArtworkAction label="View" variant="secondary" onClick={()=>setBaseOpen(true)}><IconArrowsMaximize/></ArtworkAction></div></> : null}
          </ArtworkReveal>
        </div>
        </div>
        <p className="lg:col-start-1 lg:row-start-2 text-xs leading-5 text-muted-foreground">Base artwork · variations add your headline, supporting text and logo.</p>
        <div className="flex h-full min-w-0 flex-col justify-end gap-3 lg:col-start-2 lg:row-start-1">
          {placementUnavailable ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3"><p className="min-w-0 flex-1 text-sm text-muted-foreground">{active?.compositionError?.replace(/;?\s*ask the agent.*$/i,'').trim() || 'Copy placement could not finish. Your artwork is saved.'}</p>{onRetryPlacement ? <Button variant="secondary" size="sm" disabled={retryingPlacement} onClick={onRetryPlacement}>{retryingPlacement ? <Spinner className="size-3.5"/> : null}{retryingPlacement ? 'Retrying placement…' : 'Retry placement'}</Button> : null}</div> : null}
          <div className="grid grid-cols-2 items-start gap-4 xl:gap-6" aria-label="Composed variations">
            {Array.from({length:4},(_,index)=>{
              const option = hasArtwork&&active&&!placementPending&&!placementUnavailable ? options[index] : undefined
              return <VariationReveal key={index} artworkId={hasArtwork ? active?.id : undefined} onView={option ? () => viewOption(option.id) : undefined} format={previewFormat} loading={progress.loading} label={`Variation ${index+1}`} preview={option&&active ? { id:active.id, state:copyVariationState(creative,option.id), brand, storeUrl, format:previewFormat, selected:chosen.includes(option.id), onToggleSelection:()=>toggleOption(option.id), onView:()=>viewOption(option.id), onExport:()=>{void exportImages([option.id])}, onCanvasReady:registerCanvas, onSelect:()=>onAction({op:'choose-copy',id:option.id}), onAction, label:`Variation ${index+1}`, exportRequest:creative.selectedCopy===option.id?exportRequest:0, onExported } : undefined}/>
            })}
          </div>
        </div>
        <div className="space-y-3 lg:col-start-2 lg:row-start-2">
          {controls ? <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-t pt-3"><span className="text-xs text-muted-foreground">{chosen.length ? `${chosen.length} selected` : 'All variations will be exported'}</span>{!composerFloating ? <ExportActions controls={controls} /> : null}</div> : null}
          {exportError ? <p role="alert" className="text-sm text-destructive">{exportError}</p> : null}
        </div>
      </div>
      <Dialog open={!!reviewOption && stage === 'studio'} onOpenChange={open => { if (!open) { setReviewed(null) } }}><DialogContent showCloseButton={false} aria-describedby="export-review-description" className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"><div><DialogTitle>Variation {options.findIndex(option => option.id === reviewOption?.id) + 1}</DialogTitle><DialogDescription id="export-review-description" className="mt-1 text-xs">{previewFormat === 'story' ? '1080 × 1920' : '1080 × 1080'} · PNG</DialogDescription></div><DialogClose asChild><Button variant="ghost" size="icon-sm" aria-label="Close export preview"><IconX /></Button></DialogClose></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="mx-auto w-full" style={{maxWidth:previewFormat === 'story' ? 'calc((100dvh - 13rem) * 0.5625)' : 'calc(100dvh - 13rem)'}}>{reviewOption && reviewState && active ? <CompositionPreview key={`${active.id}:${reviewOption.id}`} readOnly id={active.id} state={reviewState} brand={brand} storeUrl={storeUrl} format={previewFormat} label={`Final preview of variation ${options.findIndex(option => option.id === reviewOption.id) + 1}`} onReady={markReviewReady} /> : null}</div></div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-4 py-3"><div className="flex items-center gap-2"><Button variant="ghost" size="icon-sm" className="transition-opacity disabled:opacity-20" style={{opacity:options.findIndex(option=>option.id===reviewOption?.id)<=0?0:undefined}} aria-hidden={options.findIndex(option=>option.id===reviewOption?.id)<=0} aria-label="Previous image" disabled={options.findIndex(option=>option.id===reviewOption?.id)<=0} onClick={()=>{const index=options.findIndex(option=>option.id===reviewOption?.id);if(index>0)viewOption(options[index-1].id)}}><IconArrowLeft /></Button><span className="text-xs tabular-nums">{options.findIndex(option=>option.id===reviewOption?.id)+1} / {options.length}</span><Button variant="ghost" size="icon-sm" className="transition-opacity disabled:opacity-20" style={{opacity:options.findIndex(option=>option.id===reviewOption?.id)>=options.length-1?0:undefined}} aria-hidden={options.findIndex(option=>option.id===reviewOption?.id)>=options.length-1} aria-label="Next image" disabled={options.findIndex(option=>option.id===reviewOption?.id)>=options.length-1} onClick={()=>{const index=options.findIndex(option=>option.id===reviewOption?.id);if(index<options.length-1)viewOption(options[index+1].id)}}><IconArrowRight /></Button></div>{reviewOption ? <Button variant={chosen.includes(reviewOption.id)?'secondary':'outline'} size="sm" onClick={()=>toggleOption(reviewOption.id)}>{chosen.includes(reviewOption.id)?<IconCheck/>:null}{chosen.includes(reviewOption.id)?'Included in export':'Include in export'}</Button> : null}{controls ? <ExportActions scope="image" controls={{...controls,currentDisabled:controls.currentDisabled||!reviewReady}} /> : null}</div>
        {exportError ? <p role="alert" className="px-4 pb-3 text-sm text-destructive">{exportError}</p> : null}
      </DialogContent></Dialog>
    </>}
    <Dialog open={baseOpen} onOpenChange={setBaseOpen}><DialogContent showCloseButton={false} className="max-h-[calc(100svh-2rem)] overflow-y-auto p-3 sm:max-w-4xl" aria-describedby="base-artwork-description"><div className="flex items-center justify-between gap-3"><DialogTitle className="text-sm">Base artwork</DialogTitle><Button variant="ghost" size="icon-sm" aria-label="Close artwork preview" onClick={()=>setBaseOpen(false)}><IconX/></Button></div>{active ? <img src={generationImageUrl(active.id)} alt={`Base artwork for ${brand.name}`} className="max-h-[70svh] w-full rounded-xl object-contain"/> : null}<div className="flex items-center justify-between gap-3"><p id="base-artwork-description" className="text-xs text-muted-foreground">Original artwork without ad copy.</p><Button disabled={exportBusy||!hasArtwork} onClick={()=>{void exportBase()}}><IconDownload/>Export artwork</Button></div></DialogContent></Dialog>
    {stage==='studio'&&jobs.length?<GenerationCarousel jobs={jobs} activeId={activeId} onSelect={onSelectVersion}/>:null}
  </section>
}

function ArtworkPlaceholder({format,loading,label,artworkId}:{format:'square'|'story';loading:boolean;label:string;artworkId?:string}){
  return <div className="relative w-full overflow-hidden rounded-xl border bg-muted/20" style={{aspectRatio:format==='story'?'9 / 16':'1 / 1'}} aria-label={`${label} preview`}>{artworkId ? <><img src={generationImageUrl(artworkId)} alt="" className="absolute inset-0 size-full object-contain"/><div className={`absolute inset-0 bg-background/10 ${loading?'animate-pulse motion-reduce:animate-none':''}`} />{loading ? <span className="absolute right-2 bottom-2 left-2 rounded-md bg-background/85 px-2 py-1 text-center text-xs text-foreground">Adding copy…</span> : null}</> : <><Skeleton className={`absolute inset-0 size-full rounded-none motion-reduce:animate-none ${loading?'':'animate-none'}`}/><span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/45"><IconPhoto className="size-7" aria-hidden="true"/><span className="text-xs">{label}</span></span></>}</div>
}

function ArtworkReveal({ id, title, format, loading, children }: { id?: string; title: string; format: 'square'|'story'; loading: boolean; children?: ReactNode }) {
  const [loaded, setLoaded] = useState('')
  const [failed, setFailed] = useState('')
  const source = id ? generationImageUrl(id) : ''
  const currentSource = useRef(source)
  currentSource.current = source
  const ready = !!source && loaded === source
  const reduced = useReducedMotion()
  return <div className={`relative w-full overflow-hidden ${selectionCardSurface}`} style={{ aspectRatio: format === 'story' ? '9 / 16' : '1 / 1' }} aria-busy={!ready && loading}>
    <motion.div className="absolute inset-0" animate={{opacity:ready?0:1}} transition={{duration:reduced?0:.35}} aria-hidden={ready}><ArtworkPlaceholder format={format} loading={!ready && (loading || !!source && failed !== source)} label="Base artwork"/></motion.div>
    {source ? <motion.img key={source} src={source} alt={`Base artwork for ${title}`} className="absolute inset-0 size-full object-contain" initial={{opacity:0}} animate={{opacity:ready?1:0}} transition={{duration:reduced?0:.4}} onLoad={event=>{ const image=event.currentTarget; void image.decode().catch(()=>{}).then(()=>{if(currentSource.current===source)setLoaded(source)}) }} onError={()=>setFailed(source)}/> : null}
    {ready ? children : null}
    {failed===source&&source?<p role="alert" className="absolute inset-x-3 bottom-3 rounded-lg bg-background/95 p-3 text-xs">Your artwork is saved, but the image could not be displayed.</p>:null}
  </div>
}
function VariationReveal({ preview, artworkId, format, loading, label, onView }: { artworkId?:string; onView?: () => void; preview?: ComponentProps<typeof CompositionPreview>; format:'square'|'story'; loading:boolean; label:string }) {
  const [readyId,setReadyId]=useState('')
  const [failure,setFailure]=useState<{identity:string;message:string}|null>(null)
  const identity=preview ? `${preview.id}:${preview.state.selectedCopy}` : ''
  const ready=!!identity&&readyId===identity
  const error=failure?.identity===identity?failure.message:''
  const reduced=useReducedMotion()
  const markReady=useCallback(()=>{setReadyId(identity);setFailure(null)},[identity])
  const markError=useCallback((message:string)=>setFailure({identity,message}),[identity])
  return <div className="min-w-0 space-y-2"><div className="relative w-full" style={{aspectRatio:format==='story'?'9 / 16':'1 / 1'}}>
    <motion.div className="absolute inset-0" animate={{opacity:ready?0:1}} transition={{duration:reduced?0:.35}} aria-hidden={ready}><ArtworkPlaceholder artworkId={artworkId} format={format} loading={!ready&&!error&&(loading||!!preview)} label={label}/></motion.div>
    {preview?<motion.div className="absolute inset-0" initial={{opacity:0}} animate={{opacity:ready?1:0}} transition={{duration:reduced?0:.4}}><CompositionPreview {...preview} onReady={markReady} onError={markError}/></motion.div>:null}
  </div>{error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}</div>
}

function GenerationCarousel({jobs,activeId,onSelect}:{jobs:Generation[];activeId:string|null;onSelect:(id:string)=>void}){
  const viewport=useRef<HTMLDivElement>(null),track=useRef<HTMLDivElement>(null)
  const reduced=useReducedMotion()
  const [bounds,setBounds]=useState({previous:false,next:false,overflow:false})
  const readBounds=useCallback(()=>{
    const node=viewport.current;if(!node)return
    const next={previous:node.scrollLeft>2,next:node.scrollLeft+node.clientWidth<node.scrollWidth-2,overflow:node.scrollWidth>node.clientWidth+2}
    setBounds(current=>current.previous===next.previous&&current.next===next.next&&current.overflow===next.overflow?current:next)
  },[])
  useEffect(()=>{
    const node=viewport.current,content=track.current;if(!node||!content)return
    readBounds();const observer=new ResizeObserver(readBounds);observer.observe(node);observer.observe(content)
    return()=>observer.disconnect()
  },[readBounds,jobs.length])
  useEffect(()=>{
    const node=viewport.current,target=Array.from(track.current?.children??[]).find(child=>child.getAttribute('data-generation')===activeId) as HTMLElement|undefined
    if(!node||!target)return
    if(target.offsetLeft<node.scrollLeft||target.offsetLeft+target.offsetWidth>node.scrollLeft+node.clientWidth)node.scrollTo({left:target.offsetLeft-(node.clientWidth-target.offsetWidth)/2,behavior:reduced?'instant':'smooth'})
  },[activeId,jobs.length,reduced])
  function page(direction:number){const node=viewport.current;if(node)node.scrollBy({left:direction*Math.max(80,node.clientWidth*.8),behavior:reduced?'instant':'smooth'})}
  return <section aria-label="Generations" className="mx-auto w-full max-w-5xl space-y-1"><h3 className="text-center text-xs font-medium text-muted-foreground">Generations</h3><div className="grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-1">
    <Button variant="ghost" size="icon-sm" aria-label="Previous generations" aria-hidden={!bounds.overflow} disabled={!bounds.previous} className={bounds.overflow?'':'invisible'} onClick={()=>page(-1)}><IconArrowLeft/></Button>
    <div ref={viewport} role="region" aria-roledescription="carousel" aria-label="Saved generations" onScroll={readBounds} className="relative min-w-0 overflow-x-auto [scrollbar-width:none]">
      <div ref={track} className="flex w-max min-w-full justify-center gap-3 px-3 py-4">{jobs.map((job,index)=><Button key={job.id} data-generation={job.id} variant="product" size="thumbnail" className="grid shrink-0 place-items-center items-center bg-white p-0 hover:bg-white" aria-label={`View generation ${jobs.length-index}`} title={`Generation ${jobs.length-index}`} aria-pressed={activeId===job.id} data-selected={activeId===job.id} onClick={()=>onSelect(job.id)}>{job.images.length?<img src={generationImageUrl(job.id)} alt="" className="block size-full object-contain"/>:job.status==='queued'||job.status==='generating'?<Spinner className="size-4 text-neutral-500"/>:<IconPhoto className="size-4 text-neutral-500"/>}</Button>)}</div>
    </div>
    <Button variant="ghost" size="icon-sm" aria-label="Next generations" aria-hidden={!bounds.overflow} disabled={!bounds.next} className={bounds.overflow?'':'invisible'} onClick={()=>page(1)}><IconArrowRight/></Button>
  </div></section>
}
