import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject, type CSSProperties } from 'react'
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react'
import { ThemeScope } from '@/components/ui/theme-scope'
import { createPortal } from 'react-dom'
import { useEveAgent } from 'eve/react'
import type { FileUIPart, UserContent } from 'ai'
import { ChatToolCall, isChatToolPart, isDisplayToolPart } from '@/components/chat-tool-call'
import { Tool, ToolHeader, ToolContent } from '@/components/ai-elements/tool'
import { IconLoader2, IconPackage, IconPalette, IconPhotoPlus, IconPlus, IconX, IconSquareFilled, IconArrowLeft, IconArrowRight, IconChevronDown } from '@tabler/icons-react'
import { Conversation, ConversationContent } from '@/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import { PromptInput, PromptInputProvider, PromptInputSubmit, PromptInputTextarea, PromptInputButton, PromptInputAttachments, PromptInputAttachment, usePromptInputAttachments, usePromptInputController } from '@/components/ai-elements/prompt-input'
import { ExportActions, type ExportControls } from '@/components/export-actions'
import { ButtonGroup } from '@/components/ui/button-group'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { InputGroupInput } from '@/components/ui/input-group'
import { ErrorNotice } from '@/components/error-notice'
import { isUnavailableConversation } from '@/lib/user-error'
import { HomeIntro } from '@/components/home-intro'
import { useContextChange } from '@/components/use-context-change'
import { WorkspaceChecklist } from '@/components/workspace-checklist'
import { ContextChangeNotice } from '@/components/context-change-notice'
import { useContextFeedback } from '@/components/use-context-feedback'
import { useBrandPlaceholder } from '@/components/use-brand-placeholder'
import { ProductFilters } from '@/components/product-filters'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command'
import { uploadBrandLogo } from '@/lib/brand-assets-functions'
import { normalizeStoreUrl, type CatalogPage, type CatalogFilters } from '@/lib/catalog'
import type { StoreOpenOptions } from '@/lib/studio'
import { activityLabel, agentLabel, deriveAgentActivity, currentActivityText, idleActivity, type AgentActivity } from '@/lib/agent-activity'
import { activeProjectChat, activateProjectChat, newProjectChat, chatProject, chatPresentationKey, readProjectChat, readProjectChats, saveProjectChat, type ChatProject, type SavedProjectChat } from '@/lib/project-chats'

type Mention = { id: string; label: string; kind: 'brand' | 'product' }
export type AgentAction = Record<string, unknown> & { kind: string }
export type WorkspaceNavigation = { newUncachedSession: () => void; newConversation: () => void; selectProject: (project: ChatProject) => void }
type WorkspaceLayout = { composerHeight:number; dockHeight:number; keyboardInset:number; sidebarChat:boolean }
type ComposerGenerate = { format: 'square' | 'story'; busy: boolean; disabled?: boolean; onGenerate: () => void; onFormat: (format: 'square' | 'story') => void }
type Props = {
  contextReady?: boolean;
  composerExport?: ExportControls; composerGenerate?: ComposerGenerate;
  sidebarRequested?: boolean; sidebarTarget?: HTMLDivElement | null; onOpenConversation?: () => void;
  navigationRef?: RefObject<WorkspaceNavigation | null>; headerChatRef?: RefObject<HTMLButtonElement | null>; onChatSidebarChange?: (open: boolean) => void;
  reviewMode?: boolean;
  request?: { id: string; text: string; storeUrl?: string; flowId?: string } | null; onBusyChange?: (busy: boolean) => void
  onActivityChange?: (activity: AgentActivity) => void
  operationEntries?: AgentActivity['entries']
  onCreate?: () => void
  onStoreInput?: (value: string) => void; homeControl?: ReactNode
  onReferences?: (urls: string[]) => void | Record<string, unknown> | Promise<void | Record<string, unknown>>
  children: ReactNode; context: Record<string, unknown>; catalog?: CatalogPage; brandName?: string; dock?: ReactNode
  centeredContent?: boolean; headerHeight?: number
  filters: CatalogFilters; onFilters: (filters: CatalogFilters) => void
  onAction: (action: AgentAction) => void | Promise<void>; onStore: (url: string, options?: StoreOpenOptions) => void | Promise<void>
  onSearch: (query: string) => void; disabled?: boolean
}
const noOperations: AgentActivity['entries'] = []

export function AgentWorkspace(props: Props) {
  const [layout,setLayout]=useState<WorkspaceLayout>({composerHeight:110,dockHeight:130,keyboardInset:0,sidebarChat:false})
  const reportLayout=useCallback((next:WorkspaceLayout)=>setLayout(previous=>previous.composerHeight===next.composerHeight&&previous.dockHeight===next.dockHeight&&previous.keyboardInset===next.keyboardInset&&previous.sidebarChat===next.sidebarChat?previous:next),[])
  const home=props.context.view==='home', homeVisit=String(props.context.homeVisit??0)
  const origin=typeof props.context.storeUrl==='string'?props.context.storeUrl:undefined
  const flowId=typeof props.context.flowId==='string'?props.context.flowId:undefined
  const reviewId=String(props.context.reviewId ?? props.context.activeOutputId ?? 'loading')
  const [current,setCurrent]=useState<{project:ChatProject;data:SavedProjectChat;view:'home'|'flow';homeVisit?:string;scopeRevision?:number}|null>(null)
  const choosing=useRef(false)
  function workspaceProject() {
    const active = activeProjectChat(origin)
    if (active && (!flowId || active.flowId === flowId)) return active
    const saved = readProjectChats().find(project => project.storeUrl === origin && (!flowId || project.flowId === flowId))
    return saved ?? { ...newProjectChat(), flowId, storeUrl: origin, name: props.brandName || (origin ? new URL(origin).hostname : 'New conversation') }
  }
  useEffect(() => {
    if(choosing.current)return
    if(props.reviewMode){
      const key=`superpilot-review-chat-v1:${reviewId}`
      if(current?.project.key!==key){
        let data:SavedProjectChat={};try{data=JSON.parse(localStorage.getItem(key)??'{}')}catch{}
        setCurrent({project:{key,name:'Composing review',flowId,storeUrl:origin},data,view:'flow'})
      }
      return
    }
    if (props.disabled && !props.context.snapshotId) return
    if(home){if(current?.view!=='home'||current.homeVisit!==homeVisit)setCurrent({project:newProjectChat(),data:{},view:'home',homeVisit});return}
    if(props.context.view==='scan')return
    if(current?.view==='home'){
      const project={...(current.project.flowId === flowId && !current.project.storeUrl ? current.project : workspaceProject()),flowId:flowId??current.project.flowId,storeUrl:origin,name:props.brandName?.trim()||(origin?new URL(origin).hostname:'New session')}
      try{activateProjectChat(project)}catch{}
      setCurrent({project,data: project.key === current.project.key ? current.data : readProjectChat(project),view:'flow'});return
    }
    if(current?.view === 'flow' && current.project.storeUrl === origin && (!flowId || current.project.flowId === flowId) && props.brandName?.trim() && current.project.name !== props.brandName.trim()) {
      const project = { ...current.project, name: props.brandName.trim() }
      try { activateProjectChat(project) } catch {}
      setCurrent({ ...current, project }); return
    }
    if(!current||current.project.storeUrl!==origin||flowId&&current.project.flowId!==flowId){
      const project=workspaceProject()
      let data:SavedProjectChat={};try{data=readProjectChat(project)}catch{}
      setCurrent({project,data,view:'flow'})
    }
  },[home,homeVisit,origin,flowId,reviewId,props.brandName,props.reviewMode,props.disabled,props.context.snapshotId,props.context.view,current])
  useEffect(() => {
    if (!current || props.reviewMode || !current.data.events?.length) return
    const checked = readProjectChat(current.project)
    if (!checked.events?.length && !checked.session) setCurrent(value => value ? { ...value, data: checked, scopeRevision: (value.scopeRevision ?? 0) + 1 } : value)
  }, [current?.project.key, props.reviewMode])
  async function chooseProject(project:ChatProject){
    if (current?.project.key === project.key && current.project.storeUrl === origin) return
    choosing.current=true
    try {
      if(project.storeUrl && (project.storeUrl !== origin || project.flowId !== flowId)) await props.onStore(project.storeUrl,{resume:true,flowId:project.flowId,bypassCache:project.bypassCache})
      const data = readProjectChat(project)
      activateProjectChat(project)
      setCurrent({project,data,view:'flow'})
    } finally { choosing.current=false }
  }
  async function startConversation() {
    if (props.reviewMode || choosing.current) return
    const project = { ...newProjectChat(), flowId: flowId ?? current?.project.flowId, storeUrl: origin, name: props.brandName || (origin ? new URL(origin).hostname : 'New conversation') }
    if (origin) activateProjectChat(project)
    setCurrent({ project, data: {}, view: home ? 'home' : 'flow', homeVisit })
  }
  const ready=current&&(props.reviewMode||home&&current.view==='home'&&current.homeVisit===homeVisit||!home&&current.view==='flow'&&current.project.storeUrl===origin&&(!flowId||current.project.flowId===flowId))
  return <>
    <div style={{'--studio-floating-height':`${layout.sidebarChat?0:layout.dockHeight+layout.keyboardInset+24}px`,paddingBottom:layout.sidebarChat?24:(props.centeredContent?layout.composerHeight:layout.dockHeight)+layout.keyboardInset+24,...(props.centeredContent?{minHeight:`calc(100dvh - ${(props.headerHeight??72)+12}px)`,display:'grid',alignItems:'center',boxSizing:'border-box'}:{})} as CSSProperties}>{props.children}</div>
    {ready?<PromptInputProvider key={`${current.project.key}:${current.scopeRevision ?? 0}`}><AgentWorkspaceReady {...props} onLayoutChange={reportLayout} initialLayout={layout} project={current.project} saved={current.data} onChatProject={chooseProject} onNewSession={startConversation} /></PromptInputProvider>:null}
  </>
}

function AgentWorkspaceReady({ contextReady = true, reviewMode, request, onBusyChange, onActivityChange, operationEntries = noOperations, onReferences, onCreate, composerGenerate, composerExport, onStoreInput, homeControl, sidebarRequested = false, sidebarTarget, onOpenConversation, navigationRef, headerChatRef, onChatSidebarChange, context, catalog, brandName, dock, filters, onFilters, onAction, onStore, onSearch, disabled, saved, project, onChatProject, onNewSession, onLayoutChange, initialLayout }: Props & { initialLayout:WorkspaceLayout; onLayoutChange:(layout:WorkspaceLayout)=>void; saved: SavedProjectChat; project: ChatProject; onChatProject:(project:ChatProject)=>Promise<void>; onNewSession: () => Promise<void> }) {
  const chatKey = project.key
  const latestProject = useRef(project)
  latestProject.current = project
  const { textInput } = usePromptInputController()
  const text = textInput.value, setText = textInput.setInput
  const latestText = useRef(text)
  latestText.current = text
  const latestContext = useRef(context)
  latestContext.current = context
  const [localActions, setLocalActions] = useState<AgentActivity['entries']>([])
  const [mentions, setMentions] = useState<Mention[]>([])
  useEffect(() => { if (mentions.some(item => item.kind === 'brand')) setMentions(current => current.filter(item => item.kind !== 'brand')) }, [mentions])
  const [error, setError] = useState(''), [keyboardInset, setKeyboardInset] = useState(initialLayout.keyboardInset)
  const [visibleHeight, setVisibleHeight] = useState(() => typeof window === 'undefined' ? 800 : window.innerHeight)
  const [uploading, setUploading] = useState(false), [dockHeight, setDockHeight] = useState(initialLayout.dockHeight)
  const [composerNode, setComposerNode] = useState<HTMLDivElement | null>(null)
  const [composerHeight, setComposerHeight] = useState(initialLayout.composerHeight)
  const dockRef = useRef<HTMLDivElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const [introHeight, setIntroHeight] = useState(137)
  const [homeReady, setHomeReady] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const messageInput = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const localChatToggle = useRef<HTMLButtonElement>(null)
  const chatToggle = headerChatRef ?? localChatToggle
  const restoreChatFocus = useRef(false)
  const [chatOpen, setChatOpen] = useState(() => { try { return !reviewMode && sessionStorage.getItem(chatPresentationKey) === 'sidebar' } catch { return false } })
  const [chatPlacement, setChatPlacement] = useState<'floating' | 'sidebar'>('floating')
  const [focused, setFocused] = useState(false)
  const [homeConversation, setHomeConversation] = useState(false)
  const [dismissedResponse, setDismissedResponse] = useState<string | null>(null)
  const reduced = useReducedMotion()
  const isHome = context.view === 'home'
  useEffect(() => { if (isHome) onStoreInput?.(text) }, [isHome, text, onStoreInput])
  useEffect(() => { setHomeReady(false) }, [isHome, context.homeVisit])
  useEffect(() => {
    if (!isHome || !introRef.current) return
    const observer = new ResizeObserver(entries => setIntroHeight(entries[0].contentRect.height))
    observer.observe(introRef.current)
    return () => observer.disconnect()
  }, [isHome, context.homeVisit])
  const minimizeChat = useCallback((restoreFocus = false) => {
    restoreChatFocus.current = restoreFocus
    setChatOpen(false); setChatPlacement('floating'); setFocused(false)
    try { sessionStorage.setItem(chatPresentationKey, 'floating') } catch {}
    if (document.activeElement === messageInput.current) messageInput.current?.blur()
  }, [])
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      const target = event.target as Element
      if (dockRef.current?.contains(target) || panelRef.current?.contains(target) || target.closest?.('[data-chat-menu], [data-chat-toggle]')) return
      minimizeChat()
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [minimizeChat])
  useEffect(() => { if (isHome) { minimizeChat(); setHomeConversation(false) } }, [isHome, context.homeVisit, minimizeChat])

  const handled = useRef(new Set<string>())
  const uploaded = useRef(new Map<string, string>())
  const pendingStore = useRef<{ text: string; started: boolean } | null>(null)
  function readCurrentChat(): SavedProjectChat {
    if (reviewMode) { try { return JSON.parse(localStorage.getItem(latestProject.current.key) ?? '{}') } catch { return {} } }
    return readProjectChat(latestProject.current)
  }
  function saveCurrentChat(data: SavedProjectChat) {
    if (reviewMode) localStorage.setItem(latestProject.current.key, JSON.stringify(data))
    else saveProjectChat(latestProject.current, data)
  }
  // Keep the exact stream prefix and its cursor together, including unfinished turns.
  const liveSnapshot = useRef<SavedProjectChat>({ ...saved })
  const eventIds = useRef(new Set(saved.events?.map(event => event.meta.id) ?? []))
  const persistChat = () => {
    try { saveCurrentChat({ ...liveSnapshot.current, draft: latestText.current }) }
    catch { setError('Could not save this conversation on this device. Keep this tab open and copy any unsent text.') }
  }
  const agent = useEveAgent({
    initialEvents: saved.events ?? [], initialSession: reviewMode ? undefined : saved.session, resume: !reviewMode && saved.session !== undefined,
    onEvent(event) {
      if (event.type === 'message.received' && event.data.message === liveSnapshot.current.pendingText) liveSnapshot.current = { ...liveSnapshot.current, pendingText: undefined }
      if (!event.meta.id || !eventIds.current.has(event.meta.id)) {
        eventIds.current.add(event.meta.id)
        liveSnapshot.current = { ...liveSnapshot.current, events: [...liveSnapshot.current.events ?? [], event] }
      }
      persistChat()
    },
    onFinish(snapshot) {
      liveSnapshot.current = { events: snapshot.events, session: snapshot.session }
      persistChat()
    },
    onSessionChange(session) {
      // Cursor updates must never erase the question/history already on screen.
      if (session) { liveSnapshot.current = { ...liveSnapshot.current, session }; persistChat() }
    },
  })
  useEffect(() => { if (saved.draft || saved.pendingText) setText(saved.draft || saved.pendingText || '') }, [])
  useEffect(() => { persistChat() }, [text])
  useEffect(() => {
    const persist = () => persistChat()
    window.addEventListener('pagehide', persist)
    window.addEventListener('beforeunload', persist)
    return () => { window.removeEventListener('pagehide', persist); window.removeEventListener('beforeunload', persist); persist() }
  }, [chatKey, reviewMode])
  const busy = agent.status === 'submitted' || agent.status === 'streaming' || agent.status === 'resuming'
  const liveActivity = useMemo(() => deriveAgentActivity(agent.status, agent.events, agent.data.messages, [...operationEntries, ...localActions]), [agent.status, agent.events, agent.data.messages, operationEntries, localActions])
  const requested = useRef<string | null>(null)
  const activitySignature = useRef('')
  useEffect(() => { onBusyChange?.(busy) }, [busy, onBusyChange])
  useEffect(() => {
    const signature=JSON.stringify(liveActivity)
    if(signature!==activitySignature.current){activitySignature.current=signature;onActivityChange?.(liveActivity)}
  },[liveActivity,onActivityChange])
  useEffect(() => {
    if (reviewMode || !request || request.storeUrl !== project.storeUrl || request.flowId !== project.flowId || request.id === requested.current || busy || disabled) return
    requested.current = request.id
    void agent.send(request.text, { clientContext: JSON.stringify(context) }).catch(() => setError('Creative work could not start. Try again.'))
  }, [request, busy, disabled, reviewMode, agent.send, context])
  useEffect(() => {
    const pending = pendingStore.current
    if (!pending) return
    if (context.view === 'scan') { pending.started = true; if (latestText.current === pending.text) setText('') }
    else if (context.view === 'workspace') { if (latestText.current === pending.text) setText(''); pendingStore.current = null }
    else if (context.view === 'home' && pending.started) { if (!latestText.current) setText(pending.text); pendingStore.current = null }
  }, [context.view, setText])
  const productsVisible = context.view === 'workspace' && context.step === 'products' && !!catalog
  useEffect(() => {
    const viewport = window.visualViewport
    function update() {
      const editing = document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT'
      setKeyboardInset(editing && viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0)
      setVisibleHeight(viewport?.height ?? window.innerHeight)
    }
    update()
    viewport?.addEventListener('resize', update); viewport?.addEventListener('scroll', update)
    document.addEventListener('focusin', update); document.addEventListener('focusout', update)
    return () => { viewport?.removeEventListener('resize', update); viewport?.removeEventListener('scroll', update); document.removeEventListener('focusin', update); document.removeEventListener('focusout', update) }
  }, [])
  useEffect(() => {
    if (!composerNode) return
    const update = () => setComposerHeight(composerNode.getBoundingClientRect().height)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(composerNode)
    return () => observer.disconnect()
  }, [composerNode])
  useEffect(() => {
    if (!dockRef.current) return
    const observer = new ResizeObserver(entries => setDockHeight(entries[0].contentRect.height))
    observer.observe(dockRef.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    try { handled.current = new Set(JSON.parse(localStorage.getItem(`${chatKey}:actions`) ?? '[]')) } catch {}
  }, [])
  useEffect(() => {
    for (const message of agent.data.messages) for (const part of message.parts) {
      if (!('output' in part) || !part.output || typeof part.output !== 'object' || !('kind' in part.output) || typeof part.output.kind !== 'string') continue
      const id = `${message.id}:${part.toolCallId}`
      if (handled.current.has(id)) continue
      handled.current.add(id)
      try { localStorage.setItem(`${chatKey}:actions`, JSON.stringify([...handled.current].slice(-200))) } catch {}
      void Promise.resolve(onAction(part.output as AgentAction)).catch(failure => setError(failure instanceof Error && /^(Your context|Choose|Add an ad|Generate or export)/.test(failure.message) ? failure.message : 'The agent finished, but the workspace could not update. Try your request again.'))
    }
  }, [agent.data.messages, onAction, reviewMode])

  async function submit(value: string, files: FileUIPart[]) {
    const clean = value.trim()
    if ((!clean && !files.length && !mentions.length) || disabled || busy || uploading) throw new Error('The composer is not ready.')
    setError('')
    if (isHome || !files.length && (/^(https?:\/\/)?[\w-]+(?:\.[\w-]+)+(?:\/[^\s]*)?$/i.test(clean) || !catalog && !clean.includes(' ') && !!clean)) {
      try { const url = normalizeStoreUrl(clean); pendingStore.current = { text: clean, started: false }; await onStore(url,{fresh:isHome,flowId:project.flowId,bypassCache:project.bypassCache}) } catch (failure) { pendingStore.current = null; setError(failure instanceof Error ? failure.message : 'Enter a valid Shopify store URL.'); throw failure }
      return
    }
    const requestMentions = mentions.filter(item => item.kind !== 'brand')
    const uploadId = files.length ? `upload:${crypto.randomUUID()}` : null
    let referencesSaved = false
    if (uploadId) setLocalActions(current => [...current.slice(-19), { id: uploadId, kind: 'operation', label: 'Save image references', state: 'running' }])
    try {
      setUploading(files.length > 0)
      const attachments = await Promise.all(files.map(async file => {
        const match = /^data:(image\/(?:png|jpeg|webp));base64,([a-z\d+/=]+)$/i.exec(file.url)
        if (!match || match[2].length > 2_800_000) throw new Error('Use PNG, JPG or WebP images under 2 MB each.')
        let url = uploaded.current.get(file.url)
        if (!url) { url = await uploadBrandLogo({ data: match[2] }); uploaded.current.set(file.url, url) }
        return { type: 'file' as const, data: new URL(url, window.location.origin).href, mediaType: match[1], filename: file.filename || 'reference-image' }
      }))
      const ownedUrls = attachments.map(file => new URL(file.data).pathname)
      const contextPatch = ownedUrls.length ? await onReferences?.(ownedUrls) : undefined
      referencesSaved = true
      if (uploadId) setLocalActions(current => current.map(entry => entry.id === uploadId ? { ...entry, state: 'complete' } : entry))
      const nextContext: Record<string, unknown> = { ...latestContext.current, ...(contextPatch || {}) }
      const brand = nextContext.brandDraft && typeof nextContext.brandDraft === 'object' ? nextContext.brandDraft as Record<string, unknown> : {}
      const existingReferences = Array.isArray(brand.visualReferences) ? brand.visualReferences.filter((url): url is string => typeof url === 'string') : []
      const message: UserContent = [{ type: 'text', text: clean || 'Use these attachments as visual context.' }, ...attachments]
      liveSnapshot.current = { ...liveSnapshot.current, pendingText: clean }
      persistChat()
      setText(''); setUploading(false); setChatOpen(true); setHomeConversation(true); setDismissedResponse(null)
      setMentions(current => current.filter(item => !requestMentions.some(sent => sent.id === item.id)))
      await agent.send(message, { clientContext: { ...nextContext, ...(ownedUrls.length ? { brandDraft: { ...brand, visualReferences: [...new Set([...existingReferences, ...ownedUrls])] }, uploadedReferences: ownedUrls } : {}), mentions: requestMentions } })
      files.forEach(file => uploaded.current.delete(file.url))
    } catch (failure) {
      if (uploadId && !referencesSaved) setLocalActions(current => current.map(entry => entry.id === uploadId ? { ...entry, state: 'error' } : entry))
      setMentions(current => [...new Map([...requestMentions, ...current].map(item => [item.id, item])).values()])
      setUploading(false); if (!latestText.current) setText(clean)
      setError(failure instanceof Error && /^(Use PNG|Choose)/.test(failure.message) ? failure.message : 'Could not send. Your text and attachments are still here.')
      throw failure
    }
  }
  const visibleMessages = agent.data.messages.filter(message => message.parts.some(part => isDisplayToolPart(part) || part.type === 'text' && part.text.trim() || part.type === 'file' && part.mediaType.startsWith('image/')))
  const productTools = productsVisible && !sidebarRequested && catalog ? <ProductFilters catalog={catalog} filters={filters} onChange={onFilters} onSearch={onSearch} /> : null
  const latestAssistant = [...visibleMessages].reverse().find(message => message.role === 'assistant' && message.parts.some(part => part.type === 'text' && part.text.trim()))
  const latestResponse = latestAssistant?.parts.filter(part => part.type === 'text').map(part => part.text).join(' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[`*_#>]/g, '').replace(/\s+/g, ' ').trim() ?? ''
  const runningOperation = operationEntries.filter(entry => (entry.state === 'running' || entry.state === 'pending') && !/cache|restore session|open brand/i.test(entry.label)).at(-1)
  const processing = busy || !!runningOperation || liveActivity.active || uploading || context.checkingStore === true
  const idleState = context.step==='studio' ? 'Describe how you’d like to refine this ad…' : context.step==='create' ? context.adDirectionSelected ? 'Tell me what you’d change about this direction…' : 'Choose an ad direction, or tell me what you want to try…' : context.step==='products' ? 'Find products or add references for your ad…' : context.step==='brand' ? 'Ask about this brand or refine its context…' : ''
  const stateText = processing ? runningOperation?.detail || runningOperation?.label || currentActivityText(liveActivity) || (uploading ? 'Saving image references…' : agent.status === 'resuming' ? 'Connecting…' : 'Responding…') : idleState
  const [placementPhase, setPlacementPhase] = useState<'floating' | 'leaving-floating' | 'sidebar' | 'leaving-sidebar'>(()=>initialLayout.sidebarChat&&sidebarRequested&&!isHome&&sidebarTarget?'sidebar':'floating')
  const requestedSidebar = sidebarRequested && !isHome && !!sidebarTarget
  const requestedSidebarRef = useRef(requestedSidebar)
  requestedSidebarRef.current = requestedSidebar
  useEffect(() => {
    setPlacementPhase(current => requestedSidebar ? current === 'floating' || current === 'leaving-floating' ? 'leaving-floating' : 'sidebar' : current === 'sidebar' || current === 'leaving-sidebar' ? 'leaving-sidebar' : 'floating')
  }, [requestedSidebar])
  function finishPlacement() {
    if (placementPhase === 'leaving-floating' && requestedSidebarRef.current) { onChatSidebarChange?.(true); setPlacementPhase('sidebar'); setChatOpen(true) }
    if (placementPhase === 'leaving-sidebar' && !requestedSidebarRef.current) { onChatSidebarChange?.(false); setPlacementPhase('floating'); setChatPlacement('floating'); setChatOpen(true) }
  }
  const sidebarChat = placementPhase === 'sidebar' || placementPhase === 'leaving-sidebar'
  useEffect(()=>onLayoutChange({composerHeight,dockHeight,keyboardInset,sidebarChat}),[composerHeight,dockHeight,keyboardInset,sidebarChat,onLayoutChange])
  const floatingChat = (!isHome || homeConversation) && chatOpen && chatPlacement === 'floating'
  const transition = { duration: reduced ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] as const }
  const showFloating = () => { try { sessionStorage.setItem(chatPresentationKey, 'floating') } catch {} restoreChatFocus.current = false; setHomeConversation(true); setChatPlacement('floating'); setChatOpen(true); setDismissedResponse(null) }

  const dismiss = () => { setDismissedResponse(latestAssistant?.id ?? null); minimizeChat(true) }
  const renderMessages = () => visibleMessages.map(message => <Message key={message.id} from={message.role === 'user' ? 'user' : 'assistant'}>{message.parts.map((part,index)=>isDisplayToolPart(part)?<ChatToolCall key={part.toolCallId} part={part}/>:part.type==='text'&&part.text.trim()?<MessageContent key={index} variant="floating"><MessageResponse>{part.text}</MessageResponse></MessageContent>:part.type==='file'&&part.mediaType.startsWith('image/')?<MessageContent key={index} variant="floating"><img src={part.url} alt={part.filename||'Attached image'} className="max-h-40 max-w-full rounded-lg object-contain"/></MessageContent>:null)}</Message>)
  useEffect(() => {
    if (navigationRef) navigationRef.current = { newConversation: () => { void onNewSession().catch(() => setError('Could not start a conversation. Your saved history is unchanged.')) }, newUncachedSession: () => { void onNewSession().catch(failure => setError(failure instanceof Error ? failure.message : 'Could not start a new session. Your saved sessions are unchanged.')) }, selectProject: value => { void onChatProject(value).catch(() => setError('Could not open this session. Your saved sessions are unchanged.')) } }
    return () => { if (navigationRef) navigationRef.current = null }
  })
  const conversationEnded = isUnavailableConversation(agent.error)
  const errorBubble = error || agent.error ? <div className="pointer-events-auto mb-2"><ErrorNotice error={error || agent.error} context={isHome ? 'catalog' : 'chat'} onRetry={agent.session && !busy && !conversationEnded ? async () => { setError(''); try { await agent.resume() } catch { setError('Could not reconnect yet. Your conversation and draft are saved. Try again when the app is ready.') } } : undefined} onDismiss={() => setError('')} />{conversationEnded ? <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void onNewSession().catch(() => setError('Could not start a conversation. Your saved history is unchanged.'))}>New conversation</Button> : null}</div> : null
  const homeBottom = Math.max(keyboardInset + 14, keyboardInset + (visibleHeight - dockHeight - introHeight - 28) / 2 + (keyboardInset ? 0 : Math.min(80, visibleHeight * .1)))

  const floatingTransition = { duration: reduced ? 0 : isHome ? .2 : keyboardInset ? .16 : .5, ease: (isHome ? [.22, 1, .36, 1] : [.25, .1, .25, 1]) as [number, number, number, number] }
  const composer = <div ref={setComposerNode}><PromptInput data-home-composer={isHome} variant="composer" working={processing} className="pointer-events-auto" accessories={<AnimatePresence initial={false}>{!isHome ? <AnimatedAccessories key="context-accessories" transition={transition}><ComposerAccessories dock={dock} tools={productTools} mentions={mentions} onMentions={setMentions} /></AnimatedAccessories> : null}</AnimatePresence>} accept="image/png,image/jpeg,image/webp" multiple maxFileSize={2 * 1024 * 1024} onSubmit={({ text: value, files }) => submit(value, files)} onError={() => setError('Use PNG, JPG or WebP images under 2 MB each.')}>
    <ComposerInput contextReady={contextReady} onOpenConversation={() => { setChatOpen(true); setHomeConversation(true); setDismissedResponse(null); onOpenConversation?.() }} onProduct={productId => { void Promise.resolve(onAction({ kind: 'product-selection', snapshotId: context.snapshotId, productId, preserveImageSelection: true })).catch(() => setError('Could not add this product. Try again.')) }} onCreate={onCreate} composerGenerate={composerGenerate} composerExport={sidebarRequested || sidebarChat ? undefined : composerExport} startMode={isHome} inputRef={messageInput} focused={focused} onFocused={value => { setFocused(value); if (value) { setChatOpen(true); setDismissedResponse(null) } }} processing={processing} stateText={stateText} text={text} onText={setText} disabled={disabled || uploading} busy={busy} uploading={uploading} onStop={() => void agent.cancel()} mentions={mentions} onMentions={setMentions} catalog={catalog} brandName={brandName} />
  </PromptInput></div>
  return <>

    <AnimatePresence>{isHome ? <motion.div key={`home-intro:${String(context.homeVisit ?? 0)}`} ref={introRef} initial={{ opacity: 1, bottom: homeBottom + dockHeight + 28 }} animate={{ opacity: 1, bottom: homeBottom + dockHeight + 28 }} exit={{ opacity: 0 }} transition={floatingTransition} className="sidebar-region-motion pointer-events-none fixed right-0 left-[var(--studio-sidebar-offset,0px)] z-40 px-4 transition-[left] duration-200 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"><div className="mx-auto flow-root w-full max-w-2xl"><HomeIntro onReady={() => setHomeReady(true)} /></div></motion.div> : null}</AnimatePresence>
    <motion.div ref={dockRef} initial={false} animate={{ bottom: isHome ? homeBottom : keyboardInset }} transition={floatingTransition} className="sidebar-region-motion pointer-events-none fixed right-0 left-[var(--studio-sidebar-offset,0px)] z-40 px-4 pb-[max(14px,env(safe-area-inset-bottom))] transition-[left] duration-200 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none">
      {!sidebarChat ? <motion.div key="floating-placement" initial={{ opacity: 0, y: -8, filter: 'blur(6px)' }} animate={{ opacity: placementPhase === 'leaving-floating' ? 0 : 1, y: placementPhase === 'leaving-floating' ? 12 : 0, filter: placementPhase === 'leaving-floating' ? 'blur(6px)' : 'none', transitionEnd: placementPhase === 'floating' ? {filter:'none'} : {} }} transition={{ duration: reduced ? 0 : .2, delay: placementPhase === 'floating' && !isHome ? reduced ? 0 : .2 : 0 }} onAnimationComplete={finishPlacement} inert={placementPhase === 'leaving-floating'} className="mx-auto w-full max-w-2xl">

        <AnimatePresence initial={false} mode="wait">
          {floatingChat && visibleMessages.length ? <motion.div key="conversation" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={transition} className="pointer-events-auto relative">
            <div className="flex justify-end"><Button type="button" variant="chat-dismiss" size="chat-close" aria-label="Dismiss conversation" onClick={dismiss}><IconX className="size-3.5" aria-hidden="true" /></Button></div>
            <Conversation fade className="max-h-[min(22rem,40svh)] overflow-y-auto" initial="instant" resize="instant"><ConversationContent className="gap-3 px-1 py-5">{renderMessages()}</ConversationContent></Conversation>
          </motion.div> : (!isHome || homeConversation) && latestAssistant && latestResponse && dismissedResponse !== latestAssistant.id ? <motion.div key={latestAssistant.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={transition} className="pointer-events-auto relative mb-3 mt-2">
            <Button type="button" variant="glass" size="chat-preview" aria-label="Open latest response" onClick={showFloating}><span className="line-clamp-2">{latestResponse}</span></Button>
            <Button type="button" variant="chat-dismiss" size="chat-close" className="absolute -top-2 -left-2" aria-label="Dismiss latest response" onClick={dismiss}><IconX className="size-3.5" aria-hidden="true" /></Button>
          </motion.div> : null}
        </AnimatePresence>
        <motion.div initial={false} animate={{ maxWidth: isHome ? 448 : 672, opacity: !isHome || homeReady || reduced ? 1 : 0 }} transition={{ maxWidth: { duration: reduced ? 0 : .5, ease: [0.25, 0.1, 0.25, 1] }, opacity: { duration: reduced ? 0 : .25 } }} inert={isHome && !homeReady && !reduced} className="mx-auto w-full">{errorBubble}{isHome && homeControl ? <div className="mb-2 flex justify-end">{homeControl}</div> : null}{composer}</motion.div>
      </motion.div> : null}
    </motion.div>
    {sidebarChat && sidebarTarget ? createPortal(<ThemeScope.Provider value="dark"><motion.div ref={panelRef} key="sidebar-placement" initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }} animate={{ opacity: placementPhase === 'leaving-sidebar' ? 0 : 1, y: placementPhase === 'leaving-sidebar' ? 12 : 0, filter: placementPhase === 'leaving-sidebar' ? 'blur(6px)' : 'none', transitionEnd: placementPhase === 'sidebar' ? {filter:'none'} : {} }} transition={{ duration: reduced ? 0 : .2, delay: placementPhase === 'sidebar' ? reduced ? 0 : .2 : 0 }} onAnimationComplete={finishPlacement} inert={placementPhase === 'leaving-sidebar'} className="flex min-h-0 flex-1 flex-col">
      <Conversation fade className="min-h-0 flex-1 overflow-y-auto" initial="instant" resize="instant"><ConversationContent className="gap-3 px-3 py-5">{!visibleMessages.length ? <WorkspaceChecklist brandName={brandName} brandReady={contextReady} brandWorking={context.checkingStore === true || !!context.enrichment && typeof context.enrichment === 'object' && ['queued','running'].includes(String((context.enrichment as {status?: string}).status))} productCount={catalog?.products.length ?? 0} selectedCount={Array.isArray(context.selectedProducts) ? context.selectedProducts.length : 0} ideasReady={Array.isArray(context.adDirections) && context.adDirections.length > 0} ideasWorking={runningOperation?.id === 'ad-directions'} hasArtwork={Array.isArray(context.outputs) && context.outputs.some(output => output && typeof output === 'object' && (output as {status?: string}).status === 'complete')} artworkStarted={!!context.activeOutputId} step={String(context.step ?? 'brand')} onStep={step => { void onAction({kind:'navigation',step}) }} /> : <>{renderMessages()}{liveActivity.entries.filter(entry => entry.kind !== 'operation' && !agent.data.messages.some(message => message.parts.some(part => isChatToolPart(part) && part.toolCallId === entry.id))).map(entry => <Tool key={entry.id}><ToolHeader type="dynamic-tool" toolName={entry.label} title={entry.label} state={entry.state === 'running' ? 'input-available' : entry.state === 'error' ? 'output-error' : entry.state === 'complete' ? 'output-available' : 'input-streaming'}/>{entry.detail ? <ToolContent><p className="text-xs leading-relaxed">{entry.detail}</p></ToolContent> : null}</Tool>)}</>}</ConversationContent></Conversation>
      <div className="shrink-0 px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">{errorBubble}{composer}</div>
    </motion.div></ThemeScope.Provider>, sidebarTarget) : null}

  </>
}

function ComposerInput({ contextReady, onOpenConversation, onProduct, onCreate, composerGenerate, composerExport, startMode, inputRef, focused, onFocused, processing, stateText, text, onText, disabled, busy, uploading, onStop, mentions, onMentions, catalog, brandName }: {
  contextReady: boolean; composerExport?: ExportControls; composerGenerate?: ComposerGenerate; onOpenConversation: () => void; onProduct: (productId: string) => void; onCreate?: () => void; startMode: boolean; inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>; focused: boolean; onFocused: (focused: boolean) => void; processing: boolean; stateText: string
  text: string; onText: (value: string) => void; disabled?: boolean; busy: boolean; uploading: boolean; onStop: () => void
  mentions: Mention[]; onMentions: (items: Mention[]) => void; catalog?: CatalogPage; brandName?: string
}) {
  const attachments = usePromptInputAttachments()
  const [conversationCue, setConversationCue] = useState(false)
  const [open, setOpen] = useState(false), [query, setQuery] = useState('')
  const matches = (catalog?.products ?? []).filter(p => `${p.title} ${p.type} ${p.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())).slice(0, 12)
  function addProduct(productId: string) {
    onProduct(productId)
    setOpen(false); setQuery(''); requestAnimationFrame(() => inputRef.current?.focus())
  }
  const urlPlaceholder = useBrandPlaceholder(startMode && !focused && !text && !processing && !disabled)
  const reduced = useReducedMotion()
  const showState = !text && (conversationCue || !!stateText && (processing || !focused))
  return <TooltipProvider delayDuration={250}><AnimatePresence initial={false} mode="wait">{startMode ? <motion.div key="brand-url" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.16 }} className="flex min-h-[3.25rem] w-full items-center gap-2 p-2 pl-4">
    <InputGroupInput compact ref={node => { inputRef.current = node }} name="message" aria-label="Your brand website URL" inputMode="url" autoComplete="url" autoCapitalize="none" spellCheck={false} maxLength={2048} value={text} onChange={event => onText(event.target.value)} onFocus={() => onFocused(true)} onBlur={() => onFocused(false)} placeholder={urlPlaceholder} disabled={disabled} />
    <PromptInputSubmit variant="ghost" size="composer-icon" disabled={disabled || !text.trim()} aria-label={processing ? 'Checking store' : 'Start with this brand'}>{processing ? <IconLoader2 className="animate-spin" aria-hidden="true" /> : <IconArrowRight aria-hidden="true" />}</PromptInputSubmit>
  </motion.div> : <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.16 }} className="@container flex min-h-[3.25rem] w-full items-end gap-1 p-2">
    <PromptInputButton type="button" size="composer-icon" className="self-center" aria-label="Open conversation" onClick={onOpenConversation} onMouseEnter={() => setConversationCue(true)} onMouseLeave={() => setConversationCue(false)} onFocus={() => setConversationCue(true)} onBlur={() => setConversationCue(false)}><AnimatePresence initial={false} mode="wait"><motion.img key={processing ? 'thinking' : 'idle'} src={processing ? '/brand/superpilot-thinking.svg' : '/brand/superpilot-mark.svg'} alt="superpilot" className={`size-6 ${processing ? '' : 'dark:invert'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .12 }} /></AnimatePresence></PromptInputButton>
    <div className="relative min-w-0 flex-1">
      <PromptInputTextarea compact ref={node => { inputRef.current = node }} aria-label="Message superpilot" aria-describedby={showState ? 'composer-live-state' : undefined} value={text} onChange={event => onText(event.target.value)} onFocus={() => onFocused(true)} onBlur={() => onFocused(false)} placeholder={showState ? '' : 'Message superpilot…'} enterKeyHint="send" rows={1} disabled={disabled} />
      <AnimatePresence initial={false}>{showState ? <motion.span id="composer-live-state" key="state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} role={processing ? "status" : undefined} aria-live={processing ? "polite" : undefined} className={`pointer-events-none absolute inset-x-1 top-1/2 -translate-y-1/2 truncate text-[13px] leading-5 text-muted-foreground ${processing && !conversationCue ? 'composer-state-shimmer' : ''}`}>{conversationCue ? 'Open conversation' : stateText}</motion.span> : null}</AnimatePresence>
    </div>
    <div className="flex shrink-0 items-center"><Popover open={open} onOpenChange={setOpen}><Tooltip><TooltipTrigger asChild><span className="inline-flex"><PopoverTrigger asChild><PromptInputButton size="composer-icon" aria-label="Attach media or add context" disabled={disabled || !contextReady}>
      <IconPlus aria-hidden="true" />
    </PromptInputButton></PopoverTrigger></span></TooltipTrigger><TooltipContent side="top" sideOffset={8}>Attach media or add context</TooltipContent></Tooltip><PopoverContent data-chat-menu side="top" align="end" collisionPadding={12} className="w-[min(18rem,calc(100vw-2rem))] p-1">
      <Button type="button" variant="ghost" size="menu-sm" onClick={() => { attachments.openFileDialog(); setOpen(false) }}><IconPhotoPlus aria-hidden="true" />Attach media</Button>
      {catalog ? <Command density="compact" shouldFilter={false}><CommandInput aria-label="Find context" placeholder="Find products…" value={query} onValueChange={setQuery} /><CommandList><CommandEmpty>No matching context.</CommandEmpty>{matches.map(product => <CommandItem key={product.id} value={product.id} onSelect={() => addProduct(product.id)}>{product.images[0] ? <img src={product.images[0]} alt="" className="size-5 rounded object-contain" /> : <IconPackage aria-hidden="true" />}<span className="truncate">{product.title}</span></CommandItem>)}</CommandList></Command> : null}
    </PopoverContent></Popover>
    <AnimatePresence initial={false}>{composerExport ? <motion.div key="export-artwork" initial={{width:0,opacity:0,marginLeft:0}} animate={{width:'auto',opacity:1,marginLeft:4}} exit={{width:0,opacity:0,marginLeft:0}} transition={{duration:reduced?0:.16}} className="shrink-0 overflow-hidden rounded-full"><ExportActions controls={composerExport}/></motion.div> : composerGenerate ? <motion.div key="generate-ad" initial={{ width: 0, opacity: 0, marginLeft: 0 }} animate={{ width: 'auto', opacity: 1, marginLeft: 4 }} exit={{ width: 0, opacity: 0, marginLeft: 0 }} transition={{ duration: reduced ? 0 : .16 }} className="shrink-0 overflow-hidden rounded-full"><ButtonGroup aria-label="Generate ad image"><Button type="button" variant="composer-next" size="composer-next" disabled={disabled || composerGenerate.disabled || composerGenerate.busy} onClick={composerGenerate.onGenerate}>{composerGenerate.busy ? <IconLoader2 className="size-3.5 animate-spin" /> : null}<span className="@min-[34rem]:hidden">{composerGenerate.busy ? 'Preparing…' : 'Generate'}</span><span className="hidden @min-[34rem]:inline">{composerGenerate.busy ? 'Preparing ad…' : composerGenerate.format === 'square' ? 'Generate square ad' : 'Generate story ad'}</span></Button><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="composer-next" size="composer-next" className="border-l border-white/25 px-2 has-[>svg]:px-2" aria-label={`Ad format: ${composerGenerate.format === 'square' ? 'Square' : 'Story'}`} disabled={disabled || composerGenerate.busy}><IconChevronDown className="size-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent data-chat-menu side="top" align="end"><DropdownMenuRadioGroup value={composerGenerate.format} onValueChange={value => composerGenerate.onFormat(value as 'square' | 'story')}><DropdownMenuRadioItem value="square">Square Instagram ad</DropdownMenuRadioItem><DropdownMenuRadioItem value="story">Instagram story</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu></ButtonGroup></motion.div> : onCreate && !disabled ? <motion.div key="create-next" initial={{ width: 0, opacity: 0, marginLeft: 0 }} animate={{ width: 'auto', opacity: 1, marginLeft: 4 }} exit={{ width: 0, opacity: 0, marginLeft: 0 }} transition={{ duration: reduced ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }} className="shrink-0 overflow-hidden rounded-full"><Button type="button" variant="composer-next" size="composer-next" onClick={onCreate} disabled={!contextReady} aria-label={contextReady ? "Explore ad directions" : "Researching brand context"}><span className="hidden @min-[24rem]:inline">Ad ideas</span>{contextReady ? <IconArrowRight className="size-3.5" aria-hidden="true" /> : <IconLoader2 className="size-3.5 animate-spin" aria-hidden="true" />}</Button></motion.div> : null}</AnimatePresence></div>
    {busy ? <PromptInputButton size="composer-icon" type="button" aria-label="Stop agent" onClick={onStop}><IconSquareFilled className="size-3" aria-hidden="true" /></PromptInputButton> : null}
    <PromptInputButton type="submit" className="hidden" tabIndex={-1} aria-hidden="true" disabled={disabled || busy || uploading || !text.trim() && !attachments.files.length && !mentions.length} />
  </motion.div>}</AnimatePresence></TooltipProvider>
}

const accessoryMotion = { hidden: { height: 0, opacity: 0 }, visible: { height: 'auto', opacity: 1 } }
function AnimatedAccessories({ children, transition }: { children: ReactNode; transition: { duration: number; ease: readonly [number, number, number, number] } }) {
  const present = useIsPresent()
  const [settled, setSettled] = useState(true)
  return <motion.div variants={accessoryMotion} initial="hidden" animate="visible" exit="hidden" transition={transition} style={{ overflow: present && settled ? 'visible' : 'hidden' }} inert={!present} onAnimationStart={() => setSettled(false)} onAnimationComplete={state => setSettled(state === 'visible')}>{children}</motion.div>
}

function ContextFeedbackItem({ signature, children }: { signature: string; children: ReactNode }) {
  const feedback = useContextFeedback(signature)
  return <motion.div layout="position" animate={feedback} className="max-w-full rounded-full" style={{ outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'var(--primary)' }}>{children}</motion.div>
}

function ComposerAccessories({ dock, tools, mentions, onMentions }: { dock?: ReactNode; tools?: ReactNode; mentions: Mention[]; onMentions: (items: Mention[]) => void }) {
  const attachments = usePromptInputAttachments()
  const notice = useContextChange([...mentions.map(item => ({ id: item.id, label: item.label, references: [item.id] })), ...attachments.files.map(file => ({ id: file.id, label: file.filename || 'media', references: [file.id] }))])
  if (!dock && !tools && !mentions.length && !attachments.files.length && !notice) return null
  return <div className="relative mb-2 flex items-end justify-between gap-3">
    <ContextChangeNotice notice={notice} />
    <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">{dock}
      {mentions.map(item => <ContextFeedbackItem key={item.id} signature={item.id + item.label}><Badge variant="secondary" className="max-w-full bg-background shadow-sm">{item.kind === 'brand' ? <IconPalette className="size-3" aria-hidden="true" /> : <IconPackage className="size-3" aria-hidden="true" />}<span className="truncate">{item.label}</span><Button type="button" variant="context-remove" size="icon-xs" aria-label={`Remove ${item.label}`} onClick={() => onMentions(mentions.filter(x => x.id !== item.id))}><IconX aria-hidden="true" /></Button></Badge></ContextFeedbackItem>)}
      <PromptInputAttachments className="w-auto items-end gap-2 p-0">{file => <ContextFeedbackItem signature={file.id}><PromptInputAttachment pill data={file} className="bg-background shadow-sm" /></ContextFeedbackItem>}</PromptInputAttachments>
    </div>
    {tools ? <div className="shrink-0 self-end">{tools}</div> : null}
  </div>
}
