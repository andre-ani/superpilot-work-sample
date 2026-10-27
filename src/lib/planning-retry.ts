/** One recovery attempt for transient or incomplete structured output, never for invalid credentials/config. */
export function recoverablePlanningFailure(error: unknown): boolean {
  const e=error&&typeof error==='object'?error as {name?:string;message?:string;statusCode?:number;isRetryable?:boolean;finishReason?:string}:{}
  const signal=`${e.name??''} ${e.message??''}`
  if(e.statusCode&&[400,401,403,404].includes(e.statusCode)||/compiled grammar|strict JSON schema|unsupported.*schema|Project OpenRouter key/i.test(signal))return false
  return e.finishReason==='length'||e.isRetryable===true||e.statusCode===429||!!e.statusCode&&e.statusCode>=500||/NoObjectGenerated|ZodError|AbortError|TimeoutError|timed? ?out|fetch failed|four usable copy options/i.test(signal)
}
export async function retryPlanning<T>(work:(attempt:number)=>Promise<T>,onFailure?:(error:unknown,attempt:number)=>Promise<void>):Promise<T>{
  for(let attempt=1;attempt<=2;attempt++){
    try{return await work(attempt)}
    catch(error){await onFailure?.(error,attempt);if(attempt===2||!recoverablePlanningFailure(error))throw error}
  }
  throw new Error('Ad planning could not finish.')
}
