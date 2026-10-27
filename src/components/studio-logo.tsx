import { useRef, useState } from 'react'
import { IconCheck, IconLink, IconLoader2, IconPencil, IconPhotoPlus, IconTrash, IconUpload } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { uploadBrandLogo } from '@/lib/brand-assets-functions'

export function StudioLogo({ value, name, onChange, onEditStart, card = false }: { value: string; name: string; onChange: (url: string) => void; onEditStart?: () => void; card?: boolean }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState(value)
  const [showUrl, setShowUrl] = useState(false)
  const [failed, setFailed] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  async function upload(file?: File) {
    if (!file) return
    if (file.size > 4 * 1024 * 1024) { setError('Choose an image under 4 MB.'); return }
    setBusy(true); setError('')
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1])
        reader.onerror = () => reject(new Error('Could not read this image.'))
        reader.readAsDataURL(file)
      })
      const saved = await uploadBrandLogo({ data })
      onChange(saved); setOpen(false)
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save this logo. Try again.') }
    finally { setBusy(false); if (input.current) input.current.value = '' }
  }
  function useUrl() {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error()
      onChange(parsed.href); setOpen(false)
    } catch { setError('Enter an HTTPS image URL.') }
  }
  return <Popover open={open} onOpenChange={next => { setOpen(next); if (next) { onEditStart?.(); setUrl(value); setError(''); setShowUrl(false) } }}>
    <PopoverTrigger asChild><Button variant="logo" size={card ? 'card-logo' : 'logo'} aria-label={value ? 'Change brand logo' : 'Add brand logo'}>
      {value && failed !== value ? <img src={value} alt={`${name || 'Brand'} logo`} className={card ? 'size-full object-contain' : 'max-h-full max-w-full rounded bg-white p-1 object-contain'} onError={() => setFailed(value)} /> : <IconPhotoPlus className="size-6 text-muted-foreground" aria-hidden="true" />}
      <span className={`absolute right-2 bottom-2 rounded-md bg-background/90 p-1.5 text-muted-foreground transition-opacity ${card ? 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100' : ''}`}><IconPencil className="size-3" aria-hidden="true" /></span>
    </Button></PopoverTrigger>
    <PopoverContent aria-label="Change brand logo" align="start" collisionPadding={12} className="w-72 space-y-3">
      <Input ref={input} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Logo file" className="sr-only" tabIndex={-1} onChange={event => void upload(event.target.files?.[0])} />
      <Button variant="outline" className="w-full" disabled={busy} onClick={() => input.current?.click()}>{busy ? <IconLoader2 className="animate-spin" aria-hidden="true" /> : <IconUpload aria-hidden="true" />}Upload logo</Button>
      <div className="flex items-center justify-between"><Button variant="ghost" size="sm" aria-expanded={showUrl} onClick={() => setShowUrl(!showUrl)}><IconLink aria-hidden="true" /> Image URL</Button>{value ? <Button variant="ghost" size="icon-sm" aria-label="Remove logo" onClick={() => { onChange(''); setOpen(false) }}><IconTrash aria-hidden="true" /></Button> : null}</div>
      {showUrl ? <div className="flex items-center gap-2"><Input aria-label="Logo image URL" type="url" maxLength={2048} placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') useUrl() }} /><Button size="icon" aria-label="Use logo URL" onClick={useUrl}><IconCheck aria-hidden="true" /></Button></div> : null}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </PopoverContent>
  </Popover>
}
