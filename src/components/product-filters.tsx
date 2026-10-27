import { IconAdjustmentsHorizontal } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CatalogPage, CatalogFilters } from '@/lib/catalog'

export function ProductFilters({ catalog, filters, onChange, onSearch, side = 'top' }: { catalog: CatalogPage; filters: CatalogFilters; onChange: (filters: CatalogFilters) => void; onSearch?: (query: string) => void; side?: 'top' | 'bottom' }) {
  const types = [...new Set(catalog.products.map(product => product.type))].sort()
  return <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className="rounded-full bg-background shadow-sm" aria-label="Product filters"><IconAdjustmentsHorizontal aria-hidden="true" />Filters</Button></PopoverTrigger><PopoverContent side={side} align="end" collisionPadding={12} className="w-72 space-y-3">
    <Input aria-label="Search products" placeholder="Search products…" value={filters.query} onChange={event => onSearch ? onSearch(event.target.value) : onChange({ ...filters, query: event.target.value })} />
    <Filter label="Product type" value={filters.type} onChange={type => onChange({ ...filters, type })} options={[["all", "All types"], ...types.map(type => [type, type])]} />
    <Filter label="Availability" value={filters.availability} onChange={availability => onChange({ ...filters, availability })} options={[["all", "All availability"], ["available", "In stock"], ["sold-out", "Sold out"]]} />
    <Filter label="Sort" value={filters.sort} onChange={sort => onChange({ ...filters, sort })} options={[["store", "Store order"], ["name-asc", "Name: A to Z"], ["name-desc", "Name: Z to A"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"]]} />
  </PopoverContent></Popover>
}
function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <div className="space-y-1.5"><span className="text-xs font-medium">{label}</span><Select value={value} onValueChange={onChange}><SelectTrigger width="full" aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{options.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
}
