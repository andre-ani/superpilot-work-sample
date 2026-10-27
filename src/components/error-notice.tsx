import { IconAlertCircle, IconRefresh, IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { userError, type UserError, type UserErrorContext } from '@/lib/user-error'

export type ErrorNoticeProps = {
  error: unknown
  notice?: UserError
  context?: UserErrorContext
  onRetry?: () => void | Promise<void>
  onDismiss?: () => void
  className?: string
}

export function ErrorNotice({ error, notice: suppliedNotice, context, onRetry, onDismiss, className }: ErrorNoticeProps) {
  if (error === null || error === undefined || error === '') return null
  const notice = suppliedNotice ?? userError(error, context)
  const retryLabel = context === 'generation' ? 'Review and retry' : 'Try again'

  return <div role="alert" aria-live="polite" className={cn('flex items-start gap-3 rounded-lg border border-border bg-muted/35 px-3 py-2.5 text-sm', className)}>
    <IconAlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <p className="font-medium leading-5">{notice.title}</p>
      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{notice.message}</p>
      {onRetry && notice.retryable ? <Button type="button" variant="outline" size="xs" className="mt-2" onClick={() => void onRetry()}><IconRefresh aria-hidden="true" />{retryLabel}</Button> : null}
    </div>
    {onDismiss ? <Button type="button" variant="ghost" size="icon-xs" className="-mr-1 -mt-1" aria-label="Dismiss message" onClick={onDismiss}><IconX aria-hidden="true" /></Button> : null}
  </div>
}
