import { useState, type FormEvent } from 'react'
import { IconArrowRight, IconLoader2 } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { normalizeStoreUrl } from '@/lib/catalog'

export function StoreUrlForm({ onSubmit, initialValue = '', busy = false, submitLabel = 'Browse products' }: { onSubmit: (url: string) => void | Promise<void>; initialValue?: string; busy?: boolean; submitLabel?: string }) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    try { const url = normalizeStoreUrl(value); setError(''); await onSubmit(url) }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not open that store. Try again.') }
  }
  return (
    <form onSubmit={submit} noValidate className="w-full">
      <label htmlFor="store-url" className="sr-only">Your Shopify store URL</label>
      <div className="relative">
        <Input id="store-url" name="store" type="text" inputMode="url" variant="composer" autoComplete="url" autoCapitalize="none" spellCheck={false}
          placeholder="Your Shopify store URL" value={value} maxLength={2048} disabled={busy} aria-invalid={!!error} aria-describedby={error ? 'store-url-error' : 'store-url-hint'}
          onChange={event => { setValue(event.target.value); if (error) setError('') }} />
        <div className="absolute top-1/2 right-2 -translate-y-1/2">
          <Button type="submit" size="icon" disabled={busy} aria-label={submitLabel}>
            {busy ? <IconLoader2 className="animate-spin" aria-hidden="true" /> : <IconArrowRight aria-hidden="true" />}
          </Button>
        </div>
      </div>
      {error ? <p id="store-url-error" role="alert" className="mt-3 text-sm text-destructive">{error}</p> : <p id="store-url-hint" className="mt-3 text-sm text-muted-foreground">Shopify stores only. Custom domains work, too.</p>}
    </form>
  )
}
