import { createHash } from 'node:crypto'
import path from 'node:path'
import { atomicWrite, dataRoot, readBinary } from './studio-storage.server.ts'

const assetName = /^[a-f0-9]{64}\.(png|jpg|webp)$/
export async function saveBrandLogo(base64: string) {
  if (!base64 || base64.length > 5_600_000 || !/^[a-z\d+/=]+$/i.test(base64)) throw new Error('Choose a PNG, JPG or WebP image under 4 MB.')
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length > 4 * 1024 * 1024) throw new Error('Choose an image under 4 MB.')
  const extension = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png'
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'jpg'
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'webp' : null
  if (!extension) throw new Error('Choose a PNG, JPG or WebP image.')
  const name = `${createHash('sha256').update(bytes).digest('hex')}.${extension}`
  await atomicWrite(path.join(dataRoot, 'assets', name), bytes)
  return `/api/brand-assets/${name}`
}
export async function readBrandLogo(name: string) {
  if (!assetName.test(name)) throw new Error('Invalid logo.')
  const bytes = await readBinary(path.join(dataRoot, 'assets', name))
  if (!bytes) throw new Error('Logo not found.')
  return { bytes, type: name.endsWith('.png') ? 'image/png' : name.endsWith('.jpg') ? 'image/jpeg' : 'image/webp' }
}
