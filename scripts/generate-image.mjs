// A separate local worker survives browser disconnects, navigation and Vite HMR.
// Keys are read only here, from this project's .env; never passed in arguments.
import { readFile, open, rename } from 'node:fs/promises'
import path from 'node:path'
import { parseEnv } from 'node:util'
import { finishSavedResponse, jobDir, readGeneration, saveGeneration, writeJson } from '../src/lib/studio-storage.server.ts'
import { localLogoName, rasterLogo } from '../src/lib/studio.ts'
import { readBrandLogo } from '../src/lib/brand-assets.server.ts'

const id = process.argv[2]
const directory = jobDir(id)
let job = await readGeneration(id)
if (!job || job.status !== 'queued') process.exit(0)
await writeJson(path.join(directory, 'worker.json'), process.pid)
try {
  const env = parseEnv(await readFile(path.resolve('.env'), 'utf8'))
  if (!env.OPENROUTER_API_KEY) throw new Error('Add the project OpenRouter key to .env before generating.')
  const prompt = await readFile(path.join(directory, 'prompt.txt'), 'utf8')
  let logoReference = job.input.brand.logoUrl
  const savedLogo = localLogoName(logoReference)
  if (savedLogo) {
    const asset = await readBrandLogo(savedLogo)
    logoReference = `data:${asset.type};base64,${asset.bytes.toString('base64')}`
  }
  job = { ...job, status: 'generating' }
  await saveGeneration(job)
  const response = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(480_000),
    body: JSON.stringify({
      model: job.model, prompt, n: 1, quality: 'medium', output_format: 'png',
      aspect_ratio: job.input.format === 'story' ? '9:16' : '1:1',
      input_references: [job.input.image, ...(rasterLogo(job.input.brand.logoUrl) ? [logoReference] : [])].map(url => ({ type: 'image_url', image_url: { url } })),
    }),
  })
  // Journal the entire provider response before parsing or updating the UI.
  // Incomplete responses stay on disk too; no response payload is logged.
  const responseFile = path.join(directory, 'response.partial')
  const handle = await open(responseFile, 'wx', 0o600)
  try {
    if (response.body) for await (const chunk of response.body) await handle.writeFile(chunk)
    await handle.sync()
  } finally { await handle.close() }
  await rename(responseFile, path.join(directory, 'response.json'))
  if (!response.ok) throw new Error(`The image service returned ${response.status}. Your request is saved. Try a new version after checking the service or project credit.`)
  if (!await finishSavedResponse(job)) throw new Error('The image service returned no image. The response is saved; try a new version.')
} catch (error) {
  // Never include provider response bodies, credentials, or raw network errors.
  const message = error instanceof Error && /^(Add the project|The image service|The response)/.test(error.message)
    ? error.message : 'Generation stopped before the image could be saved. Your request and any received data are retained. Try a new version.'
  await saveGeneration({ ...job, status: 'failed', error: message }).catch(() => { process.exitCode = 1 })
}
