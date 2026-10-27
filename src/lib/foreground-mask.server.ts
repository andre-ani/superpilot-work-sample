import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile } from 'node:fs/promises'
import { dataRoot, digest, jobDir, readBinary, readGeneration, readJson, writeJson } from './studio-storage.server.ts'
import { saveBrandLogo } from './brand-assets.server.ts'

export type ForegroundMask = {status:'complete';maskUrl:string;width:number;height:number;imageWidth:number;imageHeight:number;foregroundBase64:string;model:string;version:number;paddingPercent:number;timings:{loadMs:number;inferenceMs:number;totalMs:number};cached?:boolean}
const pending=new Map<string,Promise<ForegroundMask|{status:'unavailable';reason:string}>>()
const run=promisify(execFile)

/** Local worker computes an internal mask; original artwork is never rewritten. */
export async function ensureForegroundMask(generationId:string):Promise<ForegroundMask|{status:'unavailable';reason:string}> {
  const job=await readGeneration(generationId)
  const file=job?.images[0]
  if(!job||job.status!=='complete'||!file||!/^\d+\.(png|jpg)$/.test(file))return {status:'unavailable',reason:'No completed artwork to segment.'}
  const source=path.join(jobDir(job.id),file),bytes=await readBinary(source)
  if(!bytes)return {status:'unavailable',reason:'Saved image is unavailable.'}
  const hash=digest({image:bytes.toString('base64'),model:'BiRefNet-lite',revision:'de15b22ba131738a16dff04aab8bdf8dc32e3ac1',version:1})
  const recordFile=path.join(dataRoot,'foreground-masks',`${hash}.json`)
  const cached=await readJson<ForegroundMask>(recordFile)
  if(cached?.status==='complete')return {...cached,cached:true}
  if(process.env.VERCEL)return {status:'unavailable',reason:'Local foreground worker is not enabled in this deployment; visual protected areas remain available.'}
  const running=pending.get(hash);if(running)return running
  const request=(async()=>{
    const directory=path.resolve('.work','foreground-masks',hash)
    try {
      await run(process.execPath,[path.resolve('scripts/foreground-mask-worker.mjs'),source,directory,path.join(dataRoot,'model-cache')],{timeout:300000,maxBuffer:1024*1024,env:{PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,HF_HUB_DISABLE_TELEMETRY:'1',HF_TOKEN:'',HUGGING_FACE_HUB_TOKEN:''}})
      const raw=JSON.parse(await readFile(path.join(directory,'result.json'),'utf8')) as Omit<ForegroundMask,'status'|'maskUrl'>
      if(raw.width<1||raw.height<1||Buffer.from(raw.foregroundBase64,'base64').length!==raw.width*raw.height)throw new Error('Invalid raw mask.')
      const maskUrl=await saveBrandLogo((await readFile(path.join(directory,'mask.png'))).toString('base64'))
      const result:ForegroundMask={...raw,status:'complete',maskUrl}
      await writeJson(recordFile,result)
      return result
    }catch{return {status:'unavailable' as const,reason:'Foreground processing could not finish; visual protected areas remain available.'}}
  })()
  pending.set(hash,request)
  try{return await request}finally{pending.delete(hash)}
}
