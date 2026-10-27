import { useEffect, useRef, useState } from 'react'
import { IconCheck, IconChevronDown, IconMessageCircle } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu'
import { StoreFavicon } from '@/components/store-favicon'
import { activeProjectChat, readProjectChats, projectChatTitle, type ChatProject } from '@/lib/project-chats'

function useProjects() {
  const [projects, setProjects] = useState<ChatProject[]>([])
  useEffect(() => {
    const refresh = () => setProjects(readProjectChats().filter(project => !!project.storeUrl).map(project => ({ ...project, title: projectChatTitle(project) })))
    refresh(); window.addEventListener('superpilot-project-chats', refresh)
    return () => window.removeEventListener('superpilot-project-chats', refresh)
  }, [])
  return projects
}
const timestamp = (project: ChatProject) => project.updatedAt ? new Date(project.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Saved conversation'

export function ProjectSessionItems({ currentStoreUrl, onProject, recentLimit = 5 }: { currentStoreUrl?: string; onProject: (project: ChatProject) => void; recentLimit?: number }) {
  const projects = useProjects().filter(project => project.storeUrl === currentStoreUrl)
  const active = activeProjectChat(currentStoreUrl)
  const item = (project: ChatProject) => <DropdownMenuItem className="text-[11px]" key={project.key} onSelect={() => onProject(project)}><span className="min-w-0 flex-1"><span className="block truncate text-[11px]">{project.title}</span><span className="block truncate text-[10px] text-muted-foreground">{timestamp(project)}</span></span>{active?.key === project.key ? <IconCheck className="size-3" /> : null}</DropdownMenuItem>
  return <>{projects.length ? <>{projects.slice(0, recentLimit).map(item)}{projects.length > recentLimit ? <DropdownMenuSub><DropdownMenuSubTrigger className="text-[11px]">More conversations</DropdownMenuSubTrigger><DropdownMenuSubContent className="max-h-[60svh] w-64 overflow-y-auto">{projects.slice(recentLimit).map(item)}</DropdownMenuSubContent></DropdownMenuSub> : null}</> : <div className="px-2 py-2 text-[11px] text-muted-foreground">No conversations yet.</div>}</>
}
export function HeaderProjectMenu({ currentStoreUrl, onProject }: { currentStoreUrl?: string; activeFlowId?: string; inverted?: boolean; onProject: (project: ChatProject) => void }) {
  const projects = useProjects()
  const brands = [...new Map([...projects].reverse().map(project => [project.storeUrl!, project])).values()].reverse()
  const trigger = useRef<HTMLButtonElement>(null)
  const [anchorOffset, setAnchorOffset] = useState(0)
  function alignBrandControl(open: boolean) {
    const button = trigger.current, group = button?.parentElement
    if (open && button && group) setAnchorOffset(group.getBoundingClientRect().left - button.getBoundingClientRect().left)
  }
  return <DropdownMenu onOpenChange={alignBrandControl}><DropdownMenuTrigger asChild><Button ref={trigger} variant="ghost" size="icon-xs" aria-label="Switch brand"><IconChevronDown className="size-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent side="bottom" align="start" alignOffset={anchorOffset} sideOffset={8} collisionPadding={12} className="w-72 max-h-[60svh] overflow-y-auto">{brands.length ? brands.map(project => <DropdownMenuItem key={project.storeUrl} onSelect={() => onProject(activeProjectChat(project.storeUrl) ?? project)}><StoreFavicon store={project.storeUrl!} className="size-6 shrink-0 rounded bg-white" /><span className="min-w-0 flex-1"><span className="block truncate text-xs">{project.name}</span><span className="block truncate text-[10px] text-muted-foreground">{new URL(project.storeUrl!).hostname}</span></span>{currentStoreUrl === project.storeUrl ? <IconCheck className="size-3" /> : null}</DropdownMenuItem>) : <div className="px-2 py-3 text-xs text-muted-foreground">Your brands will appear here.</div>}</DropdownMenuContent></DropdownMenu>
}

export function SavedWorkspaceList({ onProject }: { onProject: (project: ChatProject) => void }) {
  const projects = useProjects()
  const brands = [...new Map([...projects].reverse().map(project => [project.storeUrl!, project])).values()].reverse()
  if (!projects.length) return <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center"><IconMessageCircle className="size-7 text-muted-foreground" aria-hidden="true" /><p className="text-sm font-medium">Your workspace starts here</p><p className="text-xs leading-5 text-muted-foreground">Enter a store URL to start. Your saved brands and conversations will appear here.</p></div>
  return <nav aria-label="Saved workspaces" className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-5">
    <section className="space-y-2"><h2 className="px-2 text-[11px] font-medium text-muted-foreground">Brands</h2>{brands.map(project => <Button key={project.storeUrl} variant="ghost" className="h-auto w-full justify-start gap-3 px-2 py-2 text-left" onClick={() => onProject(activeProjectChat(project.storeUrl) ?? project)}><StoreFavicon store={project.storeUrl!} className="size-7" /><span className="min-w-0"><span className="block truncate text-xs">{project.name}</span><span className="block truncate text-[10px] font-normal text-muted-foreground">{new URL(project.storeUrl!).hostname}</span></span></Button>)}</section>
    <section className="space-y-2"><h2 className="px-2 text-[11px] font-medium text-muted-foreground">Recent conversations</h2>{projects.slice(0, 8).map(project => <Button key={project.key} variant="ghost" className="h-auto w-full justify-start gap-3 px-2 py-2 text-left" onClick={() => onProject(project)}><IconMessageCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0"><span className="block truncate text-xs">{project.title}</span><span className="block truncate text-[10px] font-normal text-muted-foreground">{project.name} · {timestamp(project)}</span></span></Button>)}</section>
  </nav>
}
