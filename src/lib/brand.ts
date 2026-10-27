/** Original extraction evidence. Keep merchant edits in a separate draft. */
export type BrandSummary = {
  sourceUrl: string
  extractedAt: string
  name: string
  description: string
  brandContext?: string
  informationSections?: import('./brand-actions').BrandInformationSection[]
  researchStatus?: 'complete' | 'unavailable'
  researchSources?: { url: string; title: string }[]
  visualStyle?: string
  visualReferences?: string[]
  visualAnalysis?: { status: 'complete' | 'unavailable'; evidenceHash: string | null; model?: string; reason?: string; uncertainty?: string[] }
  logoUrl: string | null
  logoCandidates: string[]
  /** Primary brand palette. */
  colors: string[]
  secondaryColors?: string[]
  fonts: { heading: string | null; body: string | null; secondary?: string | null }
  headings: string[]
  warnings: string[]
  provenance: string[]
}
