import { z } from 'zod'
import { AD_MIN_HEADLINE_SIZE, AD_MIN_BODY_SIZE } from './ad-typography.ts'

export const creativeModel = 'anthropic/claude-sonnet-5.5'
const copy = z.string().max(600)
export const briefSchema = z.object({ audience: copy, message: copy, offer: copy, hook: copy, headline: z.string().max(180), body: z.string().max(400), visual: z.string().max(1200) })
export const layerSchema = z.object({ x: z.number().min(0).max(95), y: z.number().min(0).max(95), width: z.number().min(5).max(100), size: z.number().min(12).max(150), color: z.string().regex(/^#[a-f\d]{6}$/i), visible: z.boolean(), height: z.number().min(4).max(100).optional(), maxLines: z.number().int().min(1).max(8).optional(), autoFit: z.boolean().optional(), align: z.enum(['left','center','right']).optional() })
export const layersSchema = z.object({ headline: layerSchema, body: layerSchema, logo: layerSchema })
export const copyOptionSchema = z.object({ id: z.string().min(1).max(80), label: z.string().min(1).max(60), headline: z.string().min(1).max(80), body: z.string().max(140) })
export const conceptSchema = briefSchema.extend({ id: z.string().min(1).max(80), name: z.string().max(100) })
export const imageAnalysisSchema = z.object({ kind: z.enum(['source','generated']), safeInset:z.number().min(0).max(20).optional(), subjectPadding:z.number().min(0).max(20).optional(), foregroundMask: z.object({ maskUrl:z.string().regex(/^\/api\/brand-assets\/[a-f0-9]{64}\.png$/),width:z.number().int().positive(),height:z.number().int().positive(),paddingPercent:z.number().min(0).max(20),model:z.string(),version:z.number() }).optional(), foregroundMaskStatus:z.enum(['complete','unavailable']).optional(), summary: z.string().max(1200), opportunities: z.array(z.object({ role: z.enum(['headline','body','logo']), imageIndex:z.number().int().nonnegative().optional(), x:z.number(),y:z.number(),width:z.number(),height:z.number(),reason:z.string(),color:z.string(),confidence:z.number() })), protectedAreas:z.array(z.object({x:z.number(),y:z.number(),width:z.number(),height:z.number(),label:z.string(),imageIndex:z.number().int().nonnegative().optional()})) })
export const creativeSchema = z.object({ revision: z.number().int().nonnegative(), imageAnalysis: imageAnalysisSchema.optional(), visionSourceHash: z.string().optional(), brief: briefSchema, concepts: z.array(conceptSchema).max(6), selectedConcept: z.string().nullable(), adDirectionId:z.string().nullable().optional(), copyOptions: z.array(copyOptionSchema.extend({ headline: z.string().max(180), body: z.string().max(400) })).max(5).optional(), selectedCopy: z.string().nullable().optional(), focusedTextLayer: z.enum(['headline','body']).nullable().optional(), copyBaseLayers: layersSchema.optional(), copyLayouts: z.record(z.string(), layersSchema).optional(), model: z.string().nullable(), composition: z.string().max(1800).optional(), preparedContext: z.string().optional(), briefEdits: z.array(z.enum(['audience','message','offer','hook','headline','body','visual'])).optional(), compositionEdited: z.boolean().optional(), layoutEdits: z.array(z.enum(['headline','body','logo'])).optional(), layers: z.object({ headline: layerSchema, body: layerSchema, logo: layerSchema }) })
export type CreativeState = z.infer<typeof creativeSchema>
export type LayerName = keyof CreativeState['layers']
// Anthropic structured output supports anyOf, but rejects oneOf from discriminatedUnion.
export const studioActionSchema = z.union([
  z.object({ op: z.literal('focus-artwork') }),
  z.object({ op: z.literal('focus-text'), layer: z.enum(['headline','body']).nullable() }),
  z.object({ op: z.literal('edit-copy'), id: z.string().min(1).max(80), patch: z.object({ headline: z.string().max(180).optional(), body: z.string().max(400).optional() }) }),
  z.object({ op:z.literal('ad-direction'),id:z.string().max(60),angle:z.string().max(600),hook:z.string().max(120),headline:z.string().max(120).optional(),subheading:z.string().max(240).optional(),visual:z.string().max(1200) }),
  z.object({ op: z.literal('copy-options'), options: z.array(copyOptionSchema).min(1).max(5) }),
  z.object({ op: z.literal('choose-copy'), id: z.string().min(1).max(80) }),
  z.object({ op: z.literal('composition'), composition: z.string().max(1800) }),
  z.object({ op: z.literal('brief'), patch: briefSchema.partial() }),
  z.object({ op: z.literal('concepts'), concepts: z.array(conceptSchema).min(1).max(6) }),
  z.object({ op: z.literal('choose-concept'), id: z.string() }),
  z.object({ op: z.literal('layout'), layer: z.enum(['headline', 'body', 'logo']), patch: layerSchema.partial() }),
  z.object({ op: z.literal('format'), format: z.enum(['square', 'story']) }),
  z.object({ op: z.literal('select-output'), id: z.string().regex(/^[a-f0-9]{64}$/) }),
  z.object({ op: z.literal('generate'), revisionPrompt: z.string().max(1200).optional() }),
  z.object({ op: z.literal('export') }),
])
export const studioBatchSchema = z.object({ snapshotId: z.string().max(64), productId: z.string().max(64), revision: z.number().int().nonnegative(), actions: z.array(studioActionSchema).min(1).max(12) })
export type StudioAction = z.infer<typeof studioActionSchema>
export function emptyCreative(): CreativeState {
  const layer = { x: 7, y: 7, width: 86, size: 72, color: '#FFFFFF', visible: true }
  return { revision: 0, brief: { audience: '', message: '', offer: '', hook: '', headline: '', body: '', visual: '' }, concepts: [], selectedConcept: null, model: null, layers: { headline: { ...layer, y: 3, height: 16, maxLines: 2, autoFit: true }, body: { ...layer, y: 91, height: 6, maxLines: 2, size: 36, autoFit: true }, logo: { ...layer, x: 77, y: 92, width: 16, size: 36 } } }
}
export function applyStudioAction(state: CreativeState, raw: StudioAction): CreativeState {
  const action = studioActionSchema.parse(raw)
  let next = state
  if (action.op === 'focus-artwork') next = { ...state, selectedCopy: null, focusedTextLayer: null }
  if (action.op === 'focus-text') next = { ...state, focusedTextLayer: action.layer }
  if (action.op === 'edit-copy') {
    if (!state.copyOptions?.some(option => option.id === action.id)) throw new Error('Choose an available copy variation.')
    const options = state.copyOptions.map(option => option.id === action.id ? { ...option, ...action.patch } : option)
    next = { ...state, copyOptions: options, ...(state.selectedCopy === action.id ? { brief: { ...state.brief, ...action.patch }, briefEdits: [...new Set([...(state.briefEdits ?? []), ...Object.keys(action.patch) as ('headline' | 'body')[]])] } : {}) }
  }
  if(action.op==='ad-direction')next={...state,adDirectionId:action.id,brief:{...state.brief,message:action.angle,hook:action.hook,headline:action.headline??action.hook,body:action.subheading??'',visual:action.visual},briefEdits:[...new Set([...(state.briefEdits??[]),'message' as const,'hook' as const,'headline' as const,'body' as const,'visual' as const])]}
  if (action.op === 'copy-options') {
    if (new Set(action.options.map(option => option.id)).size !== action.options.length) throw new Error('Copy option IDs must be unique.')
    next = { ...state, copyOptions: action.options, selectedCopy: null, model: creativeModel }
  }
  if (action.op === 'choose-copy') {
    const option = state.copyOptions?.find(option => option.id === action.id)
    if (!option) throw new Error('Choose an available copy option.')
    const projected = copyVariationState(state, option.id)
    next = { ...projected, copyBaseLayers: state.copyBaseLayers ?? state.layers, briefEdits: [...new Set([...(state.briefEdits ?? []), 'headline' as const, 'body' as const])] }

  }
  if (action.op === 'composition') next = { ...state, composition: action.composition, compositionEdited: true }
  if (action.op === 'brief') next = { ...state, ...(action.patch.message !== undefined || action.patch.visual !== undefined || action.patch.hook !== undefined ? {adDirectionId:null} : {}), brief: { ...state.brief, ...action.patch }, ...(state.selectedCopy && state.copyOptions ? { copyOptions: state.copyOptions.map(option => option.id === state.selectedCopy ? { ...option, ...(action.patch.headline !== undefined ? { headline: action.patch.headline } : {}), ...(action.patch.body !== undefined ? { body: action.patch.body } : {}) } : option) } : {}), briefEdits: [...new Set([...(state.briefEdits ?? []), ...Object.keys(action.patch) as (keyof CreativeState['brief'])[]])] }

  if (action.op === 'concepts') {
    if (new Set(action.concepts.map(c => c.id)).size !== action.concepts.length) throw new Error('Concept IDs must be unique.')
    next = { ...state, concepts: action.concepts, model: creativeModel }
  }
  if (action.op === 'choose-concept') {
    const concept = state.concepts.find(c => c.id === action.id)
    if (!concept) throw new Error('Choose an available concept.')
    next = { ...state, brief: briefSchema.parse(concept), selectedConcept: concept.id }
  }
  if (action.op === 'layout') {
    const size = action.patch.size === undefined ? undefined : Math.max(action.layer === 'headline' ? AD_MIN_HEADLINE_SIZE : action.layer === 'body' ? AD_MIN_BODY_SIZE : 12, action.patch.size)
    const layers = { ...state.layers, [action.layer]: { ...state.layers[action.layer], ...action.patch, ...(size !== undefined ? { size } : {}), ...(action.patch.size !== undefined && action.patch.autoFit === undefined ? { autoFit: false } : {}) } }
    next = { ...state, layers, ...(state.selectedCopy ? { copyLayouts: { ...state.copyLayouts, [state.selectedCopy]: layers } } : { copyBaseLayers: layers }), layoutEdits: [...new Set([...(state.layoutEdits ?? []), action.layer])] }
  }

  return creativeSchema.parse({ ...next, revision: state.revision + (action.op === 'focus-text' || action.op === 'focus-artwork' ? 0 : 1) })
}
export function creativeDirection(state: CreativeState, revisionPrompt?: string) {
  return JSON.stringify({ ...state.brief, composition: state.composition, revision: revisionPrompt, overlays: { headline: state.layers.headline, body: state.layers.body, logo: state.layers.logo } })
}

export function assertStudioContext(batch: z.infer<typeof studioBatchSchema>, current: { snapshotId: string; productId: string; revision: number }) {
  if (batch.snapshotId !== current.snapshotId || batch.productId !== current.productId || batch.revision !== current.revision) throw new Error('Your context changed while the agent was working. Ask again with the current selection.')
}
export function assertStudioEffects(actions: StudioAction[]) {
  const effects = actions.filter(action => action.op === 'generate' || action.op === 'export')
  if (effects.length > 1 || effects.length && actions.at(-1) !== effects[0]) throw new Error('Generate or export must be the final action.')
  return effects[0]
}

/** The same variation projection is used before selection and after selection. */
export function copyVariationState(state: CreativeState, id: string): CreativeState {
  const option = state.copyOptions?.find(option => option.id === id)
  if (!option) throw new Error('Choose an available copy variation.')
  const base = state.copyBaseLayers ?? state.layers
  const layers = state.copyLayouts?.[id] ?? { ...base, headline: { ...base.headline, autoFit: true }, body: { ...base.body, visible: base.body.visible && !!option.body, autoFit: true } }
  return { ...state, selectedCopy: id, brief: { ...state.brief, headline: option.headline, body: option.body }, layers }
}

/** Refresh old generated alternatives while keeping text the merchant actually edited. */
export function mergeReviewCopyOptions(saved: CreativeState, seed: CreativeState, original?: CreativeState): CreativeState {
  if (!seed.copyOptions?.length) return saved
  const customSet = saved.copyOptions?.length && (!original?.copyOptions || saved.copyOptions.length !== original.copyOptions.length || saved.copyOptions.some(option => !original.copyOptions?.some(before => before.id === option.id)))
  if (customSet) return { ...saved, imageAnalysis: seed.imageAnalysis ?? saved.imageAnalysis }
  const options = seed.copyOptions.map(next => {
    const current = saved.copyOptions?.find(option => option.id === next.id)
    const before = original?.copyOptions?.find(option => option.id === next.id)
    return current && before && (current.headline !== before.headline || current.body !== before.body || current.label !== before.label) ? current : next
  })
  const selected = options.find(option => option.id === saved.selectedCopy)
  return { ...saved, imageAnalysis: seed.imageAnalysis ?? saved.imageAnalysis, copyOptions: options, ...(selected ? { brief: { ...saved.brief, headline: selected.headline, body: selected.body } } : {}) }
}

/** Adopt generated-image geometry in review; source-reference boxes are never final placement. */
export function mergeReviewComposition(saved: CreativeState, seed: CreativeState, original?: CreativeState): CreativeState {
  const next = mergeReviewCopyOptions(saved, seed, original)
  const edited = new Set(saved.layoutEdits ?? [])
  const layers = structuredClone(seed.layers)
  const base = structuredClone(seed.copyBaseLayers ?? seed.layers)
  for (const role of ['headline', 'body', 'logo'] as const) if (edited.has(role)) {
    layers[role] = saved.layers[role]
    base[role] = saved.copyBaseLayers?.[role] ?? saved.layers[role]
  }
  const copyLayouts = Object.fromEntries(Object.entries(saved.copyLayouts ?? {}).map(([id, custom]) => [id, {
    ...base, ...Object.fromEntries((['headline', 'body', 'logo'] as const).filter(role => edited.has(role)).map(role => [role, custom[role]])),
  }]))
  return { ...next, layers: saved.selectedCopy && copyLayouts[saved.selectedCopy] ? copyLayouts[saved.selectedCopy] : layers,
    copyBaseLayers: base, copyLayouts, composition: saved.compositionEdited ? saved.composition : seed.composition,
    imageAnalysis: seed.imageAnalysis ?? saved.imageAnalysis }
}
