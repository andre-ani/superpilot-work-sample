import path from 'node:path'
import { dataRoot, entries, jobDir, readBinary, readJson, readSnapshot } from './studio-storage.server.ts'
import { creativeSchema, type CreativeState } from './creative.ts'
import type { Generation } from './studio.ts'

/** Read-only replay of an actual stored execution; never starts or repairs a job. */
export async function readStudioPreview(generationId?: string) {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) throw new Error('Saved studio review is available only in local development.')
  if (generationId && !/^[a-f0-9]{64}$/.test(generationId)) throw new Error('Choose a valid saved image ID.')
  const ids = generationId ? [generationId] : (await entries('generations')).filter(id => /^[a-f0-9]{64}$/.test(id))
  const candidates = (await Promise.all(ids.map(async id => {
    const job = await readJson<Generation>(path.join(jobDir(id), 'job.json'))
    return job?.id === id && job.status === 'complete' ? job : null
  }))).filter((job): job is Generation => !!job).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  for (const generation of candidates) {
    try {
      const filename = generation.images[0]
      if (!filename || !/^\d+\.(png|jpg)$/.test(filename)) continue
      const snapshot = await readSnapshot(generation.input.snapshotId)
      const product = snapshot.catalog.products.find(item => item.id === generation.input.productId)
      const variant = product?.variants.find(item => item.id === generation.input.variantId)
      if (snapshot.storeUrl !== generation.storeUrl || !product || !variant || ![...product.images, variant.image].includes(generation.input.image)) continue
      const bytes = await readBinary(path.join(jobDir(generation.id), filename))
      const valid = bytes && (filename.endsWith('.png') ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : bytes[0] === 255 && bytes[1] === 216)
      if (valid) {
        const review = await readJson<{ generationId: string; snapshotId: string; creative: CreativeState }>(path.join(dataRoot, 'composition-reviews', `${generation.id}.json`))
        const parsed = review?.generationId === generation.id && review.snapshotId === snapshot.id ? creativeSchema.safeParse(review.creative) : null
        return { snapshot, generation, reviewCreative: parsed?.success ? parsed.data : undefined }
      }
    } catch { /* Skip an incomplete stored execution; never manufacture replacement context. */ }
  }
  throw new Error(generationId ? 'This saved image is missing its original context or output. Choose another saved execution.' : 'No complete saved image with its original context is available. No generation was started.')
}
