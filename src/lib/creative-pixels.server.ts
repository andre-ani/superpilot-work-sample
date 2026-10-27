import path from 'node:path'
import { publicResource } from './catalog.server.ts'
import { readBrandLogo, saveBrandLogo } from './brand-assets.server.ts'
import { localLogoName } from './studio.ts'
import { dataRoot, digest, readJson, writeJson } from './studio-storage.server.ts'

/** Freeze actual image pixels once; all selected URLs still reach image generation. */
export async function creativePixels(urls: string[], cacheScope?:string) {
  const images: { source: string; hash: string; base64: string; mediaType: string }[] = [], unavailable: string[] = []
  for (const source of [...new Set(urls)]) {
    try {
      let name = localLogoName(source)
      if (!name) {
        const file = path.join(dataRoot, 'creative-pixels', `${cacheScope?digest({source,cacheScope}):digest(source)}.json`)
        const cached = await readJson<{ name: string }>(file)
        name = cached?.name ?? null
        if (!name) {
          const resource = await publicResource(source)
          const assetUrl = await saveBrandLogo(resource.bytes.toString('base64'))
          name = localLogoName(assetUrl)!
          await writeJson(file, { source, name, recordedAt: new Date().toISOString() })
        }
      }
      const asset = await readBrandLogo(name)
      images.push({ source, hash: digest(asset.bytes.toString('base64')), base64: asset.bytes.toString('base64'), mediaType: asset.type })
    } catch { unavailable.push(source) }
  }
  return { images, unavailable }
}
