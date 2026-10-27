import { motion } from 'motion/react'
import { IconDatabase } from '@tabler/icons-react'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function BrandCacheToggle({ cacheEnabled, available, onCacheChange }: { cacheEnabled: boolean; available: boolean; onCacheChange: (enabled: boolean) => void }) {
  return <label className={`pointer-events-auto flex w-fit cursor-pointer items-center gap-2 rounded-full border bg-background/90 px-3 py-2 text-xs shadow-xs backdrop-blur-md ${available ? 'border-primary/30' : 'text-muted-foreground'}`}><IconDatabase className={`size-3.5 ${available ? 'text-primary' : ''}`} aria-hidden="true" /><span>{available ? `Brand cache ${cacheEnabled ? 'on' : 'off'}` : 'No saved brand data'}</span><Switch aria-label="Reuse saved brand data" checked={available && cacheEnabled} disabled={!available} onCheckedChange={onCacheChange} /></label>
}
export function StudioDebug({ cacheEnabled, onCacheChange }: {
  cacheEnabled: boolean; onCacheChange: (enabled: boolean) => void
}) {
  return <TooltipProvider delayDuration={250}><motion.aside aria-label="Debug options" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: .16 }} className="fixed right-3 bottom-4 z-50">
    <Tooltip><TooltipTrigger asChild><span className="inline-flex"><BrandCacheToggle cacheEnabled={cacheEnabled} available onCacheChange={onCacheChange} /></span></TooltipTrigger><TooltipContent side="left">Reuse saved brand and product data on your next scan. Matching images are always reused.</TooltipContent></Tooltip>
  </motion.aside></TooltipProvider>
}
