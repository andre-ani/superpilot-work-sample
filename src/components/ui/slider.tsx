import * as React from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

export function Slider({ className, value, defaultValue, min = 0, max = 100, trackStyle, appearance = 'default', ...props }: React.ComponentProps<typeof SliderPrimitive.Root> & { trackStyle?: React.CSSProperties; appearance?: 'default' | 'color' }) {
  const values = value ?? defaultValue ?? [min]
  return <SliderPrimitive.Root data-slot="slider" value={value} defaultValue={defaultValue} min={min} max={max} className={cn('relative flex min-h-8 w-full touch-none items-center select-none data-[disabled]:opacity-50', className)} {...props}>
    <SliderPrimitive.Track data-slot="slider-track" style={trackStyle} className={cn('relative grow overflow-hidden rounded-full bg-muted', appearance === 'color' ? 'h-3' : 'h-1.5')}>
      {appearance !== 'color' ? <SliderPrimitive.Range className="absolute h-full bg-primary" /> : null}
    </SliderPrimitive.Track>
    {values.map((_, index) => <SliderPrimitive.Thumb key={index} aria-label={props['aria-label']} aria-valuetext={props['aria-valuetext']} className="block size-4 shrink-0 rounded-full border-2 border-primary bg-background shadow-sm outline-none transition-shadow hover:ring-4 hover:ring-ring/20 focus-visible:ring-4 focus-visible:ring-ring/40 disabled:pointer-events-none" />)}
  </SliderPrimitive.Root>
}
