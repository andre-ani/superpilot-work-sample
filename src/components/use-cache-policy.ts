import { useSyncExternalStore } from 'react'
import { readCachePolicy, setCachePolicy, subscribeCachePolicy } from '@/lib/cache-policy'

export function useCachePolicy() {
  return [useSyncExternalStore(subscribeCachePolicy, readCachePolicy, () => false), setCachePolicy] as const
}
