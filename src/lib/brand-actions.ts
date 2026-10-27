import { z } from 'zod'
import { normalizeStoreUrl } from './catalog.ts'

export const MIN_PALETTE_COLORS = 1
export const MAX_PALETTE_COLORS = 8
/** Empty is unknown/explicitly cleared; a populated palette has 1–8 colors. */
export const paletteSchema = z.array(z.string().regex(/^#[a-f\d]{6}$/i)).max(MAX_PALETTE_COLORS)

export const brandReferenceSchema = z.string().max(2048).refine(value => {
  if (/^\/api\/brand-assets\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(value)) return true
  try { const url = new URL(value); normalizeStoreUrl(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port } catch { return false }
}, 'Use a saved brand image or HTTPS image URL.')
export const informationSectionsSchema = z.array(z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/), title: z.string().min(1).max(80),
  content: z.string().max(6000), status: z.enum(['loading', 'complete', 'unavailable']).optional(),
}).strict()).max(12).refine(sections => new Set(sections.map(section => section.id)).size === sections.length, 'Use distinct section IDs.')
export type BrandInformationSection = z.infer<typeof informationSectionsSchema>[number]
export function mergeInformationSections(current: BrandInformationSection[] = [], incoming: BrandInformationSection[]): BrandInformationSection[] {
  if (!incoming.length) return []
  return informationSectionsSchema.parse([...new Map([...current, ...incoming].map(section => [section.id, section])).values()])
}
export const brandPatchSchema = z.object({
  name: z.string().max(300).optional(), description: z.string().max(2000).optional(), brandContext: z.string().max(6000).optional(),
  logoUrl: z.union([brandReferenceSchema, z.literal('')]).optional(),
  colors: paletteSchema.optional(), secondaryColors: paletteSchema.optional(),
  headingFont: z.string().max(100).optional(), bodyFont: z.string().max(100).optional(), secondaryFont: z.string().max(100).optional(),
  direction: z.string().max(2000).optional(), visualStyle: z.string().max(1600).optional(),
  visualReferences: z.array(brandReferenceSchema).optional(), informationSections: informationSectionsSchema.optional(),
}).strict()
export const brandUpdateActionSchema = z.object({
  kind: z.literal('brand-update'), snapshotId: z.string().uuid(), mode: z.enum(['edit', 'suggestion']),
  patch: brandPatchSchema, evidenceHash: z.string().nullable().optional(),
  analysisStatus: z.enum(['complete', 'unavailable']).optional(), reason: z.string().max(500).optional(),
})
export type BrandUpdateAction = z.infer<typeof brandUpdateActionSchema>
