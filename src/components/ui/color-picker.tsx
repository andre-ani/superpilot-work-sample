import { useState, type ReactElement } from 'react'
import { IconCheck, IconTrash } from '@tabler/icons-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// HSL keeps all three channels accessible through shadcn's keyboard/touch sliders.
function fromHex(hex: string): [number, number, number] {
  if (!/^#[a-f\d]{6}$/i.test(hex)) return [0, 0, 0]
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min, lightness = (max + min) / 2
  let hue = 0
  if (delta) hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  return [(hue * 60 + 360) % 360, delta ? delta / (1 - Math.abs(2 * lightness - 1)) * 100 : 0, lightness * 100]
}
function toHex([h, s, l]: number[]) {
  const saturation = s / 100, lightness = l / 100, a = saturation * Math.min(lightness, 1 - lightness)
  const channel = (n: number) => { const k = (n + h / 30) % 12; return Math.round((lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255).toString(16).padStart(2, '0') }
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase()
}

export function ColorPicker({ value, onChange, onRemove, onEditStart, defaultOpen = false, children, label }: {
  value: string; onChange: (color: string) => void; onRemove: () => void; onEditStart?: () => void; defaultOpen?: boolean; children: ReactElement; label: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [channels, setChannels] = useState(() => fromHex(value))
  const [hex, setHex] = useState(value)
  const valid = /^#[a-f\d]{6}$/i.test(hex)
  const change = (index: number, next: number) => {
    const updated: [number, number, number] = [...channels]
    updated[index] = next
    const result = toHex(updated)
    setChannels(updated); setHex(result); onChange(result)
  }
  return <Popover open={open} onOpenChange={next => { setOpen(next); if (next) { onEditStart?.(); setChannels(fromHex(value)); setHex(value) } }}>
    <PopoverTrigger asChild>{children}</PopoverTrigger>
    <PopoverContent aria-label={label} className="w-64 space-y-3" align="start" collisionPadding={12}>
      <div className="flex items-center gap-3"><span className="size-9 shrink-0 rounded-md border" style={{ background: value }} aria-hidden="true" /><Input aria-label="Hex color" value={hex} maxLength={7} aria-invalid={!valid} onChange={e => { const next = e.target.value.toUpperCase(); setHex(next); if (/^#[a-f\d]{6}$/i.test(next)) { setChannels(fromHex(next)); onChange(next) } }} onKeyDown={e => { if (e.key === 'Enter' && valid) setOpen(false) }} /></div>
      {!valid ? <p role="alert" className="text-xs text-destructive">Enter a six-digit hex color.</p> : null}
      {[
        { name: 'Hue', max: 360, background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' },
        { name: 'Saturation', max: 100, background: `linear-gradient(to right, hsl(${channels[0]} 0% ${channels[2]}%), hsl(${channels[0]} 100% ${channels[2]}%))` },
        { name: 'Lightness', max: 100, background: `linear-gradient(to right, #000, hsl(${channels[0]} ${channels[1]}% 50%), #fff)` },
      ].map((channel, index) => <div key={channel.name}><div className="flex justify-between text-xs"><span>{channel.name}</span><span className="tabular-nums text-muted-foreground">{Math.round(channels[index])}{index === 0 ? '°' : '%'}</span></div><Slider appearance="color" aria-label={channel.name} value={[channels[index]]} max={channel.max} step={1} onValueChange={values => change(index, values[0])} trackStyle={{ background: channel.background }} /></div>)}
      <div className="flex items-center justify-between border-t pt-3"><Button variant="ghost" size="icon-sm" aria-label="Remove this color" onClick={() => { setOpen(false); onRemove() }}><IconTrash aria-hidden="true" /></Button><Button size="sm" disabled={!valid} onClick={() => setOpen(false)}><IconCheck aria-hidden="true" /> Done</Button></div>
    </PopoverContent>
  </Popover>
}
