import { useEffect, useId, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IconCheck, IconChevronDown, IconLoader2 } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { useBrandFonts } from '@/components/use-brand-fonts'
import { FONT_OPTIONS } from '@/lib/font-options'

export function FontPicker({ value, label, sourceUrl, onChange, onEditStart, style, readOnly = false, placeholder = 'Choose font' }: {
  value: string; label: string; sourceUrl: string; onChange: (family: string) => void; onEditStart?: () => void
  style?: CSSProperties; readOnly?: boolean; placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(value || 'Inter')
  const [preview, setPreview] = useState(value || 'Inter')
  const reduced = useReducedMotion()
  const listId = useId()
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => setPreview(highlighted || value || 'Inter'), 150)
    return () => clearTimeout(timer)
  }, [open, highlighted, value])
  const fonts = useBrandFonts(open ? sourceUrl : '', preview, '')
  const options = [...new Map([value, ...FONT_OPTIONS].filter(Boolean).map(name => [name.toLowerCase(), name])).values()]
  const search = query.trim().replace(/\s+/g, ' ')
  const matches = options.filter(name => name.toLowerCase().includes(search.toLowerCase()))
  const custom = search && !options.some(name => name.toLowerCase() === search.toLowerCase()) ? search : null
  const choose = (family: string) => { onChange(family); setOpen(false) }
  const loading = !!sourceUrl && (!fonts.heading && !fonts.warnings.length || preview !== highlighted)
  return <Popover open={open} onOpenChange={next => {
    if (readOnly) return
    setOpen(next)
    if (next) { setQuery(''); setHighlighted(value || 'Inter'); setPreview(value || 'Inter'); onEditStart?.() }
  }}>
    <PopoverTrigger asChild><Button type="button" role="combobox" aria-label={label} aria-controls={listId} aria-expanded={open} disabled={readOnly} variant="editable" size="editable-font" className="max-w-full gap-1 disabled:opacity-100">
      <span className="grid min-w-0"><AnimatePresence initial={false}><motion.span key={style?.fontFamily ?? 'app-font'} style={style} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduced?0:.16}} className="col-start-1 row-start-1 truncate">{value || placeholder}</motion.span></AnimatePresence></span>
      <IconChevronDown className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </Button></PopoverTrigger>
    <PopoverContent align="start" className="w-64 p-0" collisionPadding={12}>
      <Command density="compact" shouldFilter={false} value={highlighted} onValueChange={setHighlighted}>
        <CommandInput aria-label={`Search ${label.toLowerCase()}`} placeholder="Find a font or type a name…" value={query} maxLength={100} onValueChange={setQuery} />
        <CommandList id={listId}><CommandEmpty>No matching fonts.</CommandEmpty>
          <CommandGroup>{matches.map(name => <CommandItem key={name} value={name} onSelect={() => choose(name)}><span className="min-w-0 flex-1 truncate" style={preview === name ? fonts.heading : undefined}>{name}</span>{name === value ? <IconCheck aria-hidden="true" /> : null}</CommandItem>)}
            {custom ? <CommandItem value={custom} onSelect={() => choose(custom)}><span className="truncate">Use “{custom}”</span></CommandItem> : null}
          </CommandGroup>
        </CommandList>
      </Command>
      <div className="space-y-1 border-t px-3 py-3" aria-live="polite" aria-busy={loading}>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{preview}</span>{loading ? <IconLoader2 className="size-3 animate-spin" aria-label="Loading font preview" /> : fonts.resolution?.heading.substituted ? <span>Using {fonts.resolution.heading.resolvedFamily}</span> : null}</div>
        <p style={fonts.heading} className="text-xl leading-8">Aa Bb 012345</p>
      </div>
    </PopoverContent>
  </Popover>
}
