import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IconAdjustmentsHorizontal, IconPalette, IconPhotoPlus, IconTextCaption, IconTypography, IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { ColorPicker } from '@/components/ui/color-picker'
import { FontPicker } from '@/components/font-picker'
import { InlineEdit } from '@/components/ui/inline-edit'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { StudioLogo } from '@/components/studio-logo'
import { BrandVisualContext } from '@/components/brand-visual-context'
import { useContextFeedback } from '@/components/use-context-feedback'
import { useBrandFonts } from '@/components/use-brand-fonts'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BRAND_GUIDELINE_SECTIONS, BrandGuidelinesNav, type BrandGuidelineSectionId } from '@/components/brand-guidelines-nav'
import type { BrandDraft, StoreSnapshot } from '@/lib/studio'
import type { BrandField } from '@/lib/brand-draft'

type EditableBrandDraft = BrandDraft
type EditableBrandField = BrandField
const emptyBrand: EditableBrandDraft = { name: '', description: '', logoUrl: '', colors: [], headingFont: '', bodyFont: '', direction: '' }
type Props = {
  snapshot?: StoreSnapshot | null; draft?: BrandDraft | null; sourceUrl?: string; pending?: boolean
  onChange?: (draft: BrandDraft, field?: BrandField) => void; onContinue?: () => void; surfaceId?: string; onVisualOpenChange?: (open: boolean) => void
}

function Reveal({ ready, placeholder, children, order = 0 }: { ready: boolean; placeholder: ReactNode; children: ReactNode; order?: number }) {
  const reduced = useReducedMotion()
  return <div className="grid min-w-0 w-full"><AnimatePresence initial={false}><motion.div key={ready ? 'found' : 'blank'} className="col-start-1 row-start-1 min-w-0 w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.18 }}>{ready ? children : placeholder}</motion.div></AnimatePresence></div>
}

function HintIcon({ icon: Icon, label }: { icon: typeof IconPalette; label: string }) {
  return <Tooltip><TooltipTrigger asChild><span tabIndex={0} role="img" aria-label={label} className="inline-flex size-5 shrink-0 items-center justify-center text-muted-foreground outline-none focus-visible:text-foreground"><Icon className="size-3.5" aria-hidden="true" /></span></TooltipTrigger><TooltipContent side="top" sideOffset={6}>{label}</TooltipContent></Tooltip>
}

const isHexColor = (value: string) => /^#[a-f\d]{6}$/i.test(value)

function BrandCard({ snapshot, draft: providedDraft, sourceUrl = '', pending = false, onChange, surfaceId = 'brand-card', visualTrigger, inModal = false }: Props & { visualTrigger?: ReactNode; inModal?: boolean }) {
  const draft = (providedDraft ?? emptyBrand) as EditableBrandDraft
  const current = useRef({ draft, onChange })
  current.current = { draft, onChange }
  const active = useRef(true)
  const reduced = useReducedMotion()
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  const begin = (field: EditableBrandField) => current.current.onChange?.(current.current.draft as BrandDraft, field as BrandField)
  const update = (patch: Partial<EditableBrandDraft>) => {
    if (active.current) current.current.onChange?.({ ...current.current.draft, ...patch } as BrandDraft, Object.keys(patch)[0] as BrandField)
  }
  const origin = snapshot?.storeUrl ?? sourceUrl
  const fonts = useBrandFonts(origin, draft.headingFont, draft.bodyFont)
  const secondaryFont = draft.secondaryFont || (draft.bodyFont !== draft.headingFont ? draft.bodyFont : '')
  const secondaryFonts = useBrandFonts(origin, '', secondaryFont)
  useEffect(() => {
    const resolved = fonts.resolution
    const latest = current.current
    if (!providedDraft || !resolved || resolved.heading.requestedFamily !== (latest.draft.headingFont.trim() || null) || resolved.body.requestedFamily !== (latest.draft.bodyFont.trim() || null)) return
    const supporting = secondaryFonts.resolution?.body
    const fontResolution = { ...resolved, ...(secondaryFont && supporting?.requestedFamily === secondaryFont.trim() ? { secondary: supporting } : {}) }
    if (JSON.stringify(fontResolution) !== JSON.stringify(latest.draft.fontResolution)) latest.onChange?.({ ...latest.draft, fontResolution })
  }, [fonts.resolution, secondaryFonts.resolution, secondaryFont, providedDraft])

  const palettes = [
    { values: draft.colors, field: 'colors' as const, label: 'Primary brand colors', iconLabel: 'Primary color palette' },
    { values: draft.secondaryColors ?? [], field: 'secondaryColors' as const, label: 'Secondary brand colors', iconLabel: 'Secondary color palette' },
  ].filter(palette => palette.values.some(isHexColor))
  const loading = pending || !!snapshot?.enrichment && ['queued', 'running'].includes(snapshot.enrichment.status)
  const editable = !!providedDraft && !pending && (!snapshot?.enrichment || !['queued','running'].includes(snapshot.enrichment.status))
  const renderPalette = (palette: (typeof palettes)[number]) => <div key={palette.field} className="flex min-h-10 items-center gap-2" aria-label={palette.label} inert={!editable}>
    <HintIcon icon={IconPalette} label={palette.iconLabel} />
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      {palette.values.map((color, index) => isHexColor(color) ? <ColorPicker key={`${palette.field}-${index}`} label={`Edit ${palette.label.toLowerCase()} color ${index + 1}`} value={color} onEditStart={() => begin(palette.field)} onChange={next => update({ [palette.field]: palette.values.map((value, i) => i === index ? next : value) } as Partial<EditableBrandDraft>)} onRemove={() => update({ [palette.field]: palette.values.filter((_, i) => i !== index) } as Partial<EditableBrandDraft>)}>
        <Button variant="swatch" size="card-swatch" style={{ backgroundColor: color }} aria-label={`Edit ${palette.label.toLowerCase()} color ${index + 1}, ${color}`} />
      </ColorPicker> : null)}
    </div>
  </div>
  return <motion.section layout="position" layoutId={inModal ? undefined : surfaceId} aria-label="Brand card" aria-busy={loading}
    transition={{ layout: { duration: reduced ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] } }}
    className={`relative mx-auto flex min-h-[29rem] w-full flex-col bg-background px-6 pb-3 ${inModal ? 'max-w-none overflow-hidden pt-5 md:border-r' : 'mt-16 max-w-[22rem] overflow-visible rounded-[1.4rem] border pt-16 shadow-[0_18px_50px_-25px_rgb(0_0_0/0.35)]'}`}>
    <div className={inModal ? 'flex min-h-32 items-center justify-center' : 'absolute top-0 left-1/2 z-10 flex min-h-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center'} inert={!editable}>
      <Reveal ready={!!draft.logoUrl || !loading && !!providedDraft} order={0} placeholder={<Skeleton className="size-32 rounded-full" />}>
        <StudioLogo card value={draft.logoUrl} name={draft.name} onEditStart={() => begin('logoUrl')} onChange={logoUrl => update({ logoUrl })} />
      </Reveal>
    </div>
    <div className="mt-2 flex min-h-16 items-center justify-center [&>div]:w-full">
      <Reveal ready={!!draft.name} order={1} placeholder={<Skeleton className="mx-auto h-10 w-36" />}>
        <InlineEdit readOnly={!editable} appearance="card-title" style={{ ...fonts.heading, fontWeight: 700 }} label="Brand name" placeholder="" value={draft.name} onEditStart={() => begin('name')} onChange={name => update({ name })} />
      </Reveal>
    </div>
    <div className="my-3 min-h-36 flex-1">
      <Reveal ready={!!draft.description} order={2} placeholder={<div className="space-y-2"><Skeleton className="mx-auto h-3 w-full" /><Skeleton className="mx-auto h-3 w-5/6" /><Skeleton className="mx-auto h-3 w-2/3" /></div>}>
        <InlineEdit readOnly={!editable} multiline appearance="card-copy" style={fonts.body} label="Brand description" placeholder="" value={draft.description} maxLength={240} onEditStart={() => begin('description')} onChange={description => update({ description })} />
      </Reveal>
    </div>
    <div className="min-h-10"><Reveal ready={palettes.length > 0} order={3} placeholder={loading ? <div className="flex min-h-10 items-center gap-2" aria-label="Brand colors loading"><span className="size-5 shrink-0" /><div className="flex min-w-0 flex-1 gap-1.5">{Array.from({length:5},(_,index)=><Skeleton key={index} className="h-10 min-w-0 flex-1 rounded-md" />)}</div></div> : null}>
      {palettes.length ? <div className="space-y-1.5" aria-label="Brand color palettes">{palettes.map(renderPalette)}</div> : null}
    </Reveal>
    </div>
    {providedDraft || loading ? <div className="mt-4 grid min-h-14 grid-cols-2 gap-3" aria-label="Brand fonts">
      {providedDraft || loading ? <div className="flex min-w-0 items-center gap-1.5">
        {draft.headingFont || !loading ? <HintIcon icon={IconTypography} label="Heading font" /> : <span className="size-5 shrink-0" />}
        <Reveal ready={!!draft.headingFont || !loading} order={4} placeholder={<Skeleton className="h-7 w-full rounded-full" />}>
          <FontPicker sourceUrl={origin} readOnly={!editable} style={fonts.heading} label="Heading font" placeholder="Choose font" value={draft.headingFont} onEditStart={() => begin('headingFont')} onChange={headingFont => update({ headingFont })} />
        </Reveal>
      </div> : null}
      {providedDraft || loading ? <div className="flex min-w-0 items-center gap-1.5">
        {secondaryFont || !loading ? <HintIcon icon={IconTextCaption} label="Supporting font" /> : <span className="size-5 shrink-0" />}
        <Reveal ready={!!secondaryFont || !loading} order={5} placeholder={<Skeleton className="h-7 w-full rounded-full" />}>
          <FontPicker sourceUrl={origin} readOnly={!editable} style={secondaryFonts.body} label="Supporting font" placeholder="Choose font" value={secondaryFont} onEditStart={() => begin('secondaryFont')} onChange={secondaryFont => update({ secondaryFont })} />
        </Reveal>
      </div> : null}
    </div> : null}
    {visualTrigger ? <div className="-mx-6 -mb-3 mt-4 overflow-hidden rounded-b-[1.4rem] border-t border-border/70">{visualTrigger}</div> : null}
    {snapshot?.enrichment?.status === 'failed' ? <p role="status" className="sr-only">Some brand details couldn’t load.</p> : null}
  </motion.section>
}

function BrandGuidelinesSidebar({ draft, snapshot, sourceUrl, editable, activeSection, canScroll, sections, onSelect, onNameStart, onName }: {
  sections: {id: BrandGuidelineSectionId; label: string}[]; draft: BrandDraft; snapshot?: StoreSnapshot | null; sourceUrl?: string; editable: boolean; activeSection: BrandGuidelineSectionId; canScroll: boolean; onSelect: (id: BrandGuidelineSectionId) => void; onNameStart: () => void; onName: (value: string) => void
}) {
  return <aside aria-label="Brand identity and information sections" className="flex min-h-0 max-h-[14rem] flex-col gap-6 overflow-hidden border-b bg-muted/20 p-4 md:max-h-none md:border-r md:border-b-0 md:p-5">
    <div className="flex shrink-0 items-center gap-2">
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-white p-1" aria-label={draft.logoUrl ? `${draft.name || 'Brand'} logo` : 'Brand logo not available'}>
        {draft.logoUrl ? <img src={draft.logoUrl} alt="" className="max-h-full max-w-full object-contain" /> : <IconPhotoPlus className="size-5 text-muted-foreground/60" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <InlineEdit compact readOnly={!editable} appearance="name" noWrap style={{ fontSize: `${Math.min(16, 250 / Math.max(16, draft.name.length))}px`, fontWeight: 600 }} label="Brand name" placeholder="Brand name" value={draft.name} maxLength={200} onEditStart={onNameStart} onChange={onName} />
      </div>
    </div>
    <BrandGuidelinesNav sections={sections} activeSection={activeSection} canScroll={canScroll} onSelect={onSelect} />
  </aside>
}

export function StudioBrand(props: Props) {
  const [open, setOpen] = useState(false)
  const extracting = props.pending || !!props.snapshot?.enrichment && ['queued','running'].includes(props.snapshot.enrichment.status)
  const id = useId()
  const reduced = useReducedMotion()
  const layoutId = `${props.surfaceId ?? 'brand-card'}-visual-${id}`
  const draft = props.draft ?? emptyBrand
  const sections = useMemo(() => [...BRAND_GUIDELINE_SECTIONS, ...(draft.informationSections ?? []).map(section => ({id: `info-${section.id}` as BrandGuidelineSectionId, label: section.title}))], [draft.informationSections])
  const current = useRef(props)
  current.current = props
  const contentRef = useRef<HTMLDivElement>(null)
  const [scrollContent, setScrollContent] = useState<HTMLDivElement | null>(null)
  const mountContent = useCallback((node: HTMLDivElement | null) => { contentRef.current = node; setScrollContent(node) }, [])
  const sectionRefs = useRef<Partial<Record<BrandGuidelineSectionId, HTMLElement | null>>>({})
  const [activeSection, setActiveSection] = useState<BrandGuidelineSectionId>('overview')
  const [canScroll, setCanScroll] = useState(false)
  const editable = !!props.draft && !props.pending && (!props.snapshot?.enrichment || props.snapshot.enrichment.status === 'complete')
  const update = (patch: Partial<EditableBrandDraft>, field: EditableBrandField) => {
    const latest = current.current
    if (latest.draft) latest.onChange?.({ ...latest.draft, ...patch } as BrandDraft, field as BrandField)
  }
  useEffect(() => {
    if (!open) { setActiveSection('overview'); setCanScroll(false); return }
    const content = scrollContent
    if (!content) return
    const updateActive = () => {
      const bounds = content.getBoundingClientRect()
      setCanScroll(content.scrollHeight > content.clientHeight + 2)
      let next: BrandGuidelineSectionId = 'overview'
      for (const section of sections) {
        const node = sectionRefs.current[section.id]
        if (node && node.getBoundingClientRect().top <= bounds.top + 40) next = section.id
      }
      if (content.scrollHeight > content.clientHeight + 2 && content.scrollTop + content.clientHeight >= content.scrollHeight - 4) next = sections.at(-1)?.id ?? 'overview'
      setActiveSection(next)
    }
    updateActive()
    content.addEventListener('scroll', updateActive, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateActive)
    observer?.observe(content)
    for (const node of Object.values(sectionRefs.current)) if (node) observer?.observe(node)
    return () => { content.removeEventListener('scroll', updateActive); observer?.disconnect() }
  }, [open, scrollContent, sections])
  const registerSection = (section: BrandGuidelineSectionId) => (node: HTMLElement | null) => { sectionRefs.current[section] = node }
  const scrollToSection = (section: BrandGuidelineSectionId) => {
    const content = contentRef.current
    const node = sectionRefs.current[section]
    if (!content || !node) return
    const top = node.getBoundingClientRect().top - content.getBoundingClientRect().top + content.scrollTop - 20
    setActiveSection(section)
    content.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' })
  }
  return <TooltipProvider delayDuration={300}><Dialog open={open} onOpenChange={value => { setOpen(value); props.onVisualOpenChange?.(value) }}>
    <BrandCard {...props} surfaceId={`${layoutId}-card`} visualTrigger={props.draft ? <DialogTrigger asChild><Button variant="brand-guidelines" size="brand-guidelines" aria-label="Brand information"><IconAdjustmentsHorizontal aria-hidden="true" /><span>Brand information</span></Button></DialogTrigger> : undefined} />
      <DialogContent variant="panel" showCloseButton={false} aria-describedby={`${id}-visual-description`}>
        <div className="flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden rounded-[1.4rem] border bg-background shadow-2xl">
          <div className="z-10 flex shrink-0 items-center justify-between gap-4 border-b bg-background px-5 py-4 md:px-6"><DialogTitle>Brand information</DialogTitle>{extracting ? <span role="status" className="composer-state-shimmer ml-auto text-xs">{props.snapshot?.enrichment?.summary || 'Researching brand'}</span> : null}<DialogClose asChild><Button variant="ghost" size="icon-sm" aria-label="Close brand information"><IconX aria-hidden="true" /></Button></DialogClose></div>
          <DialogDescription id={`${id}-visual-description`} className="sr-only">Review and adjust the brand information for {draft.name || 'this brand'}.</DialogDescription>
          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:grid-cols-[17rem_minmax(0,1fr)] md:grid-rows-1">
            <BrandGuidelinesSidebar sections={sections} draft={draft} snapshot={props.snapshot} sourceUrl={props.sourceUrl} editable={editable} activeSection={activeSection} canScroll={canScroll} onSelect={scrollToSection} onNameStart={() => update({}, 'name')} onName={name => update({ name }, 'name')} />
            <div ref={mountContent} className="min-h-0 min-w-0 overflow-y-auto overscroll-contain p-5 md:p-7">
              <BrandVisualContext loading={!!extracting} informationSections={draft.informationSections} onInformationStart={() => update({}, 'informationSections')} onInformation={informationSections => update({ informationSections }, 'informationSections')} brandContext={draft.brandContext} onBrandContextStart={() => update({}, 'brandContext')} onBrandContext={brandContext => update({ brandContext }, 'brandContext')} description={draft.description} headingFont={draft.headingFont} bodyFont={draft.bodyFont} secondaryFont={draft.secondaryFont} colors={draft.colors} secondaryColors={draft.secondaryColors} style={draft.visualStyle} references={draft.visualReferences} sourceReferences={props.snapshot?.brand.visualReferences} sourceUrl={props.snapshot?.storeUrl ?? props.sourceUrl} readOnly={!editable} register={registerSection} onDescriptionStart={() => update({}, 'description')} onDescription={description => update({ description }, 'description')} onHeadingFontStart={() => update({}, 'headingFont')} onHeadingFont={headingFont => update({ headingFont }, 'headingFont')} onBodyFontStart={() => update({}, 'bodyFont')} onBodyFont={bodyFont => update({ bodyFont }, 'bodyFont')} onSecondaryFontStart={() => update({}, 'secondaryFont')} onSecondaryFont={secondaryFont => update({ secondaryFont }, 'secondaryFont')} onColorsStart={() => update({}, 'colors')} onColors={colors => update({ colors }, 'colors')} onSecondaryColorsStart={() => update({}, 'secondaryColors')} onSecondaryColors={secondaryColors => update({ secondaryColors }, 'secondaryColors')} onStyleStart={() => update({}, 'visualStyle')} onStyle={visualStyle => update({ visualStyle }, 'visualStyle')} onReferences={visualReferences => update({ visualReferences }, 'visualReferences')} />
            </div>
          </div>
        </div>
      </DialogContent>
  </Dialog></TooltipProvider>
}

export function BrandDock({ snapshot, draft, onChange }: { snapshot: StoreSnapshot; draft: BrandDraft; onChange: (draft: BrandDraft, field?: BrandField) => void }) {
  const feedback = useContextFeedback(JSON.stringify(draft))
  const [visualOpen, setVisualOpen] = useState(false)
  const [cardOpen, setCardOpen] = useState(false)
  return <motion.div animate={feedback} style={{ outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'var(--primary)' }} className="rounded-full flex max-w-full flex-wrap items-start gap-3"><Popover open={cardOpen} onOpenChange={value => { if (value || !visualOpen) setCardOpen(value) }}><motion.div layoutId="brand-card" className="min-w-0 max-w-64 rounded-full"><PopoverTrigger asChild><Button variant="outline" size="sm" className="rounded-full" aria-label={`Open ${draft.name || 'brand'} card`}>
    <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-white">{draft.logoUrl ? <img src={draft.logoUrl} alt="" className="max-h-full max-w-full object-contain" /> : <span className="size-3 rounded-full bg-muted" />}</span>
    <span className="max-w-32 truncate text-xs">{draft.name || 'Your brand'}</span>
  </Button></PopoverTrigger></motion.div><PopoverContent side="top" align="center" sideOffset={12} collisionPadding={12} className="max-h-[calc(100svh-10rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-[1.4rem] border-0 bg-transparent p-0 shadow-none" aria-label="Brand card">
    <StudioBrand snapshot={snapshot} draft={draft} onChange={onChange} surfaceId="brand-card-popover" onVisualOpenChange={setVisualOpen} />
  </PopoverContent></Popover></motion.div>
}
