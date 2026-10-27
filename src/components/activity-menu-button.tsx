import type { Ref } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'

const menu = ['M5 6 C8 6 16 6 19 6', 'M5 12 C8 12 16 12 19 12', 'M5 18 C8 18 16 18 19 18']
const close = ['M6 6 C10 10 14 14 18 18', 'M12 12 C12 12 12 12 12 12', 'M6 18 C10 14 14 10 18 6']

export function ActivityMenuButton({ open, onClick, buttonRef }: { open: boolean; active?: boolean; onClick: () => void; buttonRef?: Ref<HTMLButtonElement> }) {
  const reduced = useReducedMotion()
  const paths = open ? close : menu
  return <Button ref={buttonRef} variant="ghost" size="icon" className="size-9" aria-label={open ? 'Close conversation' : 'Open conversation'} aria-expanded={open} aria-controls="workspace-sidebar" onClick={onClick}>
    <motion.svg initial={false} viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"
      >
      {paths.map((d, index) => <motion.path key={index} animate={{ d, opacity: open && index === 1 ? 0 : 1 }} transition={{ duration: reduced ? 0 : 0.16 }} />)}
    </motion.svg>
  </Button>
}
