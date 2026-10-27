import type { BrandDraft, StoreSnapshot } from './studio'

/** Source context can finish before unrelated enrichment; settled failures use retained facts. */
export function ideaBrandReady(brand:Pick<BrandDraft,'name'|'description'|'brandContext'>,snapshot:Pick<StoreSnapshot,'brand'|'enrichment'>){
  if(!brand.name.trim()||!brand.description.trim())return false
  if(brand.brandContext?.trim())return true
  if(snapshot.brand.researchStatus==='complete'||snapshot.brand.researchStatus==='unavailable')return true
  if(snapshot.enrichment&&['queued','running'].includes(snapshot.enrichment.status))return false
  return !snapshot.enrichment||snapshot.enrichment.status==='complete'||snapshot.enrichment.status==='failed'
}
