import{test}from'node:test'
import assert from'node:assert/strict'
import{mkdtemp,mkdir,writeFile,readFile,rm}from'node:fs/promises'
import os from'node:os'
import path from'node:path'

test('workflow failure marking preserves the specific preparation explanation',async()=>{
  const cwd=process.cwd(),directory=await mkdtemp(path.join(os.tmpdir(),'superpilot-failure-'))
  try{
    process.chdir(directory)
    const id='a'.repeat(64),folder=path.join(directory,'.studio-data','generations',id)
    await mkdir(folder,{recursive:true})
    const error='Ad planning failed before image creation. Your context is saved.'
    await writeFile(path.join(folder,'job.json'),JSON.stringify({id,status:'failed',error,input:{},images:[]}))
    const {markImageFailure}=await import('./image-generation.server.ts')
    await markImageFailure(id)
    assert.equal(JSON.parse(await readFile(path.join(folder,'job.json'),'utf8')).error,error)
  }finally{process.chdir(cwd);await rm(directory,{recursive:true,force:true})}
})
