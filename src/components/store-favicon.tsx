import { useEffect, useState } from 'react'
import { loadFavicon } from '@/lib/favicon-functions'
export function StoreFavicon({ store, className = 'size-4' }: { store: string; className?: string }) {
  const [source, setSource] = useState<{ store: string; url: string | null } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  useEffect(() => { let active = true; loadFavicon({ data: store }).then(url => { if (active) setSource({ store, url }) }).catch(() => {}); return () => { active = false } }, [store])
  const url = source?.store === store ? source.url : null
  return url && failed !== url ? <img src={url} alt="" aria-hidden="true" className={`${className} shrink-0 rounded-sm bg-white object-contain`} onError={() => setFailed(url)} /> : <span aria-hidden="true" className={`${className} shrink-0`} />
}
