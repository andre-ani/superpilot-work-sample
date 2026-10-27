import { useEffect, useState } from 'react'
import { IconArrowsMaximize, IconCheck, IconPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProductImage } from '@/components/product-image'
import { productImages, variantImages, productReferences, selectProduct, selectionImages, type ProductSelection } from '@/lib/product-selection'
import type { CatalogProduct } from '@/lib/catalog'
export type { ProductSelection } from '@/lib/product-selection'

export type ProductDetailsState = { selection: ProductSelection | null; showOtherImages: boolean }
type Props = { expanded?: boolean; onReturn?: () => void; compact?: boolean; onExpand?: () => void; state?: ProductDetailsState; onStateChange?: (state: ProductDetailsState) => void; product: CatalogProduct; currency?: string | null; onVisibleImageCount?: (count: number) => void; onDone?: () => void; onRemove?: () => void; selection?: ProductSelection | null; onSelect: (selection: ProductSelection) => void }
export function ProductDetails({ expanded = false, onReturn, compact = false, onExpand, state: controlledState, onStateChange, product, selection, onSelect, onDone, onVisibleImageCount }: Props) {
  const selected = selection?.product.id === product.id ? selection : null
  const selectionKey = JSON.stringify(selected ? productReferences([selected]) : null)
  const initial = () => selected ?? (product.variants.length === 1 ? selectProduct(product) : null)
  const [internalState, setInternalState] = useState<ProductDetailsState>(() => ({ selection: initial(), showOtherImages: false }))
  const state = controlledState ?? internalState
  const setState = (next: ProductDetailsState) => { setInternalState(next); onStateChange?.(next) }
  const current = state.selection
  useEffect(() => {
    const currentKey = JSON.stringify(current ? productReferences([current]) : null)
    if (selected && selectionKey !== currentKey || current && current.product.id !== product.id) setState({ selection: initial(), showOtherImages: false })
  }, [product.id, selectionKey])
  const gallery = productImages(product)
  const included = current ? selectionImages(current) : []
  const images = gallery
  useEffect(() => { onVisibleImageCount?.(images.length) }, [images.length, onVisibleImageCount])
  function update(next: ProductSelection) { setState({ selection: next, showOtherImages: true }) }
  function chooseImages(urls: string[]) {
    const matches = product.variants.filter(variant => urls.every(url => variantImages(product, variant.id).includes(url)))
    const variant = matches.length === 1 ? matches[0] : undefined
    update(selectProduct(product, variant?.id, urls, current?.image, !variant && product.variants.length > 1))
  }
  function chooseScope(value: string) {
    update(selectProduct(product, value === 'all' ? undefined : value, value === 'all' ? gallery : undefined, undefined, value === 'all'))
  }
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div className="shrink-0 space-y-3 p-4">
    <div className="flex items-start gap-2"><h3 className={`min-w-0 flex-1 font-medium break-words ${compact ? 'text-sm leading-5' : 'pr-10 text-base leading-6'}`}>{product.title}</h3>{onExpand ? <Button variant="ghost" size="icon-xs" className="shrink-0" aria-label="Expand product images" onClick={onExpand}><IconArrowsMaximize /></Button> : null}</div>
    {product.variants.length > 1 ? <Select value={current ? current.allVariants ? 'all' : current.variant.id : ''} onValueChange={chooseScope}><SelectTrigger aria-label="Variant selection" width="full"><SelectValue placeholder="Variant (optional)" /></SelectTrigger><SelectContent position="popper">{product.variants.map(variant => <SelectItem key={variant.id} value={variant.id}>{variant.title}</SelectItem>)}<SelectItem value="all">Any variant</SelectItem></SelectContent></Select> : null}
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
    <div className={expanded ? images.length === 1 ? 'grid grid-cols-1 justify-items-center gap-3' : images.length === 2 ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4' : compact ? 'grid grid-cols-3 gap-2' : images.length <= 2 ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 gap-2 md:grid-cols-3'} aria-label="Product reference images">
      {images.map((src, index) => {
        const chosen = included.includes(src)
        return <Button key={src} variant="product" size="product" className={expanded && images.length === 1 ? 'max-w-xl' : undefined} data-selected={chosen} aria-pressed={chosen} aria-label={`${chosen ? 'Deselect' : 'Select'} image ${index + 1}`} aria-disabled={included.length === 1 && chosen} onClick={() => {
          if (included.length === 1 && chosen) return
          const next = chosen ? included.filter(url => url !== src) : [...included, src]
          chooseImages(next)
        }}><span className="relative block w-full"><ProductImage src={src} title={`${product.title}, image ${index + 1}`} className={expanded ? 'max-h-[55svh]' : undefined} /><span className={`absolute grid place-items-center rounded-md shadow-sm ${compact ? 'top-1 right-1 size-5' : 'top-2 right-2 size-8'} ${chosen ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{chosen ? <IconCheck className={compact ? 'size-3' : 'size-4'} /> : <IconPlus className={compact ? 'size-3' : 'size-4'} />}</span></span></Button>
      })}
    </div>
    </div>
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-background px-4 py-3">
      <div className="min-w-0 text-xs"><p>{included.length} {included.length === 1 ? 'image' : 'images'} for context</p></div>
      <div className="flex items-center gap-1"><Button variant="ghost" size="xs" disabled={!images.length || included.length === images.length} onClick={() => chooseImages(images)}>Select all</Button><Button size="sm" disabled={!current?.image || !included.length} onClick={() => { if (current) { onSelect(current); (onDone ?? onReturn)?.() } }}>{selected ? 'Use these images' : 'Add to context'}</Button></div>
    </div>
  </div>
}
