import { IconLoader2 } from '@tabler/icons-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Spinner({className,...props}:ComponentProps<typeof IconLoader2>){
  return <IconLoader2 aria-hidden="true" className={cn('size-4 animate-spin motion-reduce:animate-none',className)} {...props}/>
}
