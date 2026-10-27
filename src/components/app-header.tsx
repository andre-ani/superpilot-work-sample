import { Link } from '@tanstack/react-router'
import { useEffect, useRef, type ReactNode, type Ref } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ThemeScope } from '@/components/ui/theme-scope'
import { ActivityMenuButton } from '@/components/activity-menu-button'

export function AppHeader({ children, sidebar, actions, sidebarSettings, onHome, hasProgress = false, sidebarOpen = false, active = false, onSidebarToggle, menuRef, onHeightChange }: {
  children?: ReactNode; sidebar?: ReactNode; actions?: ReactNode; sidebarSettings?: ReactNode; onHome?: () => void
  hasProgress?: boolean; sidebarOpen?: boolean; active?: boolean; onSidebarToggle?: () => void; menuRef?: Ref<HTMLButtonElement>; onHeightChange?: (height: number) => void
}) {
  const header = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!header.current || !onHeightChange) return
    const update = () => onHeightChange(header.current!.getBoundingClientRect().height)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(header.current)
    return () => observer.disconnect()
  }, [onHeightChange])
  return <header ref={header} className="sticky top-0 z-50 grid grid-cols-[1fr_auto] items-center gap-3 bg-transparent px-5 py-4 sm:px-8 md:grid-cols-[auto_minmax(0,1fr)_auto]">
    <div className="app-header-frost pointer-events-none absolute inset-x-0 top-0 z-0" aria-hidden="true" />
    <div className="app-header-scrim pointer-events-none absolute inset-x-0 top-0 z-0" aria-hidden="true" />
    {sidebar}
    {sidebarOpen && sidebarSettings ? <ThemeScope.Provider value="dark"><div className="dark absolute top-4 z-20" style={{ left: 'calc(min(var(--studio-sidebar-width,20rem),calc(100vw - 1rem)) - 3.25rem)' }}>{sidebarSettings}</div></ThemeScope.Provider> : null}
    <ThemeScope.Provider value={sidebarOpen ? 'dark' : undefined}><div style={{ minWidth: sidebarOpen ? 'calc(var(--studio-sidebar-offset) - 2rem)' : undefined }} className={`sidebar-region-motion relative z-10 flex min-w-0 items-center gap-2 transition-[min-width] duration-200 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${sidebarOpen ? 'dark text-foreground' : ''}`}>
      <div className="size-9 shrink-0"><AnimatePresence initial={false}>{hasProgress && onSidebarToggle ? <motion.div key="workspace-menu" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.16 }}><ActivityMenuButton buttonRef={menuRef} open={sidebarOpen} active={active} onClick={onSidebarToggle} /></motion.div> : null}</AnimatePresence></div>
      <Link to="/" aria-label="Go to start" onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onHome?.() }} className="relative flex min-w-0 items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <img src="/brand/superpilot-logo.svg" alt="superpilot" width="137" height="24" className="h-6 w-auto dark:hidden" />
        <img src="/brand/superpilot-logo-light.svg" alt="" width="137" height="24" className="hidden h-6 w-auto dark:block" />
      </Link>
    </div></ThemeScope.Provider>
    {children ? <div className="relative z-10 order-3 col-span-2 min-w-0 w-full md:order-none md:col-span-1">{children}</div> : <div className="hidden md:block" />}

    <div className="relative z-10 justify-self-end rounded-full bg-transparent">{actions}</div>
  </header>
}
