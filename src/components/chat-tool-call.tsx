import type { ToolUIPart, DynamicToolUIPart } from 'ai'
import { Tool, ToolContent, ToolHeader, ToolOutput } from '@/components/ai-elements/tool'
import { activityLabel } from '@/lib/agent-activity'
import { userError } from '@/lib/user-error'

type Part = ToolUIPart | DynamicToolUIPart
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
export function isChatToolPart(value: unknown): value is Part {
  const part = record(value)
  return typeof part.type === 'string' && (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) && typeof part.toolCallId === 'string' && typeof part.state === 'string' && ['input-streaming','input-available','approval-requested','approval-responded','output-available','output-error','output-denied'].includes(part.state)
}
export function isDisplayToolPart(value: unknown): value is Part {
  if (!isChatToolPart(value)) return false
  const name = value.type === 'dynamic-tool' ? value.toolName : value.type.slice(5)
  return !/(?:^|[:_])task_(?:wait|status)$/.test(name)
}
export function ChatToolCall({ part }: { part: Part }) {
  const name = part.type === 'dynamic-tool' ? part.toolName : part.type.slice(5)
  const result = record(part.output)
  const failure = part.errorText || (typeof result.error === 'string' ? result.error : undefined)
  const state = failure ? 'output-error' : part.state
  const input = record(part.input)
  const query = ['query','prompt','direction','format'].flatMap(key => typeof input[key] === 'string' ? [String(input[key]).slice(0,500)] : []).join(' · ')
  const count = typeof result.count === 'number' ? result.count : Array.isArray(result.productIds) ? result.productIds.length : undefined
  const summary = count !== undefined ? `${count} ${count === 1 ? 'product' : 'products'} found` : typeof result.summary === 'string' ? result.summary.slice(0,800) : typeof result.message === 'string' ? result.message.slice(0,800) : Array.isArray(result.actions) ? `${result.actions.length} creative updates returned` : typeof result.status === 'string' ? result.status.replaceAll('_',' ') : undefined
  const error = failure ? userError(failure, name.includes('product') ? 'catalog' : 'workspace').message : undefined
  return <Tool defaultOpen={false}><ToolHeader title={activityLabel(name)} type="dynamic-tool" toolName={name} state={state}/><ToolContent className="space-y-3 pt-0">{query ? <p className="text-xs leading-relaxed text-muted-foreground">{query}</p> : null}<ToolOutput output={summary ? <p className="p-3 text-xs leading-relaxed">{summary}</p> : undefined} errorText={error}/>{!query&&!summary&&!error ? <p className="text-xs text-muted-foreground">{state==='input-streaming'?'Receiving tool input':state==='input-available'?'Working on this request':state==='output-available'?'Finished':state==='output-denied'?'Permission was declined':'Waiting for a response'}</p> : null}</ToolContent></Tool>
}
