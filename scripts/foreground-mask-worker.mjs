import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { AutoModel, AutoProcessor, RawImage, env } from '@huggingface/transformers'

const [input, output, cache] = process.argv.slice(2)
if (!input || !output || !cache) throw new Error('Mask worker requires input, output and cache paths.')
const modelId='onnx-community/BiRefNet_lite-ONNX'
const revision='de15b22ba131738a16dff04aab8bdf8dc32e3ac1'
const started=performance.now()
try {
  await mkdir(output,{recursive:true}); await mkdir(cache,{recursive:true})
  env.cacheDir=cache; env.allowLocalModels=false
  const model=await AutoModel.from_pretrained(modelId,{revision,dtype:'fp32',device:'cpu',cache_dir:cache,session_options:{intraOpNumThreads:2,interOpNumThreads:1}})
  const processor=await AutoProcessor.from_pretrained(modelId,{revision,cache_dir:cache})
  const loaded=performance.now()
  const image=await RawImage.read(input)
  const {pixel_values}=await processor(image)
  const {output_image}=await model({input_image:pixel_values})
  const scale=Math.min(256/image.width,256/image.height)
  const mask=await RawImage.fromTensor(output_image[0].sigmoid().mul(255).to('uint8')).resize(Math.max(1,Math.round(image.width*scale)),Math.max(1,Math.round(image.height*scale)))
  await mask.save(path.join(output,'mask.png'))
  await writeFile(path.join(output,'result.json'),JSON.stringify({width:mask.width,height:mask.height,imageWidth:image.width,imageHeight:image.height,foregroundBase64:Buffer.from(mask.data).toString('base64'),model:modelId,revision,version:1,paddingPercent:3,timings:{loadMs:Math.round(loaded-started),inferenceMs:Math.round(performance.now()-loaded),totalMs:Math.round(performance.now()-started)}}))
  await model.dispose()
  console.log('Foreground mask saved.')
} catch(error) {
  await mkdir(output,{recursive:true})
  await writeFile(path.join(output,'error.json'),JSON.stringify({name:error.name,message:String(error.message).replace(/https?:\/\/\S+/g,'[model download URL]').slice(0,2000)}))
  console.error('Foreground mask worker failed. See its saved diagnostic.')
  process.exitCode=1
}
