import { useMemo, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import { IconArrowLeft, IconCheck, IconPlus, IconArrowsMaximize, IconLoader2, IconSearch, IconX } from '@tabler/icons-react'
import { ProductContexts } from '@/components/product-context'
import { ProductImage } from '@/components/product-image'
import { ProductDetails, type ProductSelection } from '@/components/product-details'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import styles from './product-picker.module.css'
import { productImages, selectProduct } from '@/lib/product-selection'
import { Skeleton } from '@/components/ui/skeleton'
import { StoreFavicon } from '@/components/store-favicon'
import { filterProducts, type CatalogPage, type CatalogProduct, type CatalogFilters } from '@/lib/catalog'

const defaults: CatalogFilters = { query: '', type: 'all', availability: 'all', sort: 'store' }

export type ProductPickerProps = {
  catalog: CatalogPage | null
  store: string
  loading?: boolean
  loadingMore?: boolean
  error?: string
  selections?: ProductSelection[]
  onRemove?: (productId: string) => void
  selection?: ProductSelection | null
  onLoadMore?: () => void
  onSelect?: (selection: ProductSelection) => void
  onClearSelection?: () => void
  onChangeStore?: () => void
  embedded?: boolean
  filters?: CatalogFilters
  onFiltersChange?: (filters: CatalogFilters) => void
  pageActions?: ReactNode
  hideControls?: boolean
  scopeNote?: string
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} width="full"><SelectValue /></SelectTrigger><SelectContent position="popper">{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
}

export function ProductPicker({ catalog, store, loading = false, loadingMore = false, error = '', selections, onRemove, selection, onLoadMore, onSelect, onClearSelection, onChangeStore, embedded = false, filters: controlledFilters, onFiltersChange, hideControls = false, pageActions, scopeNote }: ProductPickerProps) {
  const [localFilters, setLocalFilters] = useState(defaults)
  const filters = controlledFilters ?? localFilters
  const setFilters = (next: CatalogFilters | ((current: CatalogFilters) => CatalogFilters)) => { const value = typeof next === 'function' ? next(filters) : next; if (onFiltersChange) onFiltersChange(value); else setLocalFilters(value) }
  const [preview, setPreview] = useState<CatalogProduct | null>(null)
  const [localSelected, setSelected] = useState<ProductSelection[]>([])
  const selectedItems = selections ?? (selection === undefined ? localSelected : selection ? [selection] : [])
  const [previewImageCount, setPreviewImageCount] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewOrigin, setPreviewOrigin] = useState<CSSProperties>({})
  const previewTrigger = useRef<HTMLButtonElement | null>(null)
  function openPreview(product: CatalogProduct, trigger: HTMLButtonElement) {
    const rect = trigger.closest('[data-product-card]')!.getBoundingClientRect()
    previewTrigger.current = trigger
    setPreviewOrigin({ '--card-x': `${rect.left + rect.width / 2 - window.innerWidth / 2}px`, '--card-y': `${rect.top + rect.height / 2 - window.innerHeight / 2}px`, '--card-scale': Math.min(1, rect.width / Math.min(productImages(product).length > 2 ? 896 : 416, window.innerWidth - 32)) } as CSSProperties)
    setPreviewImageCount(productImages(product).length); setPreview(product); setPreviewOpen(true)
  }
  function choose(value: ProductSelection) { setSelected(current => [...current.filter(item => item.product.id !== value.product.id), value]); onSelect?.(value) }
  function remove(productId: string) { setSelected(current => current.filter(item => item.product.id !== productId)); if (onRemove) onRemove(productId); else onClearSelection?.() }
  const products = useMemo(() => filterProducts(catalog?.products ?? [], filters), [catalog, filters])
  const types = useMemo(() => [...new Set(catalog?.products.map(p => p.type) ?? [])].sort(), [catalog])
  const filterActive = filters.query !== '' || filters.type !== 'all' || filters.availability !== 'all'
  const Container = embedded ? 'section' : 'main'
  return <Container className={embedded ? 'pb-6' : 'mx-auto max-w-[1440px] px-6 pt-6 pb-36 sm:px-10'}>
    {!embedded ? <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {onChangeStore ? <Button variant="link" className="mb-3" onClick={onChangeStore}><IconArrowLeft aria-hidden="true" /> Change store</Button> : <Button variant="link" asChild className="mb-3"><Link to="/"><IconArrowLeft aria-hidden="true" /> Change store</Link></Button>}
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Choose products</h1>
        <p className="mt-3 text-muted-foreground">Add the products and images you want in your ad.</p>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><StoreFavicon store={catalog?.storeUrl ?? store} />{(catalog?.storeUrl ?? store).replace(/^https?:\/\//, '')}</p>
    </div> : null}
    {!hideControls ? <div className="grid grid-cols-2 gap-3 border-y py-4 lg:grid-cols-[minmax(240px,1fr)_190px_170px_170px]">
      <div className="relative col-span-2 lg:col-span-1"><IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input variant="search" aria-label="Search products" placeholder="Search products, types, or tags" value={filters.query} onChange={e => setFilters(f => ({ ...f, query: e.target.value }))} disabled={loading} />
      </div>
      <FilterSelect label="Product type" value={filters.type} onChange={type => setFilters(f => ({ ...f, type }))} options={[{ value: 'all', label: 'All product types' }, ...types.map(type => ({ value: type, label: type }))]} />
      <FilterSelect label="Availability" value={filters.availability} onChange={availability => setFilters(f => ({ ...f, availability }))} options={[{ value: 'all', label: 'All availability' }, { value: 'available', label: 'In stock' }, { value: 'sold-out', label: 'Sold out' }]} />
      <div className="col-span-2 lg:col-span-1"><FilterSelect label="Sort products" value={filters.sort} onChange={sort => setFilters(f => ({ ...f, sort }))} options={[{ value: 'store', label: 'Store order' }, { value: 'name-asc', label: 'Name: A to Z' }, { value: 'name-desc', label: 'Name: Z to A' }, { value: 'price-asc', label: 'Price: low to high' }, { value: 'price-desc', label: 'Price: high to low' }]} /></div>
    </div> : null}
    <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 py-4 text-sm text-muted-foreground">
      <p aria-live="polite">{loading ? 'Loading products…' : catalog?.totalCount !== undefined ? `${products.length} of ${catalog.totalCount} products` : `${products.length} loaded products${catalog?.hasMore ? catalog.totalCountStatus === 'unavailable' ? ' · total unavailable' : ' · counting catalog…' : ''}`}</p>
      <div className="flex items-center gap-2">{pageActions}{filterActive ? <Button variant="ghost" size="sm" onClick={() => setFilters(f => ({ ...defaults, sort: f.sort }))}><IconX aria-hidden="true" /> Clear filters</Button> : null}</div>
    </div>
    {loading ? <div className="grid grid-cols-2 gap-x-5 gap-y-7 md:grid-cols-3 xl:grid-cols-4" aria-label="Loading products" aria-busy="true">{Array.from({ length: 8 }, (_, index) => <div key={index} className="space-y-3"><Skeleton className="aspect-square rounded-xl" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/3" /></div>)}</div>
      : products.length ? <div className="grid grid-cols-2 gap-x-5 gap-y-7 md:grid-cols-3 xl:grid-cols-4" aria-label="Products">
        {products.map(product => {
          const selected = selectedItems.find(item => item.product.id === product.id)
          const added = !!selected
          const images = productImages(product)
          return <div key={product.id} data-product-card className={`relative min-w-0 h-full group/selection-card ${styles.card}`}>
                <Button variant="product" size="product" className="h-full" data-selected={added} aria-label={added ? `Deselect ${product.title}` : `Select ${product.title}`} disabled={!product.variants.length || !images.length} onClick={event => { if (added) remove(product.id); else if (product.variants.length > 1) openPreview(product, event.currentTarget); else choose(selectProduct(product)) }}>
                  <span className="relative block w-full"><ProductImage src={images[0]} title={product.title} /></span>
                  <span className="flex w-full flex-col gap-1 p-3"><span className="line-clamp-2 min-h-10 text-sm leading-5 font-medium">{product.title}</span><span className="text-xs font-normal text-muted-foreground">{added ? 'Selected' : `${images.length} images`}{product.variants.length > 1 ? ` · ${product.variants.length} variants` : ''}</span></span>
                </Button>
                <div className="absolute top-2 right-2 flex flex-col items-end gap-1"><Button variant={added ? 'context-selected' : 'context-add'} size="icon-sm" className={`w-auto min-w-8 gap-0 px-2 ${styles.contextAction}`} data-included={added} aria-label={added ? `Remove ${product.title} from context` : product.variants.length > 1 ? `Choose images for ${product.title}` : `Add ${product.title} to context`} aria-pressed={added} disabled={!product.variants.length || !images.length} onClick={event => { if (added) remove(product.id); else if (product.variants.length > 1) openPreview(product, event.currentTarget); else choose(selectProduct(product)) }}><span className={styles.contextLabel}>{added ? <><span className={styles.includedLabel}>Included in context</span><span className={styles.removeLabel}>Remove from context</span></> : product.variants.length > 1 ? 'Choose images' : 'Add to context'}</span>{added ? <span className={styles.contextIcon}><IconCheck className={styles.includedLabel} /><IconX className={styles.removeLabel} /></span> : <IconPlus />}</Button><Button variant="secondary" size="icon-sm" aria-label={`Explore images and variants for ${product.title}`} onClick={event => openPreview(product, event.currentTarget)}><IconArrowsMaximize /></Button></div>
          </div>
        })}
      </div> : <div className="py-20 text-center"><IconSearch className="mx-auto mb-4 size-7 text-muted-foreground" aria-hidden="true" /><h2 className="text-lg font-medium">{catalog?.products.length ? 'No products match' : 'No public products found'}</h2><p className="mt-2 text-sm text-muted-foreground">{catalog?.products.length ? 'Try a different search or clear your filters.' : 'Try another Shopify store with a public catalog.'}</p>{filterActive ? <Button variant="outline" className="mt-5" onClick={() => setFilters(defaults)}>Clear filters</Button> : null}</div>}
    {!loading ? <div className="mt-9 space-y-4 text-center">
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {catalog?.hasMore && catalog.page < 20 && onLoadMore ? <Button variant="outline" disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? <IconLoader2 className="animate-spin" aria-hidden="true" /> : null}{loadingMore ? 'Loading products…' : 'Load more products'}</Button> : null}
      <p className="text-xs text-muted-foreground">{scopeNote ?? (catalog?.hasMore ? catalog.page >= 20 ? 'Demo limit reached: 1,200 products. Search and sort cover loaded products only.' : 'Search, filters, and sorting apply to loaded products. Load more to expand the catalog.' : 'All products returned by this public catalog are loaded.')}{catalog?.skipped ? ` ${catalog.skipped} incomplete records were skipped.` : ''}</p>
    </div> : null}
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent style={{ ...previewOrigin, width: `min(${previewImageCount > 2 ? '56rem' : '26rem'}, calc(100vw - 2rem))` }} className={`${styles.dialog} flex max-h-[88svh] max-w-none flex-col overflow-hidden p-0 sm:max-w-none`} aria-describedby={undefined} onCloseAutoFocus={event => { event.preventDefault(); previewTrigger.current?.focus({ preventScroll: true }) }}>
        <DialogTitle className="sr-only">{preview?.title ?? 'Product details'}</DialogTitle>
        {preview ? preview.variants.length ? <ProductDetails key={preview.id} product={preview} selection={selectedItems.find(item => item.product.id === preview.id)} onSelect={choose} onDone={() => setPreviewOpen(false)} onVisibleImageCount={setPreviewImageCount} /> : <p className="p-4 text-sm text-muted-foreground">This product has no usable variants in the catalog.</p> : null}
      </DialogContent>
    </Dialog>
    {selectedItems.length && !embedded ? <div className="fixed right-0 bottom-0 left-0 z-30 px-6 py-4 sm:px-10"><ProductContexts selections={selectedItems} onSelect={choose} onRemove={remove} /></div> : null}
  </Container>
}
