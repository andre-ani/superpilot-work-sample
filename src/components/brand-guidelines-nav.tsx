import { Button } from '@/components/ui/button'

export type BrandGuidelineSectionId = 'overview' | 'research' | 'typography' | 'colors' | 'style' | 'references' | `info-${string}`

export const BRAND_GUIDELINE_SECTIONS: { id: BrandGuidelineSectionId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'research', label: 'Brand research' },
  { id: 'typography', label: 'Typography' },
  { id: 'colors', label: 'Color palettes' },
  { id: 'style', label: 'Visual style' },
  { id: 'references', label: 'References' },
]

export function BrandGuidelinesNav({ activeSection, canScroll, onSelect, sections = BRAND_GUIDELINE_SECTIONS }: {
  sections?: { id: BrandGuidelineSectionId; label: string }[]; activeSection: BrandGuidelineSectionId; canScroll: boolean; onSelect: (id: BrandGuidelineSectionId) => void
}) {
  return <nav aria-label="Brand information sections" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
    <div className="relative ml-1">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-border" />
      {sections.map(section => {
        const active = section.id === activeSection
        return <Button key={section.id} type="button" variant="ghost" size="sm" className={`relative h-9 w-full justify-start rounded-md pl-4 pr-2 text-left text-xs ${active ? 'bg-muted/55 text-foreground' : 'text-muted-foreground hover:text-foreground'}`} aria-current={active ? 'location' : undefined} onClick={() => onSelect(section.id)}>
          {canScroll && active ? <span aria-hidden="true" className="absolute top-1/2 left-0 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary" /> : null}
          {section.label}
        </Button>
      })}
    </div>
  </nav>
}
