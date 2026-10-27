import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, mkdtemp, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import type { Generation, StoreSnapshot } from './studio.ts'

// Disposable namespace; no provider calls and no production-cache mutation.
const source = path.resolve('src/lib/studio-storage.server.ts')
await mkdir(path.resolve('.work'), { recursive: true })
const temporary = await mkdtemp(path.resolve('.work/studio-storage-test-'))
process.chdir(temporary)
const storage = await import(pathToFileURL(source).href) as typeof import('./studio-storage.server.ts')

test('refresh preserves the original scan while updating only the store pointer', async () => {
  const first = { id: '11111111-1111-1111-1111-111111111111', storeUrl: 'https://store.example.com', scannedAt: new Date().toISOString() } as StoreSnapshot
  const second = { ...first, id: '22222222-2222-2222-2222-222222222222' }
  await storage.saveSnapshot(first)
  await storage.saveSnapshot(second)
  assert.deepEqual(await storage.readSnapshot(first.id), first)
  assert.deepEqual(await storage.cachedSnapshot(first.storeUrl), second)
  const readback = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', `import {cachedSnapshot} from ${JSON.stringify(pathToFileURL(source).href)}; const s=await cachedSnapshot('https://store.example.com'); process.stdout.write(s.id)`], { cwd: temporary, encoding: 'utf8' })
  assert.equal(readback.status, 0)
  assert.equal(readback.stdout, second.id)
})

test('concurrent duplicate generation requests reserve exactly one job and preserve outputs', async () => {
  const id = storage.digest('identical creative')
  const job = { id, storeUrl: 'https://store.example.com', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: 'queued', images: [] } as unknown as Generation
  const results = await Promise.all([storage.reserveGeneration(job, 'Original prompt'), storage.reserveGeneration(job, 'Should not overwrite')])
  assert.equal(results.filter(value => value === null).length, 1)
  assert.equal(await readFile(path.join(storage.jobDir(id), 'prompt.txt'), 'utf8'), 'Original prompt')
  await storage.atomicWrite(path.join(storage.jobDir(id), '0.png'), Buffer.from('retained image bytes'))
  await storage.saveGeneration({ ...job, status: 'complete', images: ['0.png'] })
  const replay = await storage.reserveGeneration(job, 'Must still not overwrite')
  assert.equal(replay?.status, 'complete')
  assert.equal(await readFile(path.join(storage.jobDir(id), '0.png'), 'utf8'), 'retained image bytes')
  assert.equal((await stat(path.join(storage.jobDir(id), 'job.json'))).mode & 0o777, 0o600)
  assert.equal((await storage.listGenerations(job.storeUrl)).length, 1)
})

test('path traversal is rejected and interrupted work is surfaced without an automatic paid retry', async () => {
  assert.throws(() => storage.jobDir('../../.env'), /Invalid/)
  const id = storage.digest('interrupted request')
  const job = { id, storeUrl: 'https://store.example.com', createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(), status: 'generating', images: [] } as unknown as Generation
  await storage.writeJson(path.join(storage.jobDir(id), 'job.json'), job)
  const recovered = await storage.readGeneration(id)
  assert.equal(recovered?.status, 'interrupted')
  assert.equal(JSON.parse(await readFile(path.join(storage.jobDir(id), 'job.json'), 'utf8')).status, 'generating')
})

test('a journaled provider image is recovered after a worker exit without contacting the provider', async () => {
  const id = storage.digest('received but not finalized')
  const job = { id, storeUrl: 'https://recover.example.com', createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(), status: 'generating', images: [] } as unknown as Generation
  await storage.writeJson(path.join(storage.jobDir(id), 'job.json'), job)
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6S9sAAAAASUVORK5CYII='
  await storage.writeJson(path.join(storage.jobDir(id), 'response.json'), { data: [{ b64_json: png, media_type: 'image/png' }], usage: { cost: 0.01 } })
  const recovered = await storage.readGeneration(id)
  assert.equal(recovered?.status, 'complete')
  assert.equal(recovered?.cost, 0.01)
  assert.deepEqual(await readFile(path.join(storage.jobDir(id), '0.png')), Buffer.from(png, 'base64'))
  assert.ok(await stat(path.join(storage.jobDir(id), 'response.json')))
})
