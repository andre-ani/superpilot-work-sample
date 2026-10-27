import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ThemeScope } from '@/components/ui/theme-scope'

export function StudioSidebar({ open, onOpenChange, headerHeight, menuRef, onMount, children, width, onWidthChange, onResizingChange }: {
  width: number; onWidthChange: (width: number) => void; onResizingChange: (resizing: boolean) => void
  open: boolean; onOpenChange: (open: boolean) => void; headerHeight: number; menuRef: RefObject<HTMLButtonElement | null>
  children?: ReactNode
  onMount: (node: HTMLDivElement | null) => void
}) {
  const reduced = useReducedMotion()
  const dragging = useRef(false)
  const clampWidth = (value: number) => Math.round(Math.max(288, Math.min(560, window.innerWidth - 16, value)))
  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      onOpenChange(false); menuRef.current?.focus({ preventScroll: true })
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [open, onOpenChange, menuRef])
  return <ThemeScope.Provider value="dark"><motion.aside id="workspace-sidebar" aria-label="Conversation" aria-hidden={!open} inert={!open}
    initial={false} animate={{ x: open ? 0 : '-100%' }} transition={{ duration: reduced ? 0 : .2, ease: [.22, 1, .36, 1] }}
    style={{ paddingTop: headerHeight, pointerEvents: open ? 'auto' : 'none' }}
    className="dark studio-sidebar-theme fixed inset-y-0 left-0 z-0 flex w-[var(--studio-sidebar-width,20rem)] max-w-[calc(100vw-1rem)] flex-col bg-background text-foreground">

    <div role="separator" tabIndex={open ? 0 : -1} aria-label="Resize conversation sidebar" aria-orientation="vertical" aria-valuemin={288} aria-valuemax={560} aria-valuenow={width} className="absolute inset-y-0 -right-1 z-30 w-2 touch-none cursor-col-resize outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:bg-transparent hover:after:bg-primary/50 focus-visible:after:bg-primary" onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); onResizingChange(true) }} onPointerMove={event => { if (dragging.current) onWidthChange(clampWidth(event.clientX)) }} onPointerUp={event => { dragging.current = false; onResizingChange(false); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }} onPointerCancel={() => { dragging.current = false; onResizingChange(false) }} onLostPointerCapture={() => { dragging.current = false; onResizingChange(false) }} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); onWidthChange(clampWidth(width + (event.key === 'ArrowLeft' ? -16 : 16))) } if (event.key === 'Home') onWidthChange(288); if (event.key === 'End') onWidthChange(clampWidth(560)) }} />
    <div ref={onMount} className="flex min-h-0 flex-1 flex-col">{children}</div>

  </motion.aside></ThemeScope.Provider>
}
