import { readBrandSource } from './brand.server.ts'
import { parseBrandHtml } from './brand-parse.server.ts'
import { fontFaces } from './brand-fonts.server.ts'
import { publicResource } from './catalog.server.ts'
import type { BrandSummary } from './brand.ts'

/** Verify identity against first-party declarations instead of interpreting campaign imagery as brand tokens. */
export async function refineBrandIdentity(brand:BrandSummary):Promise<BrandSummary>{
  const source=await readBrandSource(brand.sourceUrl)
  const declared=parseBrandHtml(source.html,source.sourceUrl,[],false)
  const result:BrandSummary={...brand,fonts:{...brand.fonts},provenance:[...brand.provenance]}
  if(declared.logoUrl){
    result.logoUrl=declared.logoUrl
    result.logoCandidates=[...new Set([...declared.logoCandidates,...brand.logoCandidates])]
    result.warnings=result.warnings.filter(w=>!w.includes('small site icon')&&!w.includes('usable logo URL'))
    result.provenance.push('Logo: original first-party Organization/header declaration, independent of filename.')
    try{
      const logo=await publicResource(declared.logoUrl,Date.now()+5000)
      if(/svg/i.test(logo.contentType)&&logo.bytes.length<250000){
        const colors=[...new Set([...logo.body.matchAll(/(?:fill|stroke)=["'](#[a-f\d]{6})["']/gi)].map(m=>m[1].toUpperCase()))].filter(hex=>{
          const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return Math.max(...rgb)-Math.min(...rgb)>25
        })
        if(colors.length>=2){result.colors=colors.slice(0,6);result.provenance.push('Palette: chromatic fill/stroke values in the original brand mark, not campaign backgrounds.')}
      }
    }catch{/* Existing source logo remains usable even if palette inspection fails. */}
  }
  const faces=source.stylesheets.flatMap(s=>fontFaces(s.css,s.url,source.sourceUrl))
  const css=source.stylesheets.map(s=>s.css.replace(/@font-face\s*\{[^{}]*\}/gi,'')).join('\n')
  const secondary=faces.find(face=>face.family!==result.fonts.heading&&face.family!==result.fonts.body&&!/fallback/i.test(face.family)&&css.toLowerCase().includes(face.family.toLowerCase()))
  if(secondary){result.fonts.secondary=secondary.family;result.provenance.push(`Secondary typeface: ${secondary.family}, declared and referenced in first-party CSS. Body role remains ${result.fonts.body??'unknown'}.`)}
  return result
}
