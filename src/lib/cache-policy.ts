export const cachePolicyKey = 'superpilot-cache-enabled-v2'
export const cachePolicyEvent = 'superpilot-cache-policy'
type CacheStorage = Pick<Storage, 'getItem' | 'setItem'>

export function readCachePolicy(storage?: CacheStorage): boolean {
  try { return (storage ?? globalThis.localStorage).getItem(cachePolicyKey) === 'true' } catch { return false }
}
export function setCachePolicy(enabled: boolean, storage?: CacheStorage): void {
  try { (storage ?? globalThis.localStorage).setItem(cachePolicyKey, String(enabled)) } catch { /* Off remains the safe default when persistence is unavailable. */ }
  if (!storage && typeof window !== 'undefined') window.dispatchEvent(new Event(cachePolicyEvent))
}
export function subscribeCachePolicy(listener: () => void) {
  const changed = (event: StorageEvent) => { if (event.key === cachePolicyKey || event.key === null) listener() }
  window.addEventListener(cachePolicyEvent, listener)
  window.addEventListener('storage', changed)
  return () => { window.removeEventListener(cachePolicyEvent, listener); window.removeEventListener('storage', changed) }
}
