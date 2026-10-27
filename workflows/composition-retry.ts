import { analyzeGeneratedComposition } from '../src/lib/composition-analysis.server'
import { markCompositionUnavailable } from '../src/lib/image-generation.server'

/** Deliberately has no image creation/preparation step. */
export async function retryCompositionWorkflow(id:string){
  'use workflow'
  try{await analyzeGeneratedComposition(id)}catch{await markCompositionUnavailable(id)}
}
