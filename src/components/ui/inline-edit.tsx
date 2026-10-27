import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IconPencil } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export function InlineEdit({ value, onChange, onEditStart, label, placeholder, multiline = false, maxLength = 300, appearance = 'body', style, readOnly = false, compact = false, noWrap = false }: {
  value: string; onChange: (value: string) => void; onEditStart?: () => void; label: string; placeholder: string; multiline?: boolean; maxLength?: number; appearance?: 'name' | 'body' | 'font' | 'card-title' | 'card-copy'; style?: CSSProperties; readOnly?: boolean; compact?: boolean; noWrap?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const before = useRef(value)
  const trigger = useRef<HTMLButtonElement>(null)
  const editor = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const reducedMotion = useReducedMotion()
  const transition = { duration: reducedMotion ? 0 : 0.16, ease: 'easeInOut' as const }
  useEffect(() => { if (readOnly) setEditing(false); else if (editing) editor.current?.focus({ preventScroll: true }) }, [editing,readOnly])
  function finish(cancel = false) {
    if (cancel) onChange(before.current)
    setEditing(false)
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }))
  }
  function keydown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === 'Escape') { event.preventDefault(); finish(true) }
    if (event.key === 'Enter' && (!multiline || event.metaKey || event.ctrlKey)) { event.preventDefault(); finish() }
  }
  const { fontFamily: displayFamily, ...controlStyle } = style ?? {}
  const props = { ref: (element: HTMLInputElement | HTMLTextAreaElement | null) => { editor.current = element }, 'aria-label': label, value, style, maxLength, placeholder, tabIndex: editing ? 0 : -1, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value), onBlur: () => setEditing(false), onKeyDown: keydown }
  return <div className="relative w-full">
    <motion.div initial={false} animate={{ opacity: editing ? 0 : 1 }} transition={transition} inert={editing} aria-hidden={editing}>
      <Button ref={trigger} style={controlStyle} disabled={readOnly} className={cn(readOnly && 'disabled:opacity-100', compact && 'focus-visible:border-input focus-visible:bg-muted/40')} variant={appearance === 'card-copy' ? 'editable-text' : 'editable'} size={appearance === 'card-title' ? 'card-title' : appearance === 'card-copy' ? 'card-copy' : appearance === 'name' ? 'editable-name' : appearance === 'font' ? 'editable-font' : 'editable'} aria-label={readOnly?label:`Edit ${label.toLowerCase()}`} onClick={() => { before.current = value; onEditStart?.(); setEditing(true) }}>
    <span className={cn('grid min-w-0 flex-1', !value && 'text-muted-foreground')}><AnimatePresence initial={false}><motion.span key={displayFamily ?? 'app-font'} style={{ fontFamily: displayFamily ?? 'var(--font-sans)' }} className={cn('col-start-1 row-start-1', noWrap ? 'whitespace-nowrap' : 'whitespace-pre-wrap break-words')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>{value || placeholder}</motion.span></AnimatePresence></span>{!readOnly?<span aria-hidden="true" className={cn('inline-flex size-4 shrink-0 items-center justify-center', multiline && 'self-end mb-0.5', compact || appearance.startsWith('card-') ? 'opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100' : 'opacity-40')}><IconPencil className="size-3.5 text-muted-foreground" /></span>:null}
      </Button>
    </motion.div>
    <AnimatePresence initial={false}>{editing&&!readOnly ? <motion.div key="editor" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
      {multiline ? <Textarea {...props} variant={appearance === 'card-copy' ? 'inline-card-copy' : 'inline'} /> : <Input {...props} variant={appearance === 'card-title' ? 'card-title' : appearance === 'name' ? 'inline-name' : 'inline'} />}
    </motion.div> : null}</AnimatePresence>
  </div>
}
