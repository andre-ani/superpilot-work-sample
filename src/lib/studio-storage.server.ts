import { mkdir, open, readFile, readdir, rename, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import type { Generation, StoreSnapshot } from './studio.ts'
import { get as getBlob, put as putBlob, list as listBlobs, BlobPreconditionFailedError } from '@vercel/blob'

// Deliberately outside temporary/build directories. No expiry and no delete path.
export const dataRoot = path.resolve(process.cwd(), '.studio-data')
export const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export function safeId(id: string) {
  if (!/^(?:[a-f0-9]{64}|[a-f0-9-]{36})$/.test(id)) throw new Error('Invalid saved item.')
  return id
}
export const jobDir = (id: string) => path.join(dataRoot, 'generations', safeId(id))
export const cloudStorage = () => !!process.env.VERCEL || process.env.STUDIO_STORAGE === 'blob'
function blobPath(file: string) {
  const relative = path.relative(dataRoot, path.resolve(file))
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Invalid studio storage path.')
  return `studio/${relative.split(path.sep).join('/')}`
}

export async function readBinary(file: string): Promise<Buffer | null> {
  if (cloudStorage()) {
    const result = await getBlob(blobPath(file), { access: 'private', useCache: false })
    return result?.statusCode === 200 ? Buffer.from(await new Response(result.stream).arrayBuffer()) : null
  }
  try { return await readFile(file) } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error }
}

export async function atomicWrite(file: string, value: string | Buffer) {
  if (cloudStorage()) {
    await putBlob(blobPath(file), value, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: file.endsWith('.json') ? 'application/json' : file.endsWith('.png') ? 'image/png' : file.endsWith('.jpg') ? 'image/jpeg' : file.endsWith('.webp') ? 'image/webp' : 'application/octet-stream' })
    return
  }
  await mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.${randomUUID()}.tmp`
  const handle = await open(temporary, 'wx', 0o600)
  try { await handle.writeFile(value); await handle.sync() } finally { await handle.close() }
  await rename(temporary, file)
}
export const writeJson = (file: string, value: unknown) => atomicWrite(file, JSON.stringify(value, null, 2))
export async function readJson<T>(file: string): Promise<T | null> {
  const bytes = await readBinary(file)
  return bytes ? JSON.parse(bytes.toString('utf8')) as T : null
}
export async function readSnapshot(id: string) {
  const snapshot = await readJson<StoreSnapshot>(path.join(dataRoot, 'scans', `${safeId(id)}.json`))
  if (!snapshot) throw new Error('This saved scan could not be found. Scan the store again.')
  if (snapshot.enrichment?.sourceScanId && snapshot.enrichment.sourceScanId !== snapshot.id) {
    const original = await readJson<StoreSnapshot>(path.join(dataRoot, 'scans', `${safeId(snapshot.enrichment.sourceScanId)}.json`))
    if (original?.storeUrl === snapshot.storeUrl && original.enrichment) return { ...snapshot, brand: original.brand, baseBrand: snapshot.baseBrand ?? original.baseBrand, enrichment: original.enrichment }
  }
  return snapshot
}

/** Patch only this scan; never change the current-store pointer. */
export async function updateSnapshot(id: string, update: (current: StoreSnapshot) => StoreSnapshot): Promise<StoreSnapshot> {
  const file = path.join(dataRoot, 'scans', `${safeId(id)}.json`)
  if (cloudStorage()) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const result = await getBlob(blobPath(file), { access: 'private', useCache: false })
      if (!result || result.statusCode !== 200) throw new Error('Saved scan not found.')
      const current = await new Response(result.stream).json() as StoreSnapshot
      const next = update(current)
      if (next.id !== id || next.storeUrl !== current.storeUrl) throw new Error('A scan update cannot change its identity.')
      try { await putBlob(blobPath(file), JSON.stringify(next), { access: 'private', addRandomSuffix: false, contentType: 'application/json', ifMatch: result.blob.etag }); return next }
      catch (error) { if (!(error instanceof BlobPreconditionFailedError)) throw error }
    }
    throw new Error('The saved scan is busy. Try again.')
  }
  const lockPath = `${file}.lock`
  let lock: Awaited<ReturnType<typeof open>> | undefined
  for (let attempt = 0; attempt < 100; attempt++) {
    try { lock = await open(lockPath, 'wx', 0o600); break }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; await new Promise(resolve => setTimeout(resolve, 50)) }
  }
  if (!lock) throw new Error('The saved scan is busy. Try again.')
  try {
    const current = await readJson<StoreSnapshot>(file)
    if (!current) throw new Error('Saved scan not found.')
    const next = update(current)
    if (next.id !== id || next.storeUrl !== current.storeUrl) throw new Error('A scan update cannot change its identity.')
    await writeJson(file, next)
    return next
  } finally { await lock.close(); await unlink(lockPath) }
}
export async function saveSnapshot(snapshot: StoreSnapshot) {
  await writeJson(path.join(dataRoot, 'scans', `${snapshot.id}.json`), snapshot)
  await writeJson(path.join(dataRoot, 'stores', `${digest(snapshot.storeUrl)}.json`), { id: snapshot.id })
}
export async function cachedSnapshot(store: string) {
  const pointer = await readJson<{ id: string }>(path.join(dataRoot, 'stores', `${digest(store)}.json`))
  return pointer ? readSnapshot(pointer.id) : null
}
export async function entries(directory: string) {
  if (cloudStorage()) {
    const prefix = `studio/${directory}/`, names = new Set<string>()
    let cursor: string | undefined
    do {
      const result = await listBlobs({ prefix, cursor, limit: 1000 })
      for (const blob of result.blobs) names.add(blob.pathname.slice(prefix.length).split('/')[0])
      cursor = result.hasMore ? result.cursor : undefined
    } while (cursor)
    return [...names]
  }
  try { return await readdir(path.join(dataRoot, directory)) }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error }
}
export async function readGeneration(id: string): Promise<Generation | null> {
  const generation = await readJson<Generation>(path.join(jobDir(id), 'job.json'))
  if (!generation || !['queued', 'generating'].includes(generation.status)) return generation
  if (generation.workflowRunId || cloudStorage()) return generation
  const pid = await readJson<number>(path.join(jobDir(id), 'worker.json'))
  let alive = false
  if (pid) { try { process.kill(pid, 0); alive = true } catch { /* Worker exited. Never automatically retry a paid request. */ } }
  if (!alive && Date.now() - Date.parse(generation.updatedAt) > 30_000) {
    // A crash after the journal write must not strand an already-paid image.
    const recovered = await finishSavedResponse(generation).catch(() => null)
    if (recovered) return recovered
    return { ...generation, status: 'interrupted', error: 'Image creation was interrupted. Your request and any received output are retained. Start a new version when you are ready.' }
  }
  return generation
}
export async function saveGeneration(generation: Generation) {
  await writeJson(path.join(jobDir(generation.id), 'job.json'), { ...generation, updatedAt: new Date().toISOString() })
}
export async function finishSavedResponse(job: Generation): Promise<Generation | null> {
  const result = await readJson<{ data?: { b64_json?: string }[]; usage?: { cost?: number } }>(path.join(jobDir(job.id), 'response.json'))
  if (!Array.isArray(result?.data) || !result.data.length) return null
  const images: string[] = []
  for (const [index, output] of result.data.entries()) {
    if (typeof output.b64_json !== 'string') throw new Error('The response is saved, but its image format could not be read.')
    const bytes = Buffer.from(output.b64_json, 'base64')
    const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    const jpeg = bytes[0] === 255 && bytes[1] === 216
    if (!png && !jpeg) throw new Error('The response is saved, but it did not contain a PNG or JPEG image.')
    const filename = `${index}.${png ? 'png' : 'jpg'}`
    await atomicWrite(path.join(jobDir(job.id), filename), bytes)
    images.push(filename)
  }
  const complete: Generation = { ...job, status: 'complete', images, cost: typeof result.usage?.cost === 'number' ? result.usage.cost : undefined, updatedAt: new Date().toISOString() }
  await saveGeneration(complete)
  return complete
}
export async function listGenerations(storeUrl: string) {
  const jobs = await Promise.all((await entries('generations')).filter(id => /^[a-f0-9]{64}$/.test(id)).map(readGeneration))
  return jobs.filter((job): job is Generation => !!job && job.storeUrl === storeUrl).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function reserveGeneration(generation: Generation, prompt: string) {
  if (cloudStorage()) {
    try { await putBlob(blobPath(path.join(jobDir(generation.id), 'reservation.json')), JSON.stringify({ generation, prompt }), { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json' }) }
    catch (error) {
      for (let attempt = 0; attempt < 20; attempt++) { const existing = await readGeneration(generation.id); if (existing) return existing; await new Promise(resolve => setTimeout(resolve, 100)) }
      throw error
    }
    await atomicWrite(path.join(jobDir(generation.id), 'prompt.txt'), prompt)
    await saveGeneration(generation)
    return null
  }
  await mkdir(path.join(dataRoot, 'generations'), { recursive: true })
  try { await mkdir(jobDir(generation.id)) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    // A second tab can arrive between the exclusive mkdir and the first write.
    for (let attempt = 0; attempt < 20; attempt++) {
      const existing = await readGeneration(generation.id)
      if (existing) return existing
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    throw new Error('This request is already being saved. Wait a moment and try again.')
  }
  await writeFile(path.join(jobDir(generation.id), 'prompt.txt'), prompt, { flag: 'wx', mode: 0o600 })
  await saveGeneration(generation)
  return null
}
