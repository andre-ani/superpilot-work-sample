import { useEffect, useState, type CSSProperties } from 'react'
import { loadBrandFonts } from '@/lib/brand-fonts-functions'
import type { BrandFontAsset, BrandFonts, BrandFontResolutionMap } from '@/lib/brand-fonts'

type LoadedFonts = { heading?: CSSProperties; body?: CSSProperties; warnings: string[]; resolution?: BrandFontResolutionMap }
const requests = new Map<string, Promise<BrandFonts>>()
const loadedFaces = new Map<string, Promise<CSSProperties>>()

function loadFace(asset: BrandFontAsset): Promise<CSSProperties> {
  const key = `${asset.url}:${asset.weight}:${asset.style}`
  const existing = loadedFaces.get(key)
  if (existing) return existing
  const alias = `brand_${Array.from(key).reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0).toString(16).replace('-', 'n')}`
  let timer: ReturnType<typeof setTimeout>
  const promise = Promise.race([new FontFace(alias, `url(${JSON.stringify(asset.url)})`, { weight: asset.weight, style: asset.style }).load(), new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Font loading timed out')),5000)})]).then(face => {
    document.fonts.add(face)
    return { fontFamily: `"${alias}", var(--font-sans)`, fontWeight: /^\d+$/.test(asset.weight) ? Number(asset.weight) : undefined, fontStyle: asset.style } satisfies CSSProperties
  }).catch(error=>{loadedFaces.delete(key);throw error}).finally(()=>clearTimeout(timer))
  loadedFaces.set(key, promise)
  return promise
}

export function useBrandFonts(sourceUrl: string, headingName: string, bodyName: string): LoadedFonts {
  const key = JSON.stringify(['font-assets-v3', sourceUrl, headingName, bodyName])
  const [value, setValue] = useState<{ key: string; fonts: LoadedFonts } | null>(null)
  useEffect(() => {
    if (!sourceUrl) return
    let active = true
    const timers: ReturnType<typeof setTimeout>[]=[]
    const publish=(patch:Partial<LoadedFonts>)=>{if(active)setValue(current=>({key,fonts:{...(current?.key===key?current.fonts:{warnings:[]}),...patch}}))}
    const face=(asset:BrandFontAsset|null,role:'heading'|'body',attempt=0)=>{
      if(!asset||!active)return
      loadFace(asset).then(style=>publish({[role]:style})).catch(()=>{
        if(active&&attempt<1)timers.push(setTimeout(()=>face(asset,role,attempt+1),1000))
        else if(active)setValue(current=>({key,fonts:{...(current?.key===key?current.fonts:{warnings:[]}),[role]:{fontFamily:'var(--font-sans)'},warnings:[`Using Inter because ${asset.family} could not be loaded.`],resolution:current?.key===key&&current.fonts.resolution?{...current.fonts.resolution,[role]:{requestedFamily:asset.requestedFamily??asset.family,resolvedFamily:'Inter',assetUrl:'/fonts/inter-latin-variable.woff2',source:'fallback',substituted:true,reason:'The source font could not be loaded in this browser.'}}:undefined}}))
      })
    }
    const load=(attempt=0)=>{
      if(!active)return
      let promise=requests.get(key)
      if(!promise){promise=loadBrandFonts({data:{sourceUrl,headingName,bodyName}});requests.set(key,promise)}
      promise.then(assets=>{
        if(!active)return
        publish({warnings:assets.warnings,resolution:assets.resolution})
        face(assets.heading,'heading');face(assets.body,'body')
        if(assets.warnings.length)setTimeout(()=>requests.delete(key),60000)
      }).catch(()=>{
        requests.delete(key)
        if(active&&attempt<2)timers.push(setTimeout(()=>load(attempt+1),(attempt+1)*1000))
        else publish({warnings:['Original fonts are unavailable.']})
      })
    }
    load()
    return () => { active = false;timers.forEach(clearTimeout) }
  }, [sourceUrl, headingName, bodyName, key])
  return value?.key === key ? value.fonts : { warnings: [] }
}
