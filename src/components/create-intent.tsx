import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IconArrowLeft, IconArrowRight, IconCheck, IconLoader2, IconPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { ErrorNotice } from '@/components/error-notice'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { useBrandFonts } from '@/components/use-brand-fonts'
import type { BrandDraft } from '@/lib/studio'
import type { ProductSelection } from '@/lib/product-selection'
import type { AdDirectionResult } from '@/lib/ad-directions'
import { type AgentActivity } from '@/lib/agent-activity'

function ideaDetails(angle: string, visual: string) {
  const [outline, ...suggested] = angle.split(/\s*Suggested direction:\s*/i)
  return { outline: outline.trim(), suggested: (suggested.join(' ') || visual).replace(/^Suggested direction:\s*/i, '').trim() }
}

export type CreateResearchState={status:'idle'|'loading'|'ready'|'error';result?:AdDirectionResult;revealed?:number;focusIndex?:number;error?:string}
export function CreateIntent({brand,storeUrl,selections,research,selectedId,onSelect,onRetry,onMore,disabled}: {
  brand:BrandDraft;storeUrl:string;selections:ProductSelection[];research:CreateResearchState;activity:AgentActivity;selectedId?:string|null;intent?:{message:string;visual:string};format:'square'|'story';sources?:{url:string;title:string}[];onFormat:(format:'square'|'story')=>void;onSelect:(id:string)=>void;onGenerate:()=>void;onRetry:()=>void;onMore:()=>void;onProduct:()=>void;submitting:boolean;disabled?:boolean
}){
  const reduced=useReducedMotion()
  const fonts=useBrandFonts(storeUrl,brand.headingFont,brand.bodyFont)
  const [sequence,setSequence]=useState<{base:number;phase:'cached'|'settle'|'next'}|null>(null)
  const sequenceTimers=useRef<ReturnType<typeof setTimeout>[]>([])
  const selectionKey=JSON.stringify(selections.map(item=>[item.product.id,item.variant.id,item.image,item.imageUrls]))
  useEffect(()=>{
    setSequence(null)
    return()=>{sequenceTimers.current.forEach(clearTimeout);sequenceTimers.current=[]}
  },[storeUrl,selectionKey])
  useEffect(()=>{
    if(research.status!=='error')return
    sequenceTimers.current.forEach(clearTimeout);sequenceTimers.current=[];setSequence(null)
  },[research.status])
  const revealed=sequence?Math.min(research.revealed??2,sequence.base+(sequence.phase==='cached'?0:1)):research.revealed??2
  const directions=research.result?.directions.slice(0,revealed)??[]
  function generateMore(){
    if(sequence||research.status==='loading')return
    const base=research.revealed??2
    if((research.result?.directions.length??0)<=base){onMore();return}
    setSequence({base,phase:'cached'})
    onMore()
    sequenceTimers.current=[
      setTimeout(()=>setSequence({base,phase:'settle'}),1200),
      setTimeout(()=>setSequence({base,phase:'next'}),1650),
      setTimeout(()=>setSequence(null),2250),
    ]
  }
  const viewport=useRef<HTMLDivElement>(null)
  const [position,setPosition]=useState({index:0,end:true})
  function readPosition(){const node=viewport.current,first=node?.firstElementChild as HTMLElement|null;if(node&&first)setPosition({index:Math.round(node.scrollLeft/(first.offsetWidth+16)),end:node.scrollLeft+node.clientWidth>=node.scrollWidth-8})}
  function showIdea(index:number){const node=viewport.current,target=node?.children[Math.max(0,Math.min(index,node.children.length-1))] as HTMLElement|undefined;if(node&&target)node.scrollTo({left:target.offsetLeft,behavior:reduced?'instant':'smooth'})}
  function pageSize(){const node=viewport.current,first=node?.firstElementChild as HTMLElement|null;return node&&first?Math.max(1,Math.round(node.clientWidth/(first.offsetWidth+16))):1}
  useEffect(()=>{showIdea(research.focusIndex??0)},[research.focusIndex,reduced])
  useEffect(()=>{if(sequence?.phase==='next')showIdea(sequence.base)},[sequence?.phase,reduced])
  useEffect(()=>{const node=viewport.current;if(!node)return;readPosition();const observer=new ResizeObserver(readPosition);observer.observe(node);return()=>observer.disconnect()},[directions.length,research.status,sequence?.phase])
  const loadingCount=sequence?1:research.status==='loading'?(directions.length?1:2):0
  return <div className="@container mx-auto w-full max-w-5xl space-y-6 py-4 sm:py-6">
    <div className="flex min-h-24 items-center justify-center gap-4" aria-label="Brand for these ideas">{brand.logoUrl?<span className="flex size-24 shrink-0 items-center justify-center rounded-full border border-border/70 bg-white p-2 shadow-sm"><img src={brand.logoUrl} alt={brand.name||'Your brand'} className="size-full object-contain"/></span>:<span className="text-2xl font-semibold" style={fonts.heading}>{brand.name||'Your brand'}</span>}</div>
    <div ref={viewport} role="region" aria-roledescription="carousel" aria-label="Ad ideas" onScroll={readPosition} className="relative flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto scroll-px-0 p-0.5 [scrollbar-width:none]" aria-busy={research.status==='loading'||!!sequence}>
      {directions.map((direction,index)=>{const details=ideaDetails(direction.angle,direction.visual);return <motion.div key={direction.id} role="group" aria-roledescription="slide" aria-label={`Idea ${index+1}`} initial={{opacity:0,x:reduced?0:24}} animate={{opacity:1,x:0}} transition={{duration:reduced?0:0.45}} className="flex min-w-0 shrink-0 basis-full snap-start @min-[520px]:basis-[calc((100%_-_1rem)/2)]">
        <Button variant="product" size="product" className="relative h-full min-h-120 justify-start" data-selected={selectedId===direction.id} aria-pressed={selectedId===direction.id} onClick={()=>onSelect(direction.id)}>
          <span className="relative isolate flex h-80 w-full shrink-0 flex-col overflow-hidden p-6">
            {brand.logoUrl?<img aria-hidden="true" src={brand.logoUrl} alt="" className="pointer-events-none absolute -right-5 top-16 -z-10 w-48 -rotate-12 object-contain opacity-[0.045] grayscale"/>:null}
            <span className="mb-10 flex items-center justify-between gap-2"><span className="rounded-full border bg-background/80 px-2.5 py-1 text-[10px] font-medium tracking-wide">IDEA {index+1}</span><IconCheck className={`size-4 shrink-0 text-primary ${selectedId===direction.id?'opacity-100':'opacity-0'}`} aria-hidden="true"/></span>
            <span className="my-auto block space-y-4" aria-label="Proposed ad copy"><span className="block text-3xl leading-[1.12] font-semibold" style={fonts.heading}>{direction.headline}</span>{direction.subheading?<span className="block text-pretty text-lg font-normal leading-snug" style={fonts.body}>{direction.subheading}</span>:null}</span>
          </span>
          <span className="grid w-full flex-1 grid-rows-[2.75rem_6.25rem_auto] gap-3 border-t bg-muted/60 p-5">
            <span className="line-clamp-2 text-base font-semibold leading-snug">{direction.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'')!==direction.headline.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'')?direction.title:null}</span>
            <span className="line-clamp-5 text-sm font-normal leading-5 text-foreground/80" title={details.outline}>{details.outline}</span>
            <span className="block text-xs font-normal leading-5 text-muted-foreground/75"><span className="mb-1 block">Suggested direction</span>{details.suggested}</span>
          </span>
        </Button>
      </motion.div>})}
      {Array.from({length:loadingCount},(_,index)=><div key={`loading-${index}`} className={`flex min-h-120 shrink-0 basis-full snap-start flex-col overflow-hidden rounded-xl border bg-background @min-[520px]:basis-[calc((100%_-_1rem)/2)] ${sequence?.phase==='settle'?'invisible':''}`} aria-hidden={sequence?.phase==='settle'} role="status"><div className="relative flex h-80 shrink-0 flex-col p-6"><Skeleton className="h-6 w-16 rounded-full motion-reduce:animate-none"/><div className="my-auto flex flex-col items-center gap-4"><Spinner className="size-6 text-muted-foreground"/><Shimmer className="text-sm">Developing an idea</Shimmer></div></div><div className="min-h-40 flex-1 space-y-3 border-t bg-muted/60 p-5"><Skeleton className="h-4 w-2/3 motion-reduce:animate-none"/><Skeleton className="h-3 w-full motion-reduce:animate-none"/><Skeleton className="h-3 w-4/5 motion-reduce:animate-none"/></div></div>)}
    </div>
    {directions.length?<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2"><Button variant="ghost" size="icon-sm" className="justify-self-start transition-opacity duration-150 motion-reduce:transition-none" style={{opacity:position.index===0?0:disabled?0.2:1}} aria-hidden={position.index===0} aria-label="Previous ideas" disabled={position.index===0||disabled} onClick={()=>showIdea(Math.max(0,position.index-pageSize()))}><IconArrowLeft/></Button><Button variant="ghost" disabled={research.status==='loading'||!!sequence||disabled} onClick={generateMore}>{research.status==='loading'||sequence?<Spinner/>:<IconPlus/>}Generate more ideas</Button><Button variant="ghost" size="icon-sm" className="justify-self-end transition-opacity duration-150 motion-reduce:transition-none" style={{opacity:position.end?0:disabled?0.2:1}} aria-hidden={position.end} aria-label="Next ideas" disabled={position.end||disabled} onClick={()=>showIdea(position.index+pageSize())}><IconArrowRight/></Button></div>:null}
    {research.status==='error'?<ErrorNotice className="mx-auto max-w-md" error={research.error || 'Ideas could not finish'} notice={{title:'Ad ideas couldn’t finish',message:!research.error || research.error.startsWith('We could not complete that workspace action') ? 'Your brand and product selections are saved. Retry to continue developing ideas.' : research.error,retryable:true}} onRetry={onRetry} />:null}
  </div>
}

export function CreateLiveProgress({activity,action}: {activity:AgentActivity;action:string}){
  const reduced=useReducedMotion()
  const entries=activity.entries.filter(entry=>(entry.state==='running'||entry.kind==='agent'&&entry.state==='pending')&&!/cache|restore session|open brand|brand context/i.test(entry.label)).slice(-3)
  const actionShown=entries.some(entry=>entry.label===action&&entry.state==='running')
  return <div className="mx-auto w-full max-w-2xl space-y-2 py-3" role="status"><AnimatePresence initial={false}>{!actionShown?<motion.div key={action} initial={{opacity:0,y:reduced?0:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced?0:-4}} transition={{duration:reduced?0:0.2}} className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm"><IconLoader2 className="mt-0.5 size-3 shrink-0 animate-spin"/><p>{action}…</p></motion.div>:null}</AnimatePresence>{entries.map(entry=><motion.div key={entry.id} initial={{opacity:0}} animate={{opacity:1}} transition={{duration:reduced?0:0.16}} className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs"><span className="mt-0.5 shrink-0">{entry.state==='running'?<IconLoader2 className="size-3 animate-spin"/>:entry.state==='error'?<span aria-label="Failed">!</span>:<IconCheck className="size-3"/>}</span><div className="min-w-0"><p>{entry.label}</p>{entry.detail?<p className="mt-1 line-clamp-2 text-muted-foreground">{entry.detail}</p>:null}</div></motion.div>)}{activity.summary&&activity.status!=='ready'?<p className="px-3 text-xs leading-relaxed text-muted-foreground">{activity.summary}</p>:null}</div>
}
