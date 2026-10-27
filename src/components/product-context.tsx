import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { IconPlus, IconX } from '@tabler/icons-react'
import { useContextFeedback } from '@/components/use-context-feedback'
import { useContextChange } from '@/components/use-context-change'
import { ContextChangeNotice } from '@/components/context-change-notice'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command'
import { ProductDetails, type ProductDetailsState } from '@/components/product-details'
import { ProductImage } from '@/components/product-image'
import { productReferences, selectProduct, selectionImages, type ProductSelection } from '@/lib/product-selection'
import type { CatalogPage, CatalogProduct } from '@/lib/catalog'

const pulseStyle = { outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'var(--primary)' } as const
export function ProductContext({ selection, onSelect, onRemove, row = false }: { selection: ProductSelection; onSelect: (selection: ProductSelection) => void; onRemove: () => void; row?: boolean }) {
  const signature = JSON.stringify(productReferences([selection]))
  const feedback = useContextFeedback(signature)
  const [open, setOpen] = useState(false), [expanded, setExpanded] = useState(false)
  const [detailState, setDetailState] = useState<ProductDetailsState>(() => ({ selection, showOtherImages: false }))
  useEffect(() => {
    if (JSON.stringify(detailState.selection ? productReferences([detailState.selection]) : null) !== signature) setDetailState({ selection, showOtherImages: false })
  }, [signature])
  const details = { product: selection.product, selection, onSelect, onDone: () => { setExpanded(false); setOpen(false) }, state: detailState, onStateChange: setDetailState }
  return <>
    <Popover open={open} onOpenChange={setOpen}><motion.div animate={feedback} style={pulseStyle} className={row ? 'flex min-h-10 w-full items-center rounded-lg' : 'flex h-8 max-w-full items-center rounded-full border bg-background shadow-xs'}><PopoverTrigger asChild><Button variant="ghost" size="sm" className={row ? 'h-auto min-w-0 flex-1 justify-start gap-2 px-1 py-1' : 'h-full min-w-0 rounded-l-full rounded-r-none'} aria-label={`Refine context for ${selection.product.title}`}><ProductImage src={selection.image} title="" className="size-6 shrink-0 rounded" /><span className="min-w-0 text-left"><span className={row ? 'block truncate text-xs' : 'block max-w-32 truncate text-xs'}>{selection.product.title}</span>{row ? <span className="block truncate text-[10px] font-normal text-muted-foreground">{selection.allVariants ? 'All variants' : selection.variant.title === 'Default Title' ? 'Product' : selection.variant.title} · {selectionImages(selection).length} images</span> : null}</span>{!row ? <span className="text-[10px] text-muted-foreground">{selectionImages(selection).length}</span> : null}</Button></PopoverTrigger><Button variant="context-remove" size="icon-xs" className="mr-1 shrink-0 rounded-full" aria-label={`Deselect ${selection.product.title}`} onClick={onRemove}><IconX /></Button></motion.div><PopoverContent side="top" align="start" className="flex max-h-[min(65svh,var(--radix-popover-content-available-height))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden p-0"><ProductDetails {...details} compact onExpand={() => { setOpen(false); setExpanded(true) }} /></PopoverContent></Popover>
    <Dialog open={expanded} onOpenChange={next => { setExpanded(next); if (!next) setOpen(true) }}><DialogContent showCloseButton={false} style={{ width: 'min(70rem, calc(100vw - 2rem))' }} className="flex max-h-[88svh] max-w-none flex-col overflow-hidden p-0 sm:max-w-none" aria-describedby={undefined}><DialogTitle className="sr-only">{selection.product.title}</DialogTitle><ProductDetails {...details} expanded onReturn={() => { setExpanded(false); setOpen(true) }} /></DialogContent></Dialog>
  </>
}

export function ProductContexts({ selections, onSelect, onRemove, onClear, catalog }: { selections: ProductSelection[]; onSelect: (selection: ProductSelection) => void; onRemove: (productId: string) => void; onClear?: () => void; catalog?: CatalogPage }) {
  const feedback = useContextFeedback(JSON.stringify(productReferences(selections)))
  const notice = useContextChange(selections.map(item => ({ id: item.product.id, label: item.product.title, references: selectionImages(item) })))
  const [open, setOpen] = useState(false), [keepStack, setKeepStack] = useState(false), [query, setQuery] = useState('')
  const [candidate, setCandidate] = useState<CatalogProduct | null>(null)
  const results = (catalog?.products ?? []).filter(product => !selections.some(item => item.product.id === product.id) && `${product.title} ${product.type} ${product.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())).slice(0, 12)
  function renderContent() {
  if (!selections.length && !keepStack) return null
  if (selections.length > 2 || keepStack) return <motion.div animate={feedback} className="rounded-full" style={pulseStyle}><Popover open={open} onOpenChange={next => { setOpen(next); if (next) setKeepStack(true) }}><PopoverTrigger asChild><Button variant="outline" size="sm" className="rounded-full" aria-label={`Review ${selections.length} selected products`}><span className="flex -space-x-2">{selections.slice(0, 3).map(selection => <ProductImage key={selection.product.id} src={selection.image} title="" className="size-6 rounded-full border-2 border-background" />)}</span><span className="text-xs">{selections.length} products</span></Button></PopoverTrigger><PopoverContent side="top" align="start" className="max-h-[70svh] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-xl p-3" onCloseAutoFocus={() => { setKeepStack(false); setCandidate(null) }}>
    <div className="mb-2 flex items-center justify-between gap-2"><p className="text-sm font-medium">Selected products</p>{selections.length ? <Button variant="ghost" size="xs" onClick={() => { if (onClear) onClear(); else selections.forEach(selection => onRemove(selection.product.id)) }}>Clear all</Button> : null}</div>
    <div className="max-h-[30svh] overflow-y-auto">{selections.map(selection => <ProductContext key={selection.product.id} row selection={selection} onSelect={onSelect} onRemove={() => onRemove(selection.product.id)} />)}{!selections.length ? <p className="py-2 text-xs text-muted-foreground">No products selected.</p> : null}</div>
    {catalog ? <div className="mt-2 border-t pt-2"><Command density="compact" shouldFilter={false}><CommandInput placeholder="Find another product…" aria-label="Find another product" value={query} onValueChange={setQuery} /><CommandList><CommandEmpty>No matching products.</CommandEmpty>{results.map(product => <CommandItem key={product.id} value={product.id} onSelect={() => { if (product.variants.length > 1) setCandidate(product); else onSelect(selectProduct(product)); setQuery('') }}><ProductImage src={product.images[0]} title="" className="size-6 shrink-0 rounded" /><span className="min-w-0 flex-1 truncate">{product.title}</span><IconPlus className="size-3.5" /></CommandItem>)}</CommandList></Command>{candidate ? <div className="mt-2 border-t pt-2"><ProductDetails key={candidate.id} compact product={candidate} selection={selections.find(item => item.product.id === candidate.id)} onSelect={next => { onSelect(next); setCandidate(null) }} /></div> : null}</div> : null}
  </PopoverContent></Popover></motion.div>
  return <div className="flex min-w-0 max-w-full flex-wrap gap-2" aria-label="Selected products">{selections.map(selection => <ProductContext key={selection.product.id} selection={selection} onSelect={onSelect} onRemove={() => onRemove(selection.product.id)} />)}</div>
  }
  return <div className="relative min-w-0 max-w-full"><ContextChangeNotice notice={notice} />{renderContent()}</div>
}
