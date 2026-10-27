import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IconPackage, IconPlus, IconSearch } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command'
import { ProductImage } from '@/components/product-image'
import type { CatalogPage } from '@/lib/catalog'

/** Counts are catalog facts; only the presentation settles, never invented progress. */
export function ProductDiscoveryChip({ count, discovering, announce, selectedCount, catalog, hidden, onProduct }: { count: number; discovering: boolean; announce: boolean; selectedCount: number; catalog: CatalogPage; hidden?: boolean; onProduct: (productId: string) => void }) {
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(false), [query, setQuery] = useState('')
  const matches = catalog.products.filter(product => `${product.title} ${product.type} ${product.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())).slice(0, 12)
  const [settled, setSettled] = useState(!discovering && !announce)
  useEffect(() => {
    if (discovering) { setSettled(false); return }
    if (!announce) { setSettled(true); return }
    setSettled(false)
    const timer = window.setTimeout(() => setSettled(true), 1400)
    return () => window.clearTimeout(timer)
  }, [count, discovering, announce])
  return <AnimatePresence>{!selectedCount && !hidden ? <motion.div key="product-discovery" layout initial={{opacity:0,y:reduced?0:6,scale:reduced?1:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:reduced?0:-4,scale:reduced?1:.96}} transition={{duration:reduced?0:.2}} className="min-w-0 rounded-full"><Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button variant="outline" size="sm" className="h-8 rounded-full bg-background text-xs shadow-xs" disabled={!count} aria-label={settled ? `Add products, ${count} available` : `Found ${count} products, add products`}><AnimatePresence mode="wait" initial={false}><motion.span key={settled?'select':'found'} initial={{opacity:0,y:reduced?0:3}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced?0:-3}} transition={{duration:reduced?0:.15}} className="inline-flex items-center gap-2">{settled ? <><IconPlus className="size-3.5"/>Add products</> : <><IconSearch className={`size-3.5 ${discovering?'animate-pulse motion-reduce:animate-none':''}`}/>Found <AnimatePresence mode="popLayout" initial={false}><motion.span key={count} initial={{opacity:0,y:reduced?0:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced?0:-5}} transition={{duration:reduced?0:.16}} className="inline-block tabular-nums">{count}</motion.span></AnimatePresence> products</>}</motion.span></AnimatePresence></Button></PopoverTrigger><PopoverContent data-chat-menu side="top" align="start" collisionPadding={12} className="w-[min(20rem,calc(100vw-2rem))] p-1"><Command density="compact" shouldFilter={false}><CommandInput aria-label="Find products to add" placeholder="Find products…" value={query} onValueChange={setQuery} /><CommandList><CommandEmpty>No matching products.</CommandEmpty>{matches.map(product => <CommandItem key={product.id} value={product.id} onSelect={() => { onProduct(product.id); setOpen(false); setQuery('') }}>{product.images[0] ? <ProductImage src={product.images[0]} title="" className="size-6 shrink-0 rounded" /> : <IconPackage className="size-4" />}<span className="truncate">{product.title}</span></CommandItem>)}</CommandList></Command></PopoverContent></Popover></motion.div> : null}</AnimatePresence>
}
