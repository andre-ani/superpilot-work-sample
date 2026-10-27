import type { ClientSessionState, MessageStreamEvent } from 'eve/client'

export type SavedProjectChat = { brandOrigin?: string; workspaceFlowId?: string; draft?: string; pendingText?: string; events?: readonly MessageStreamEvent[]; session?: ClientSessionState }
export type ChatProject = { key: string; storeUrl?: string; name: string; title?: string; updatedAt?: string; flowId?: string; bypassCache?: boolean }
const legacyKey = 'superpilot-eve-chat-v1'
const indexKey = 'superpilot-project-chats-v1'
const migratedKey = `${indexKey}:legacy`
export const chatPresentationKey = 'superpilot-chat-presentation-v1'
const activeKey = (store: string) => `${indexKey}:active:${encodeURIComponent(new URL(store).origin)}`

export function newProjectChat(): ChatProject {
  const flowId=crypto.randomUUID()
  return {key:`${legacyKey}:project:session:${flowId}`,flowId,name:'New session'}
}
export function activateProjectChat(project: ChatProject) {
  if(project.storeUrl){localStorage.setItem(activeKey(project.storeUrl),JSON.stringify(project)); const existing=readProjectChats().find(item=>item.key===project.key); if(!existing||existing.name!==project.name)rememberProject(project)}
}
export function activeProjectChat(storeUrl?: string): ChatProject | null {
  if(!storeUrl)return null
  try {
    const project=JSON.parse(localStorage.getItem(activeKey(storeUrl))??'null') as ChatProject|null
    return project?.key.startsWith(`${legacyKey}:project:`)&&project.storeUrl===new URL(storeUrl).origin?project:null
  }catch{return null}
}

export function chatProject(storeUrl?: string, name?: string): ChatProject {
  let origin: string | undefined
  try { if (storeUrl) origin = new URL(storeUrl).origin } catch {}
  return { key: `${legacyKey}:project:${encodeURIComponent(origin ?? 'general')}`, storeUrl: origin, name: name?.trim() || (origin ? new URL(origin).hostname : 'General conversation') }
}

export function readProjectChats(): ChatProject[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(indexKey) ?? '[]')
    return Array.isArray(value) ? value.filter((item): item is ChatProject => {
      if (!item || typeof item !== 'object' || typeof item.key !== 'string' || !item.key.startsWith(`${legacyKey}:project:`) || typeof item.name !== 'string') return false
      if (item.storeUrl === undefined) return true
      try { return typeof item.storeUrl === 'string' && new URL(item.storeUrl).protocol === 'https:' } catch { return false }
    }) : []
  } catch { return [] }
}

function titleFromChat(snapshot: SavedProjectChat): string | undefined {
  for (const event of snapshot.events ?? []) {
    if (event.type !== 'message.received') continue
    const message = event.data.message
    const text = typeof message === 'string' ? message : ''
    const title = text.replace(/\s+/g, ' ').trim()
    if (title) return title.length > 60 ? `${title.slice(0, 57).trimEnd()}…` : title
  }
  const pending = snapshot.pendingText?.replace(/\s+/g, ' ').trim()
  return pending ? pending.length > 60 ? `${pending.slice(0,57).trimEnd()}…` : pending : undefined
}

export function projectChatTitle(project: ChatProject): string {
  if (project.title) return project.title
  try { const title = titleFromChat(readProjectChat(project)); if (title) return title } catch {}
  return `${project.name} ideas`
}

function rememberProject(project: ChatProject) {
  const previous = readProjectChats()
  localStorage.setItem(indexKey, JSON.stringify([{ ...previous.find(item => item.key === project.key), ...project, title: project.title ?? previous.find(item => item.key === project.key)?.title, updatedAt: new Date().toISOString() }, ...previous.filter(item => item.key !== project.key)]))
  window.dispatchEvent(new Event('superpilot-project-chats'))
}

export function readProjectChat(project: ChatProject): SavedProjectChat {
  const raw = localStorage.getItem(project.key)
  // A global legacy stream has no trustworthy brand owner. Keep it archived in
  // its original key; never silently adopt it into whichever brand opens next.
  const value: unknown = JSON.parse(raw ?? '{}')
  if (!value || typeof value !== 'object') return {}
  const snapshot = value as SavedProjectChat
  if (snapshot.brandOrigin && snapshot.brandOrigin !== project.storeUrl) return {}
  if (snapshot.workspaceFlowId && project.flowId && snapshot.workspaceFlowId !== project.flowId) return {}
  if (!snapshot.brandOrigin && localStorage.getItem(migratedKey) === project.key) {
    const archiveKey = `${project.key}:unassigned-archive-v1`
    if (raw && !localStorage.getItem(archiveKey)) localStorage.setItem(archiveKey, raw)
    return { brandOrigin: project.storeUrl, workspaceFlowId: project.flowId }
  }
  return snapshot
}

export function saveProjectChat(project: ChatProject, snapshot: SavedProjectChat) {
  if (snapshot.brandOrigin && snapshot.brandOrigin !== project.storeUrl) throw new Error('Conversation brand does not match this workspace.')
  if (snapshot.workspaceFlowId && project.flowId && snapshot.workspaceFlowId !== project.flowId) throw new Error('Conversation workspace does not match this session.')
  if (!snapshot.brandOrigin && localStorage.getItem(migratedKey) === project.key) return

  localStorage.setItem(project.key, JSON.stringify({ ...snapshot, brandOrigin: project.storeUrl, workspaceFlowId: project.flowId }))
  const named = { ...project, title: project.title ?? readProjectChats().find(item => item.key === project.key)?.title ?? titleFromChat(snapshot) }
  const active = activeProjectChat(project.storeUrl)
  if (!active || active.key === project.key) activateProjectChat(named)
  if (snapshot.session || snapshot.events?.length || named.title) rememberProject(named)
}
