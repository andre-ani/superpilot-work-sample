import { MAX_PALETTE_COLORS } from './brand-actions.ts'
import type { BrandSummary } from './brand.ts'
import type { BrandDraft } from './studio.ts'

export type BrandField = Exclude<keyof BrandDraft, 'fontResolution'>
export type BrandEditedFields = Partial<Record<BrandField, true>>
const fields = ['name', 'description', 'brandContext', 'informationSections', 'logoUrl', 'colors', 'secondaryColors', 'headingFont', 'bodyFont', 'secondaryFont', 'direction', 'visualStyle', 'visualReferences'] as const satisfies readonly BrandField[]
const equal = (a: BrandDraft[BrandField], b: BrandDraft[BrandField], field?: BrandField) => {
  const fallback = field === 'visualStyle' || field === 'secondaryFont' || field === 'brandContext' ? '' : field === 'visualReferences' || field === 'secondaryColors' || field === 'informationSections' ? [] : undefined
  return JSON.stringify(a ?? fallback) === JSON.stringify(b ?? fallback)
}

export function brandDraftFromSummary(summary: BrandSummary): BrandDraft {
  return { informationSections: (summary.informationSections ?? []).map(section => ({ ...section })), name: summary.name, description: summary.description, brandContext: summary.brandContext ?? '', logoUrl: summary.logoUrl ?? '', colors: summary.colors.slice(0, MAX_PALETTE_COLORS), secondaryColors: [...(summary.secondaryColors ?? [])].slice(0, MAX_PALETTE_COLORS), headingFont: summary.fonts.heading ?? '', bodyFont: summary.fonts.body ?? '', secondaryFont: summary.fonts.secondary ?? '', direction: '', visualStyle: summary.visualStyle ?? '', visualReferences: [...(summary.visualReferences ?? [])] }
}

/** Mark on edit start as well as change; markers survive clearing or reverting values. */
export function markBrandEdits(previous: BrandDraft, next: BrandDraft, existing: BrandEditedFields = {}, explicitField?: BrandField): BrandEditedFields {
  const edited = { ...existing }
  for (const field of fields) if (!equal(previous[field], next[field], field)) edited[field] = true
  if (explicitField && fields.some(field => field === explicitField)) edited[explicitField] = true
  return edited
}

/** Legacy drafts lack markers. Preserve all differences from their original extraction. */
export function inferBrandEdits(baseline: BrandSummary, draft: BrandDraft): BrandEditedFields {
  return markBrandEdits(brandDraftFromSummary(baseline), draft)
}

export function mergeBrandEnrichment(current: BrandDraft, baseline: BrandSummary, incoming: BrandSummary, edited?: BrandEditedFields): BrandDraft {
  const previous = brandDraftFromSummary(baseline)
  const next = brandDraftFromSummary(incoming)
  const result = { ...current, colors: [...current.colors], secondaryColors: current.secondaryColors ? [...current.secondaryColors] : undefined, visualReferences: current.visualReferences ? [...current.visualReferences] : undefined }
  for (const field of fields) {
    // Direction is merchant intent, never an extraction result. Missing evidence cannot erase it or other known values.
    if (field === 'direction' || edited?.[field] || !edited && !equal(current[field], previous[field], field)) continue
    if (field === 'colors' || field === 'secondaryColors') {
      if (next[field]?.length) result[field] = [...next[field]!]
    } else if (field === 'informationSections') {
      if (next.informationSections?.length) result.informationSections = next.informationSections.map(section => ({ ...section }))
    } else if (field === 'visualReferences') {
      if (next.visualReferences?.length) result.visualReferences = [...next.visualReferences]
    } else if (next[field]?.trim()) result[field] = next[field]
  }
  return result
}
