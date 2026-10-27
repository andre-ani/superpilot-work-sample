export type BrandFontAsset = {
  family: string
  url: string
  format: 'woff2' | 'woff' | 'truetype'
  weight: string
  style: string
  requestedFamily?: string | null
  source?: 'original' | 'fallback'
  fallbackReason?: string
}
export type BrandFontResolution = {
  requestedFamily: string | null
  resolvedFamily: string
  assetUrl: string
  source: 'original' | 'fallback'
  substituted: boolean
  reason?: string
}
export type BrandFontResolutionMap = { heading: BrandFontResolution; body: BrandFontResolution; secondary?: BrandFontResolution }
export type BrandFonts = { heading: BrandFontAsset | null; body: BrandFontAsset | null; secondary?: BrandFontAsset | null; resolution?: BrandFontResolutionMap; warnings: string[] }

export function brandFontOutcome(requested: string, original: BrandFontAsset | null, reason = 'Source font unavailable.'): { asset: BrandFontAsset; resolution: BrandFontResolution } {
  const requestedFamily = requested.trim() || null
  const asset: BrandFontAsset = original ? { ...original, requestedFamily, source: 'original' } : {
    family: 'Inter', url: '/fonts/inter-latin-variable.woff2', format: 'woff2', weight: '100 900', style: 'normal',
    requestedFamily, source: 'fallback', fallbackReason: requestedFamily ? reason : 'No source font specified.',
  }
  return { asset, resolution: { requestedFamily, resolvedFamily: asset.family, assetUrl: asset.url, source: asset.source!, substituted: !original, reason: asset.fallbackReason } }
}
