export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

const storeKey = (store: string) => `superpilot-studio-v1:${store}`
const flowKey = (flowId: string) => `superpilot-studio-flow-v1:${flowId}`
const legacyKey = (store: string) => `superpilot-studio-legacy-v1:${store}`

function storageOrDefault(storage?: StorageLike): StorageLike {
  if (storage) return storage
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage
  throw new Error('localStorage is unavailable.')
}

function parse<T>(raw: string | null): T | null {
  if (raw === null) return null
  try { return JSON.parse(raw) as T } catch { return null }
}

function isLegacyRecord(raw: string | null): raw is string {
  if (raw === null) return false
  try {
    const value: unknown = JSON.parse(raw)
    return !!value && typeof value === 'object' && typeof (value as { flowId?: unknown }).flowId !== 'string'
  } catch { return false }
}

export function readWorkspace<T>(store: string, flowId?: string, storage?: StorageLike): T | null {
  const source = storageOrDefault(storage)
  return parse<T>(source.getItem(flowId === undefined ? storeKey(store) : flowKey(flowId)))
}

export function readLegacyWorkspace<T>(store: string, storage?: StorageLike): T | null {
  const source = storageOrDefault(storage)
  const archived = source.getItem(legacyKey(store))
  if (archived !== null) return parse<T>(archived)
  const current = source.getItem(storeKey(store))
  return isLegacyRecord(current) ? parse<T>(current) : null
}

export function writeWorkspace(store: string, value: { flowId?: string } & Record<string, unknown>, storage?: StorageLike): void {
  const target = storageOrDefault(storage)
  const serialized = JSON.stringify(value)
  const currentKey = storeKey(store)

  if (typeof value.flowId === 'string') {
    const previous = target.getItem(currentKey)
    if (isLegacyRecord(previous) && target.getItem(legacyKey(store)) === null) target.setItem(legacyKey(store), previous)
    target.setItem(flowKey(value.flowId), serialized)
  }
  target.setItem(currentKey, serialized)
}
