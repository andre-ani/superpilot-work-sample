export type AgentActivity = {
  status: 'ready' | 'submitted' | 'streaming' | 'resuming' | 'error'
  active: boolean
  summary?:string
  hasProgress: boolean
  entries: { id: string; kind: 'agent' | 'tool' | 'operation'; label: string; detail?: string; state: 'running' | 'complete' | 'error' | 'pending' }[]
}
export const idleActivity: AgentActivity = { status: 'ready', active: false, hasProgress: false, entries: [] }

const toolLabels: Record<string, string> = {
  task_wait: 'Waiting for agent', task_status: 'Check agent progress', scan_store: 'Read storefront', read_brand: 'Read brand details', search_products: 'Find products',
  classify_products: 'Match products', select_product: 'Select a product', navigate_workspace: 'Open workspace',
  research_ad_directions:'Develop ad directions', read_artwork:'Inspect saved artwork', analyze_brand:'Understand the brand', remove_product:'Remove product context', creative_studio: 'Develop creative', studio_action: 'Update the creative', generate_image: 'Create an image',
}
export function activityLabel(name: string) {
  const subagent = name.match(/(?:^|:)subagent:([^:]+)/i)
  if (subagent) return `${subagent[1].charAt(0).toUpperCase()}${subagent[1].slice(1).replace(/[_-]/g,' ')} agent`
  const key = (name.split('__').pop() ?? name).split(':').pop() ?? name
  if (toolLabels[key]) return toolLabels[key]
  const words = key.replace(/[_-]+/g, ' ').trim()
  return (words.charAt(0).toUpperCase() + words.slice(1)).slice(0, 80)
}
export function agentLabel(name: string) {
  const label = activityLabel(name.split('/').pop() ?? name)
  return /agent$/i.test(label) ? label : `${label} agent`
}

const object=(value:unknown):Record<string,any>=>value&&typeof value==='object'?value as Record<string,any>:{}
/** Reconcile real Eve events and both static/dynamic AI SDK tool parts. */
export function deriveAgentActivity(status:AgentActivity['status'],events:readonly unknown[],messages:readonly unknown[],operations:AgentActivity['entries']=[]):AgentActivity {
  const busy=['submitted','streaming','resuming'].includes(status),entries=new Map<string,AgentActivity['entries'][number]>()
  let latestTurn:string|undefined,publicText=''
  const add=(id:string,name:string,kind:'agent'|'tool',state:AgentActivity['entries'][number]['state'])=>{
    const previous=entries.get(id)
    entries.set(id,{...previous,id,kind:previous?.kind==='agent'?'agent':kind,label:previous?.kind==='agent'?previous.label:kind==='agent'?agentLabel(name):activityLabel(name),state})
  }
  for(const raw of events){const event=object(raw),data=object(event.data)
    if(typeof data.turnId==='string'&&data.turnId!==latestTurn){latestTurn=data.turnId;publicText=''}
    if(event.type==='actions.requested')for(const rawAction of data.actions??[]){const action=object(rawAction),name=action.toolName??action.name??action.subagentName;if(action.callId&&name)add(action.callId,String(name),String(action.kind).includes('agent')?'agent':'tool','running')}
    if(event.type==='action.input.appended'&&data.callId&&data.toolName)add(data.callId,data.toolName,'tool','running')
    if(event.type==='task.started'&&data.callId)add(data.callId,data.name,data.kind==='agent'?'agent':'tool','running')
    if(event.type==='agent.started'&&data.callId){const previous=entries.get(data.callId);entries.set(data.callId,{id:data.callId,kind:'agent',label:agentLabel(data.name),state:previous?.state??'running'})}
    if(event.type==='task.settled'&&data.callId)add(data.callId,data.name??'agent',data.kind==='agent'?'agent':'tool',data.status==='failed'?'error':data.status==='cancelled'?'pending':'complete')
    if(event.type==='action.result'){const result=object(data.result);if(result.callId)add(result.callId,result.toolName??result.name??'tool','tool',data.error||data.status==='failed'||data.status==='error'?'error':'complete')}
    // message.appended is public assistant text. reasoning.appended is deliberately ignored.
    if(event.type==='message.appended'&&typeof data.messageDelta==='string')publicText+=data.messageDelta
  }
  for(const rawMessage of messages){const message=object(rawMessage);for(const rawPart of message.parts??[]){const part=object(rawPart),type=String(part.type??''),name=part.toolName??(type.startsWith('tool-')?type.slice(5):null);if(!name||!part.toolCallId)continue
    const previous=entries.get(part.toolCallId),state=String(part.state??'')
    const terminal=state==='output-available'?'complete':state==='output-error'||state==='output-denied'?'error':undefined
    add(part.toolCallId,String(name),'tool',terminal??previous?.state??(busy?'running':'pending'))
  }}
  const all=[...operations,...entries.values()]
  const running=all.filter(entry=>entry.state==='running'||entry.kind==='operation'&&entry.state==='pending')
  const room=Math.max(0,80-running.length)
  const history=room?all.filter(entry=>!running.includes(entry)).slice(-room):[]
  const combined=[...history,...running]
  const summary=publicText.includes('```')?undefined:publicText.trim().split(/\n\s*\n/).at(-1)?.replace(/\s+/g,' ').slice(0,260)
  return {status,active:busy||combined.some(entry=>entry.state==='running'||entry.kind==='operation'&&entry.state==='pending'),hasProgress:combined.length>0||messages.length>0||busy||status==='error',entries:combined,...(summary?{summary}:{})}
}

export function currentActivityText(activity:AgentActivity) {
  return activity.entries.filter(entry=>entry.state==='running'||entry.kind==='operation'&&entry.state==='pending').at(-1)?.label
}

export function researchActivity(enrichment?:{sourceScanId:string;status:'queued'|'running'|'complete'|'failed';phase?:string;summary?:string}):AgentActivity['entries'] {
  if(!enrichment)return[]
  const labels=[['reading','Read storefront'],['identity','Verify brand identity'],['understanding','Understand the brand']] as const
  const index=labels.findIndex(([phase])=>phase===enrichment.phase)
  if(index<0)return[{id:`research:${enrichment.sourceScanId}`,kind:'operation',label:'Research brand context',detail:enrichment.summary,state:enrichment.status==='complete'?'complete':enrichment.status==='failed'?'error':enrichment.status==='queued'?'pending':'running'}]
  return labels.slice(0,index+1).map(([,label],position)=>({id:`research:${enrichment.sourceScanId}:${position}`,kind:'operation' as const,label,detail:position===index?enrichment.summary:undefined,state:position<index?'complete' as const:enrichment.status==='failed'?'error' as const:'running' as const}))
}
