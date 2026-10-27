import { useState } from 'react'
import { IconPhoto } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

export function ProductImage({ src, title, className }: { src?: string | null; title: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  return (
    <span className={cn('flex aspect-square items-center justify-center overflow-hidden bg-white', className)}>
      {src && failed !== src ? <img src={src} alt={title} loading="lazy" decoding="async" className="size-full object-contain" onError={() => setFailed(src)} />
        : <span className="flex flex-col items-center gap-2 text-neutral-500"><IconPhoto aria-hidden="true" /><span className="text-xs">No image available</span></span>}
    </span>
  )
}
