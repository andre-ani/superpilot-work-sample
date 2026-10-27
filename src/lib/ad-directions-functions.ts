import { createServerFn } from '@tanstack/react-start'
import { adDirectionRequestSchema, type AdDirectionRequest } from './ad-directions'
export const getAdDirections=createServerFn({method:'POST'}).validator((data:AdDirectionRequest)=>data).handler(async({data})=>{
  try{
    const input=adDirectionRequestSchema.parse(data)
    const {developAdDirections}=await import('./ad-directions.server')
    return {ok:true as const,value:await developAdDirections(input)}
  }catch(error){
    const {recordAdDirectionFailure}=await import('./ad-directions.server')
    return {ok:false as const,error:await recordAdDirectionFailure(data,error)}
  }
})
