import { recoverablePlanningFailure } from './planning-retry.ts'

export const PLACEMENT_MAX_ATTEMPTS=2
export function recoverablePlacementFailure(error:unknown){
  const message=error instanceof Error?error.message:''
  return recoverablePlanningFailure(error)||/No confident text|Copy option IDs|copy options.*unique/i.test(message)
}
export function placementFailureMessage(error:unknown){
  const record=error&&typeof error==='object'?error as {name?:string;message?:string;finishReason?:string;statusCode?:number}:{}
  const signal=`${record.name??''} ${record.message??''}`
  if(record.statusCode===401||record.statusCode===403||/key unavailable/i.test(signal))return 'Your artwork is saved. Placement could not authenticate with the model provider.'
  if(record.statusCode===402)return 'Your artwork is saved. Model credits are unavailable for text placement.'
  if(/No confident text/i.test(signal))return 'Your artwork is saved. The checked regions did not leave enough safe space for the copy. Retry placement to inspect it again.'
  if(record.finishReason==='length'||/NoObjectGenerated|ZodError|Copy option IDs/i.test(signal))return 'Your artwork is saved. The model could not return a complete, valid placement after two attempts. Retry placement to continue.'
  if(/Saved artwork|No saved artwork/i.test(signal))return 'The saved artwork could not be read. Retry placement once it is available.'
  if(/timeout|timed out|AbortError/i.test(signal))return 'Your artwork is saved. Placement timed out after its bounded attempts. Retry placement to continue.'
  return 'Your artwork is saved. Text placement could not finish. Retry placement to continue.'
}

/** A recent pending workflow is reused instead of starting a second paid analysis. */
export function placementPendingFresh(job:{compositionStatus?:string;updatedAt:string;placement?:{updatedAt:string}},now=Date.now()){
  return job.compositionStatus==='pending'&&now-Date.parse(job.placement?.updatedAt??job.updatedAt)<7*60*1000
}
