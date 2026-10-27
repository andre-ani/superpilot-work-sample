import * as React from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, variant = 'default', ...props }: React.ComponentProps<'textarea'> & { variant?: 'default' | 'inline' | 'inline-card-copy' }) {
  return <textarea data-slot="textarea" className={cn('flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base leading-relaxed shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30', variant !== 'default' && 'h-full min-h-0 resize-none px-2 shadow-none transition-[color,background-color,border-color,box-shadow] duration-150 ease-out focus-visible:ring-1 focus-visible:ring-ring/20', variant === 'inline-card-copy' && 'px-1 py-1 text-center text-[13px] leading-[1.6] md:text-[13px]', className)} {...props} />
}
