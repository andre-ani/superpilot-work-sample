import { useState } from 'react'
import { IconSparkles } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { InlineEdit } from '@/components/ui/inline-edit'
import { Slider } from '@/components/ui/slider'
import { ColorPicker } from '@/components/ui/color-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { textLayerBounds } from '@/lib/composition'
import type { CreativeState, LayerName, StudioAction } from '@/lib/creative'

export function CreativeControls({ state, onAction, onRequest, busy }: { state: CreativeState; onAction: (action: StudioAction) => void; onRequest: (message: string) => void; busy: boolean }) {
  const [layerName, setLayerName] = useState<LayerName>('headline')
  const [showBrief, setShowBrief] = useState(false)
  const [revision, setRevision] = useState('')
  const layer = state.layers[layerName]
  const bounds = layerName === 'logo' ? null : textLayerBounds(state, layerName)
  return <div className="space-y-4">
    <InlineEdit label="Ad direction" placeholder="Anything you want this ad to say? (optional)" value={state.brief.visual} multiline maxLength={1200} onChange={visual => onAction({ op: 'brief', patch: { visual } })} />
    <Button variant="ghost" size="sm" aria-expanded={showBrief} onClick={() => setShowBrief(value => !value)}>{showBrief ? 'Hide creative details' : 'Creative details'}</Button>
    {showBrief ? <div className="space-y-1" aria-label="Creative brief">
      {([['audience', 'Audience'], ['message', 'Message'], ['offer', 'Confirmed offer (optional)'], ['hook', 'Hook'], ['headline', 'Headline'], ['body', 'Supporting copy']] as const).map(([key, label]) => <InlineEdit key={key} label={label} placeholder={label} value={state.brief[key]} multiline={key === 'body'} maxLength={key === 'headline' ? 180 : key === 'body' ? 400 : 600} onChange={value => onAction({ op: 'brief', patch: { [key]: value } })} />)}
      {state.composition ? <InlineEdit label="Composition plan" placeholder="Composition plan" value={state.composition} multiline maxLength={1800} onChange={composition => onAction({ op: 'composition', composition })} /> : null}
    </div> : null}
    <Button variant="outline" size="sm" disabled={busy} onClick={() => onRequest('Propose three distinct ad concepts using all collected brand, visual style and product context. The brief is optional; infer useful hooks from the evidence, and leave unconfirmed offers empty. Save the options without selecting one or generating images.')}><IconSparkles aria-hidden="true" />Explore concepts</Button>
    {state.concepts.length ? <div className="space-y-2" aria-label="Creative concepts">{state.concepts.map(concept => <Button key={concept.id} variant={state.selectedConcept === concept.id ? 'secondary' : 'outline'} className="h-auto w-full justify-start whitespace-normal py-3 text-left" onClick={() => onAction({ op: 'choose-concept', id: concept.id })} aria-pressed={state.selectedConcept === concept.id}><span><span className="block font-medium">{concept.name}</span><span className="mt-1 block text-xs">{concept.headline}</span></span></Button>)}</div> : null}
    <div className="space-y-3 border-t pt-3" aria-label="Composition layers">
      <Select value={layerName} onValueChange={value => setLayerName(value as LayerName)}><SelectTrigger aria-label="Edit layer" width="full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="headline">Headline</SelectItem><SelectItem value="body">Supporting copy</SelectItem><SelectItem value="logo">Logo</SelectItem></SelectContent></Select>
      <Button size="sm" variant="ghost" aria-pressed={layer.visible} onClick={() => onAction({ op: 'layout', layer: layerName, patch: { visible: !layer.visible } })}>{layer.visible ? 'Hide' : 'Show'} layer</Button>
      {layerName !== 'logo' ? <div className="flex flex-wrap gap-1"><Button size="sm" variant={layer.autoFit !== false ? 'secondary' : 'ghost'} aria-pressed={layer.autoFit !== false} onClick={() => onAction({ op: 'layout', layer: layerName, patch: { autoFit: true } })}>Fill text box</Button><Button size="sm" variant={layer.autoFit === false ? 'secondary' : 'ghost'} aria-pressed={layer.autoFit === false} onClick={() => onAction({ op: 'layout', layer: layerName, patch: { autoFit: false } })}>Manual size</Button></div> : null}
      {(['x', 'y', 'width', ...(layerName === 'logo' ? [] : ['height', ...(layer.autoFit === false ? ['size'] : []), 'maxLines'])] as const).map(key => {
        const field = key as 'x' | 'y' | 'width' | 'size' | 'height' | 'maxLines'
        const value = field === 'height' ? bounds?.height ?? 12 : field === 'maxLines' ? layer.maxLines ?? (layerName === 'headline' ? 2 : 4) : field === 'width' ? bounds?.width ?? layer.width : layer[field]
        const labels = { x: 'Horizontal position', y: 'Vertical position', width: 'Width', height: 'Height', size: 'Text size', maxLines: 'Maximum lines' }
        return <label key={key} className="block text-xs">{labels[field]} · {value}{field === 'size' ? 'px' : field === 'maxLines' ? '' : '%'}<Slider aria-label={`${layerName} ${field}`} min={field === 'size' ? 12 : field === 'width' ? 5 : field === 'height' ? 4 : field === 'maxLines' ? 1 : 0} max={field === 'size' ? 150 : field === 'maxLines' ? 8 : field === 'height' ? 100 - layer.y : field === 'width' ? 100 - layer.x : 95} step={1} value={[value]} onValueChange={([next]) => onAction({ op: 'layout', layer: layerName, patch: { [field]: next } })} /></label>

      })}
      {layerName !== 'logo' ? <div className="flex gap-1" aria-label="Text alignment">{(['left','center','right'] as const).map(align => <Button key={align} variant={(layer.align ?? 'left') === align ? 'secondary' : 'ghost'} size="sm" aria-pressed={(layer.align ?? 'left') === align} onClick={() => onAction({ op: 'layout', layer: layerName, patch: { align } })}>{align[0].toUpperCase() + align.slice(1)}</Button>)}</div> : null}
      {layerName !== 'logo' ? <ColorPicker value={layer.color} label="Text color" onChange={color => onAction({ op: 'layout', layer: layerName, patch: { color } })} onRemove={() => onAction({ op: 'layout', layer: layerName, patch: { color: '#FFFFFF' } })}><Button variant="outline" size="sm"><span className="size-3 rounded-full border" style={{ backgroundColor: layer.color }} />Text color</Button></ColorPicker> : null}
    </div>
    <div className="space-y-2 border-t pt-3"><InlineEdit label="Artwork revision" placeholder="What should change in the image?" value={revision} onChange={setRevision} multiline maxLength={1200} /><Button variant="outline" size="sm" disabled={busy || !revision.trim()} onClick={() => onAction({ op: 'generate', revisionPrompt: revision })}>Revise artwork</Button></div>
  </div>
}
