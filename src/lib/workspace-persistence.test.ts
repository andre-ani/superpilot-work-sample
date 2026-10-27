import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readLegacyWorkspace, readWorkspace, writeWorkspace, type StorageLike } from './workspace-persistence.ts'

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { values: Map<string, string> } {
  const values = new Map(Object.entries(initial))
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
  }
}

test('keeps each flow while the per-store key points at the latest full record', () => {
  const storage = memoryStorage()
  writeWorkspace('https://shop.example', { flowId: 'flow-a', step: 'brand' }, storage)
  writeWorkspace('https://shop.example', { flowId: 'flow-b', step: 'products' }, storage)

  assert.deepEqual(readWorkspace('https://shop.example', 'flow-a', storage), { flowId: 'flow-a', step: 'brand' })
  assert.deepEqual(readWorkspace('https://shop.example', 'flow-b', storage), { flowId: 'flow-b', step: 'products' })
  assert.deepEqual(readWorkspace('https://shop.example', undefined, storage), { flowId: 'flow-b', step: 'products' })
})

test('archives a legacy per-store record before the first flow overwrites its pointer', () => {
  const store = 'https://legacy.example'
  const legacy = JSON.stringify({ snapshotId: 'old-scan', step: 'create' })
  const storage = memoryStorage({ [`superpilot-studio-v1:${store}`]: legacy })

  writeWorkspace(store, { flowId: 'new-flow', step: 'brand' }, storage)

  assert.equal(storage.values.get(`superpilot-studio-legacy-v1:${store}`), legacy)
  assert.deepEqual(readLegacyWorkspace(store, storage), { snapshotId: 'old-scan', step: 'create' })
  assert.deepEqual(readWorkspace(store, 'new-flow', storage), { flowId: 'new-flow', step: 'brand' })
})

test('returns null for malformed JSON without changing the stored value', () => {
  const key = 'superpilot-studio-flow-v1:broken-flow'
  const raw = '{not-json'
  const storage = memoryStorage({ [key]: raw })

  assert.equal(readWorkspace('https://shop.example', 'broken-flow', storage), null)
  assert.equal(storage.values.get(key), raw)
})

test('propagates storage quota errors', () => {
  const quota = new DOMException('quota', 'QuotaExceededError')
  const storage: StorageLike = {
    getItem: () => null,
    setItem: () => { throw quota },
  }

  assert.throws(() => writeWorkspace('https://shop.example', { flowId: 'flow-a' }, storage), error => error === quota)
})

test('idea history, selection and pending generation identity survive a workspace reload',()=>{
  const storage=memoryStorage()
  const saved={flowId:'ideas-flow',creative:{adDirectionId:'first'},ideaCollections:[{signature:'brand-products',result:{contextKey:'current',directions:[{id:'first'},{id:'second'},{id:'reserve'}],summary:'Saved model output',cached:false},revealed:3,focusIndex:2,pending:{id:'same-request-on-reload',count:2,refresh:true}}]}
  writeWorkspace('https://shop.example',saved,storage)
  assert.deepEqual(readWorkspace('https://shop.example','ideas-flow',storage),saved)
})
