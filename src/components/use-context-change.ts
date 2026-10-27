import { useEffect, useRef, useState } from 'react'

export type ContextEntry = { id: string; label: string; references: string[] }
export function useContextChange(entries: ContextEntry[]) {
  const signature = JSON.stringify(entries)
  const previous = useRef<ContextEntry[] | null>(null)
  const [notice, setNotice] = useState<{ id: number; text: string; removed: boolean } | null>(null)
  useEffect(() => {
    const before = previous.current
    previous.current = entries
    if (!before) return
    const added = entries.filter(item => !before.some(old => old.id === item.id))
    const removed = before.filter(item => !entries.some(next => next.id === item.id))
    const changed = entries.find(item => {
      const old = before.find(old => old.id === item.id)
      return old && JSON.stringify(old.references) !== JSON.stringify(item.references)
    })
    let text = '', isRemoval = false
    if (added.length) text = added.length === 1 ? `Added ${added[0].label}` : `Added ${added.length} items`
    else if (removed.length) { text = removed.length === 1 ? `Removed ${removed[0].label}` : `Removed ${removed.length} items`; isRemoval = true }
    else if (changed) {
      const old = before.find(item => item.id === changed.id)!
      const addedImages = changed.references.filter(url => !old.references.includes(url)).length
      const removedImages = old.references.filter(url => !changed.references.includes(url)).length
      isRemoval = !addedImages && !!removedImages
      text = addedImages && removedImages ? `Updated images · ${changed.label}` : `${addedImages ? 'Added' : 'Removed'} ${addedImages || removedImages} ${(addedImages || removedImages) === 1 ? 'image' : 'images'} · ${changed.label}`
    }
    if (text) setNotice({ id: Date.now(), text, removed: isRemoval })
  }, [signature])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 2400)
    return () => window.clearTimeout(timer)
  }, [notice])
  return notice
}
