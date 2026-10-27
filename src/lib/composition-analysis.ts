import { AD_SAFE_INSET, AD_SUBJECT_PADDING, safeAdBox } from './ad-typography.ts'
import { z } from 'zod'
import type { CreativeState } from './creative.ts'

export const imageBoxSchema = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), width: z.number().min(2).max(100), height: z.number().min(2).max(100) })
export const compositionAnalysisSchema = z.object({
  summary: z.string().max(1200),
  opportunities: z.array(imageBoxSchema.extend({ role: z.enum(['headline','body','logo']), reason: z.string().max(400), color: z.string().regex(/^#[a-f\d]{6}$/i), confidence: z.number().min(0).max(1) })).max(6),
  protectedAreas: z.array(imageBoxSchema.extend({ label: z.string().max(160) })).max(16),
})
export type CompositionAnalysis = z.infer<typeof compositionAnalysisSchema>
function inside(box: z.infer<typeof imageBoxSchema>) { return box.x + box.width <= 100 && box.y + box.height <= 100 }
export function overlapFraction(a: z.infer<typeof imageBoxSchema>, b: z.infer<typeof imageBoxSchema>) {
  return Math.max(0, Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0, Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y))/(a.width*a.height)
}
/** Trim an observed quiet region; never manufacture space outside its pixel-evidenced bounds. */
export function safeQuietRegion(box:z.infer<typeof imageBoxSchema>,protectedAreas:z.infer<typeof imageBoxSchema>[]){
  let fragments=[safeAdBox(box,AD_SAFE_INSET)]
  for(const area of protectedAreas){
    fragments=fragments.flatMap(rect=>{
      const left=Math.max(rect.x,area.x),right=Math.min(rect.x+rect.width,area.x+area.width),top=Math.max(rect.y,area.y),bottom=Math.min(rect.y+rect.height,area.y+area.height)
      if(left>=right||top>=bottom)return[rect]
      return [{x:rect.x,y:rect.y,width:rect.width,height:top-rect.y},{x:rect.x,y:bottom,width:rect.width,height:rect.y+rect.height-bottom},{x:rect.x,y:top,width:left-rect.x,height:bottom-top},{x:right,y:top,width:rect.x+rect.width-right,height:bottom-top}]
    }).filter(rect=>rect.width>=5&&rect.height>=4).sort((a,b)=>b.width*b.height-a.width*a.height).slice(0,16)
  }
  return fragments.find(rect=>rect.width>=20&&rect.height>=10)??fragments[0]
}
/** Logo placement is confined to verified quiet regions, never a default canvas corner. */
function reserveQuietLogo(layers:CreativeState['layers'],opportunities:(z.infer<typeof imageBoxSchema>&{confidence:number})[],protectedAreas:z.infer<typeof imageBoxSchema>[]){
  const occupied=(['headline','body'] as const).filter(role=>layers[role].visible).map(role=>layers[role] as Required<CreativeState['layers'][typeof role]>)
  for(const region of [...opportunities].sort((a,b)=>b.confidence-a.confidence))for(const side of [8,6]){
    if(region.width<side||region.height<side)continue
    for(const x of [region.x+region.width-side,region.x])for(const y of [region.y,region.y+region.height-side]){
      const box={x,y,width:side,height:side}
      if([...protectedAreas,...occupied].some(area=>overlapFraction(box,area)>0))continue
      layers.logo={...layers.logo,...box,visible:true}
      return true
    }
  }
  // Share an existing quiet text region only by reserving disjoint rectangles.
  for(const role of ['body','headline'] as const){
    const text=layers[role]
    if(!text.visible||!text.height)continue
    const side=Math.min(8,text.height),gap=2,minTextWidth=role==='body'?24:40
    if(side<6||text.width-side-gap<minTextWidth)continue
    const box={x:text.x+text.width-side,y:text.y+(text.height-side)/2,width:side,height:side}
    if(protectedAreas.some(area=>overlapFraction(box,area)>0)||occupied.some(area=>area!==text&&overlapFraction(box,area)>0))continue
    layers[role]={...text,width:text.width-side-gap}
    layers.logo={...layers.logo,...box,visible:true}
    return true
  }
  return false
}
export function applyCompositionAnalysis(state: CreativeState, analysis: CompositionAnalysis): CreativeState {
  const protectedAreas=analysis.protectedAreas.map(area=>({x:Math.max(0,area.x-AD_SUBJECT_PADDING),y:Math.max(0,area.y-AD_SUBJECT_PADDING),width:Math.min(100,area.x+area.width+AD_SUBJECT_PADDING)-Math.max(0,area.x-AD_SUBJECT_PADDING),height:Math.min(100,area.y+area.height+AD_SUBJECT_PADDING)-Math.max(0,area.y-AD_SUBJECT_PADDING)}))
  const opportunities = analysis.opportunities.flatMap(box=>{const safe=safeQuietRegion(box,protectedAreas);return safe?[{...box,...safe}]:[]}).filter(box => inside(box) && box.x <= 95 && box.y <= 95 && box.width >= 5 && box.height >= 4 && box.confidence >= 0.5 && !protectedAreas.some(area => overlapFraction(box, area) > 0))
  if (!opportunities.some(box => box.role === 'headline')) throw new Error('No confident text area was found outside the subject. Artwork is saved; ask the agent for a composition with more quiet space.')
  const layers = structuredClone(state.layers)
  const chosen: z.infer<typeof imageBoxSchema>[] = []
  for (const name of ['headline','body','logo'] as const) {
    const box = opportunities.find(box => box.role === name && !chosen.some(previous => overlapFraction(box,previous) > 0.02 || overlapFraction(previous,box) > 0.02))
    if (!box) { layers[name].visible = false; continue }
    chosen.push(box)
    const side=Math.min(8,box.width,box.height)
    const placement=name==='logo'?{x:box.x+(box.width-side)/2,y:box.y+(box.height-side)/2,width:side,height:side}:box
    layers[name] = { ...layers[name], x: placement.x, y: placement.y, width: placement.width, height: placement.height, color: box.color, visible: true, autoFit: true, maxLines: name === 'body' ? 4 : 2 }
  }
  const reservedLogo=!layers.logo.visible&&reserveQuietLogo(layers,opportunities,protectedAreas)
  const note=reservedLogo?'Layout update: the logo is reserved within verified quiet space, separate from text.':!layers.logo.visible?'No safe logo region remained; automatic logo placement is unavailable.':''
  const summary=note?`${analysis.summary.slice(0,1199-note.length)} ${note}`:analysis.summary
  const composition = `${summary}\n${(['headline','body','logo'] as const).filter(name => layers[name].visible).map(name => { const box=layers[name]; return `${name}: x${box.x} y${box.y} width${box.width} height${box.height} colour${box.color}` }).join('\n')}`
  return { ...state, composition, layers, copyBaseLayers: layers, copyLayouts: {}, imageAnalysis: { ...analysis, summary, kind: 'generated',safeInset:AD_SAFE_INSET,subjectPadding:AD_SUBJECT_PADDING } }
}
