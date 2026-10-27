import { useState, type RefCallback } from 'react'
import { IconPlus, IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { ColorPicker } from '@/components/ui/color-picker'
import { Skeleton } from '@/components/ui/skeleton'
import type { BrandInformationSection } from '@/lib/brand-actions'
import { Input } from '@/components/ui/input'
import { FontPicker } from '@/components/font-picker'
import { InlineEdit } from '@/components/ui/inline-edit'
import { brandReferenceSchema, MIN_PALETTE_COLORS, MAX_PALETTE_COLORS } from '@/lib/brand-actions'
import { ProductImage } from '@/components/product-image'
import { useBrandFonts } from '@/components/use-brand-fonts'
import type { BrandGuidelineSectionId } from '@/components/brand-guidelines-nav'

const NEW_PALETTE_COLOR = '#808080'
const isHexColor = (value: string) => /^#[a-f\d]{6}$/i.test(value)

function PaletteEditor({ label, values, onStart, onChange, readOnly }: {
  label: string; values: string[]; onStart?: () => void; onChange?: (value: string[]) => void; readOnly: boolean
}) {
  const [newColor, setNewColor] = useState<number | null>(null)
  const canAdd = values.length < MAX_PALETTE_COLORS
  const addColor = () => {
    if (readOnly || !canAdd || !onChange) return
    onStart?.()
    setNewColor(values.length)
    onChange([...values, NEW_PALETTE_COLOR])
  }
  return <div className="space-y-2" inert={readOnly}>
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium">{label}</p>
      <Button type="button" variant="ghost" size="icon-xs" aria-label={`Add color to ${label.toLowerCase()}`} disabled={!canAdd || !onChange} onClick={addColor}><IconPlus aria-hidden="true" /></Button>
    </div>
    {values.length ? <div className="flex min-h-10 items-center gap-1.5">
      {values.map((color, index) => isHexColor(color) ? <ColorPicker key={`${label}-${index}`} defaultOpen={newColor === index} label={`Edit ${label.toLowerCase()} color ${index + 1}`} value={color} onEditStart={onStart} onChange={next => onChange?.(values.map((value, i) => i === index ? next : value))} onRemove={() => { if (values.length > MIN_PALETTE_COLORS) onChange?.(values.filter((_, i) => i !== index)) }}>
        <Button type="button" variant="swatch" size="card-swatch" style={{ backgroundColor: color }} aria-label={`Edit ${label.toLowerCase()} color ${index + 1}, ${color}`} />
      </ColorPicker> : null)}
    </div> : <p className="text-xs text-muted-foreground">No colors added yet.</p>}
  </div>
}

function GuidelineSection({ id, title, register, children, loading = false }: {
  loading?: boolean; id: BrandGuidelineSectionId; title: string; register?: (id: BrandGuidelineSectionId) => RefCallback<HTMLElement>; children: React.ReactNode
}) {
  return <section id={`brand-guideline-${id}`} ref={register?.(id)} aria-labelledby={`brand-guideline-${id}-title`} aria-busy={loading} className="scroll-mt-6 space-y-4 border-b border-border/70 pb-8 last:border-b-0">
    <div className="space-y-1"><h2 id={`brand-guideline-${id}-title`} className={`text-base font-semibold tracking-tight ${loading ? 'composer-state-shimmer' : ''}`}>{title}</h2></div>
    {children}
  </section>
}

export function BrandVisualContext({ loading = false, informationSections = [], onInformationStart, onInformation, brandContext, onBrandContextStart, onBrandContext, description, headingFont, bodyFont, secondaryFont, colors, secondaryColors, style, references, sourceReferences, sourceUrl, readOnly = false, register, onDescriptionStart, onDescription, onHeadingFontStart, onHeadingFont, onBodyFontStart, onBodyFont, onSecondaryFontStart, onSecondaryFont, onColorsStart, onColors, onSecondaryColorsStart, onSecondaryColors, onStyleStart, onStyle, onReferences }: {
  loading?: boolean; informationSections?: BrandInformationSection[]; onInformationStart?: () => void; onInformation?: (sections: BrandInformationSection[]) => void
  brandContext?: string; onBrandContextStart?: () => void; onBrandContext?: (value: string) => void; description?: string; headingFont?: string; bodyFont?: string; secondaryFont?: string; colors?: string[]; secondaryColors?: string[]; style?: string; references?: string[]; sourceReferences?: string[]; sourceUrl?: string; readOnly?: boolean
  register?: (id: BrandGuidelineSectionId) => RefCallback<HTMLElement>
  onDescriptionStart: () => void; onDescription: (value: string) => void
  onHeadingFontStart: () => void; onHeadingFont: (value: string) => void
  onBodyFontStart: () => void; onBodyFont: (value: string) => void
  onSecondaryFontStart: () => void; onSecondaryFont: (value: string) => void
  onColorsStart?: () => void; onColors?: (value: string[]) => void; onSecondaryColorsStart?: () => void; onSecondaryColors?: (value: string[]) => void
  onStyleStart: () => void; onStyle: (value: string) => void; onReferences: (value: string[]) => void
}) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const fonts = useBrandFonts(sourceUrl ?? '', headingFont ?? '', bodyFont ?? '')
  const supportingFont = secondaryFont || (bodyFont && bodyFont !== headingFont ? bodyFont : '')
  const supportingFonts = useBrandFonts(sourceUrl ?? '', '', supportingFont)
  return <div className="space-y-10">
    <GuidelineSection id="overview" title="Overview" loading={loading && !description} register={register}>
      {loading && !description ? <Skeleton className="h-20 w-full" /> : <InlineEdit readOnly={readOnly} multiline label="Brand description" value={description ?? ''} placeholder="Add a short description" maxLength={240} onEditStart={onDescriptionStart} onChange={onDescription} />}
    </GuidelineSection>

    <GuidelineSection id="research" title="Brand research" loading={loading && !brandContext} register={register}>
      {loading && !brandContext ? <Skeleton className="h-32 w-full" /> : onBrandContext ? <div><InlineEdit readOnly={readOnly} multiline label="Brand story and positioning" value={brandContext ?? ''} placeholder="Add brand background" maxLength={6000} onEditStart={onBrandContextStart} onChange={onBrandContext} /></div> : null}
    </GuidelineSection>

    <GuidelineSection id="typography" title="Typography" register={register}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="min-w-0 space-y-2"><p className="text-xs font-medium text-muted-foreground">Heading font</p><FontPicker sourceUrl={sourceUrl ?? ''} readOnly={readOnly} label="Heading font" value={headingFont ?? ''} placeholder="Not identified" style={fonts.heading} onEditStart={onHeadingFontStart} onChange={onHeadingFont} />{fonts.resolution?.heading.substituted ? <p className="px-2 text-xs text-muted-foreground">Using {fonts.resolution.heading.resolvedFamily}</p> : null}</div>
        <div className="min-w-0 space-y-2"><p className="text-xs font-medium text-muted-foreground">Body font</p><FontPicker sourceUrl={sourceUrl ?? ''} readOnly={readOnly} label="Body font" value={bodyFont ?? ''} placeholder="Not identified" style={fonts.body} onEditStart={onBodyFontStart} onChange={onBodyFont} />{fonts.resolution?.body.substituted ? <p className="px-2 text-xs text-muted-foreground">Using {fonts.resolution.body.resolvedFamily}</p> : null}</div>
        <div className="min-w-0 space-y-2"><p className="text-xs font-medium text-muted-foreground">Supporting font</p><FontPicker sourceUrl={sourceUrl ?? ''} readOnly={readOnly} label="Supporting font" value={supportingFont} placeholder="Optional supporting font" style={supportingFonts.body} onEditStart={onSecondaryFontStart} onChange={onSecondaryFont} />{supportingFont && supportingFonts.resolution?.body.substituted ? <p className="px-2 text-xs text-muted-foreground">Using {supportingFonts.resolution.body.resolvedFamily}</p> : null}</div>
      </div>
    </GuidelineSection>

    <GuidelineSection id="colors" title="Color palettes" register={register}>
      {loading && !colors?.length ? <Skeleton className="h-14 w-full" /> : colors ? <div className="space-y-5"><PaletteEditor label="Primary palette" values={colors} readOnly={readOnly} onStart={onColorsStart} onChange={onColors} /><PaletteEditor label="Secondary palette" values={secondaryColors ?? []} readOnly={readOnly} onStart={onSecondaryColorsStart} onChange={onSecondaryColors} /></div> : <p className="text-sm text-muted-foreground">No palette colors are available yet.</p>}
    </GuidelineSection>

    <GuidelineSection id="style" title="Visual style" loading={loading && !style} register={register}>
      {loading && !style ? <Skeleton className="h-28 w-full" /> : <InlineEdit readOnly={readOnly} multiline label="Visual style" value={style ?? ''} placeholder="Add visual style" maxLength={1600} onEditStart={onStyleStart} onChange={onStyle} />}
    </GuidelineSection>

    <GuidelineSection id="references" title="References" register={register}>
      <div className="space-y-3">
        {loading && !references?.length ? <div className="flex gap-2">{[0,1,2].map(index => <Skeleton key={index} className="size-20 rounded-md" />)}</div> : references?.length ? <div className="flex flex-wrap gap-2">{references.map((reference, index) => <div key={`${reference}-${index}`} className="relative w-20"><ProductImage src={reference} title={`Brand visual reference ${index + 1}`} className="rounded-md" /><Button type="button" variant="secondary" size="icon-xs" className="absolute top-0 right-0" disabled={readOnly} aria-label={`Remove visual reference ${index + 1}`} onClick={() => onReferences(references.filter((_, i) => i !== index))}><IconX aria-hidden="true" /></Button></div>)}</div> : <p className="text-sm text-muted-foreground">No reference images selected.</p>}
        <form className="flex gap-1" onSubmit={event => {
          event.preventDefault()
          try {
            const next = brandReferenceSchema.parse(url.trim())
            onReferences([...new Set([...(references ?? []), next])]); setUrl(''); setError('')
          } catch { setError('Use a saved brand image or a public HTTPS image URL without a port.') }
        }}><Input aria-label="Visual reference image URL" placeholder="Image URL" value={url} disabled={readOnly} onChange={event => { setUrl(event.target.value); setError('') }} /><Button type="submit" variant="ghost" size="icon" aria-label="Add visual reference" disabled={readOnly || !url.trim()}><IconPlus aria-hidden="true" /></Button></form>
        {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}

      </div>
    </GuidelineSection>
    {informationSections.map(section => <GuidelineSection key={section.id} id={`info-${section.id}`} title={section.title} loading={section.status === 'loading'} register={register}>
      {section.status === 'loading' && !section.content ? <Skeleton className="h-24 w-full" /> : <InlineEdit readOnly={readOnly || section.status === 'loading'} multiline label={section.title} value={section.content} placeholder="" maxLength={6000} onEditStart={onInformationStart} onChange={content => onInformation?.(informationSections.map(current => current.id === section.id ? {...current, content} : current))} />}
    </GuidelineSection>)}
  </div>
}
