import { Button } from '@/components/ui/button'
import { InlineEdit } from '@/components/ui/inline-edit'
import type { CreativeState, StudioAction } from '@/lib/creative'

export function CopyOptions({ state, onAction, onRequest, busy }: { state: CreativeState; onAction: (action: StudioAction) => void; onRequest: (request: string) => void; busy: boolean }) {
  return <div className="space-y-3" aria-label="Ad copy">
    <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">Copy</span><Button variant="ghost" size="sm" disabled={busy} onClick={() => onRequest('Propose three distinct copy variations for the selected saved image using the current confirmed brief and brand/product context. Return a copy-options action: id, label, headline (at most 80 characters), body (at most 140 characters). Keep the confirmed offer unchanged; no unsupported claims. Do not generate images or select an option.')}>More options</Button></div>
    {state.copyOptions?.length ? <div className="grid gap-2">{state.copyOptions.map(option => {
      const selected = state.brief.headline === option.headline && state.brief.body === option.body
      return <Button key={option.id} variant={selected ? 'secondary' : 'outline'} className="h-auto w-full justify-start whitespace-normal py-3 text-left" aria-pressed={selected} onClick={() => onAction({ op: 'choose-copy', id: option.id })}><span className="min-w-0"><span className="block text-xs text-muted-foreground">{option.label}</span><span className="mt-1 block font-medium leading-snug">{option.headline}</span>{option.body ? <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">{option.body}</span> : null}</span></Button>
    })}</div> : null}
    <div className="space-y-1 border-t pt-2"><InlineEdit label="Headline" placeholder="Add a headline" value={state.brief.headline} multiline maxLength={180} onChange={headline => onAction({ op: 'brief', patch: { headline } })} /><InlineEdit label="Supporting copy" placeholder="Add supporting copy" value={state.brief.body} multiline maxLength={400} onChange={body => onAction({ op: 'brief', patch: { body } })} /></div>
  </div>
}
