import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IconCheck, IconMinus } from '@tabler/icons-react'

export function ContextChangeNotice({ notice }: { notice: { id: number; text: string; removed: boolean } | null }) {
  const reduced = useReducedMotion()
  return <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-max max-w-[min(24rem,calc(100vw-2rem))]" role="status" aria-live="polite" aria-atomic="true"><AnimatePresence mode="wait">{notice ? <motion.div key={notice.id} initial={{ opacity: 0, y: reduced ? 0 : 6, scale: reduced ? 1 : .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reduced ? 0 : -4 }} transition={{ duration: reduced ? 0 : .18 }} className="flex items-center gap-2 rounded-full bg-foreground px-3 py-2 text-xs text-background shadow-lg">{notice.removed ? <IconMinus className="size-3.5 shrink-0" /> : <IconCheck className="size-3.5 shrink-0" />}<span className="truncate">{notice.text}</span></motion.div> : null}</AnimatePresence></div>
}
