import { eveChannel } from 'eve/channels/eve'
import { localDev, none } from 'eve/channels/auth'
import { readBrandLogo } from '../../src/lib/brand-assets.server'
// Vercel deployment protection gates this preview; the demo itself has no sign-in flow.
export default eveChannel({
  auth: [localDev(), none()],
  uploadPolicy: { maxBytes: 6 * 1024 * 1024 },
  async fetchFile(value) {
    let url: URL
    try { url = new URL(value) } catch { return null }
    const local = process.env.NODE_ENV !== 'production' && ['127.0.0.1', 'localhost'].includes(url.hostname)
    const ownedHosts = [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_BRANCH_URL].filter(Boolean)
    if (!local && !ownedHosts.includes(url.host)) return null
    const match = url.pathname.match(/^\/api\/brand-assets\/([a-f0-9]{64}\.(?:png|jpg|webp))$/)
    if (!match) return null
    return (await readBrandLogo(match[1])).bytes
  },
})
