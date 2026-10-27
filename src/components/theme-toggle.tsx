import { useEffect, useState } from 'react'
import { IconDots, IconPlus, IconSun, IconMoon } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

import { ProjectSessionItems } from '@/components/chat-project-menu'
import type { ChatProject } from '@/lib/project-chats'

export const themeStorageKey = 'superpilot-theme-v1'

export function ThemeToggle({ onProject, onNewConversation, currentStoreUrl }: { onProject?: (project: ChatProject) => void; onNewConversation?: () => void; currentStoreUrl?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-foreground" aria-label="Conversation menu"><IconDots aria-hidden="true" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-64 [&_[data-slot=dropdown-menu-item]]:text-[11px]">
        {onNewConversation ? <DropdownMenuItem onSelect={onNewConversation}><IconPlus className="size-3.5" />New conversation</DropdownMenuItem> : null}
        {onProject ? <ProjectSessionItems currentStoreUrl={currentStoreUrl} onProject={onProject} recentLimit={5} /> : null}

      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ThemeSwitch() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const update = () => setDark(document.documentElement.classList.contains('dark'))
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return <Button variant="ghost" size="icon" className="size-9" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    setDark(next)
    try { localStorage.setItem(themeStorageKey, next ? 'dark' : 'light') } catch {}
  }}>{dark ? <IconSun className="size-5" aria-hidden="true" /> : <IconMoon className="size-5" aria-hidden="true" />}</Button>
}
