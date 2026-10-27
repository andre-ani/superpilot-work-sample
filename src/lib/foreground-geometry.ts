export type ForegroundGeometry = { width:number; height:number; hard:Uint8Array; soft:Float32Array }
export type PixelRect = { x:number; y:number; width:number; height:number }

/** Internal-only mask: close pinholes, preserve subjects, then add clearance. */
export function foregroundGeometry(raw:Uint8Array,width:number,height:number,protectedAreas:PixelRect[]=[],paddingPercent=3):ForegroundGeometry {
  if(raw.length!==width*height)throw new Error('Foreground mask dimensions do not match.')
  const mask=Uint8Array.from(raw,value=>value>=128?1:0), outside=new Uint8Array(mask.length), queue=new Int32Array(mask.length)
  let start=0,end=0
  const add=(i:number)=>{if(i>=0&&i<mask.length&&!mask[i]&&!outside[i]){outside[i]=1;queue[end++]=i}}
  for(let x=0;x<width;x++){add(x);add((height-1)*width+x)}
  for(let y=0;y<height;y++){add(y*width);add(y*width+width-1)}
  while(start<end){const i=queue[start++],x=i%width,y=Math.floor(i/width);if(x)add(i-1);if(x+1<width)add(i+1);if(y)add(i-width);if(y+1<height)add(i+width)}
  for(let i=0;i<mask.length;i++)if(!outside[i])mask[i]=1
  for(const box of protectedAreas){const x0=Math.max(0,Math.floor(box.x*width/100)),x1=Math.min(width,Math.ceil((box.x+box.width)*width/100)),y0=Math.max(0,Math.floor(box.y*height/100)),y1=Math.min(height,Math.ceil((box.y+box.height)*height/100));for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)mask[y*width+x]=1}
  const distance=Float32Array.from(mask,value=>value?0:1e6), diagonal=Math.SQRT2
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;distance[i]=Math.min(distance[i],x?distance[i-1]+1:1e6,y?distance[i-width]+1:1e6,x&&y?distance[i-width-1]+diagonal:1e6,x+1<width&&y?distance[i-width+1]+diagonal:1e6)}
  for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){const i=y*width+x;distance[i]=Math.min(distance[i],x+1<width?distance[i+1]+1:1e6,y+1<height?distance[i+width]+1:1e6,x+1<width&&y+1<height?distance[i+width+1]+diagonal:1e6,x&&y+1<height?distance[i+width-1]+diagonal:1e6)}
  const padding=Math.max(1,Math.min(width,height)*paddingPercent/100),hard=new Uint8Array(mask.length),soft=new Float32Array(mask.length)
  for(let i=0;i<mask.length;i++){hard[i]=distance[i]<=padding?1:0;soft[i]=Math.max(0,Math.min(1,(padding*2-distance[i])/padding))}
  return {width,height,hard,soft}
}

/** Return the clearest contiguous span for an entire line's height. */
export function lineSpan(geometry:ForegroundGeometry,image:PixelRect,box:PixelRect,top:number,lineHeight:number):{x:number;width:number}|null {
  const y0=Math.max(0,Math.floor((box.y+top-image.y)/image.height*geometry.height)),y1=Math.min(geometry.height,Math.ceil((box.y+top+lineHeight-image.y)/image.height*geometry.height))
  const step=image.width/geometry.width
  let best:{x:number;width:number}|null=null,bestScore=-1,runStart:number|null=null,runPenalty=0,runCount=0
  const finish=(right:number)=>{if(runStart===null)return;const width=right-runStart,score=width*(1-0.25*(runCount?runPenalty/runCount:0));if(score>bestScore){bestScore=score;best={x:runStart-box.x,width}};runStart=null;runPenalty=0;runCount=0}
  for(let left=box.x;left<box.x+box.width;left+=step){const right=Math.min(box.x+box.width,left+step),column=Math.floor((left+step/2-image.x)/image.width*geometry.width);let blocked=false,penalty=0
    if(column>=0&&column<geometry.width)for(let row=y0;row<y1;row++){const i=row*geometry.width+column;if(geometry.hard[i]){blocked=true;break}penalty=Math.max(penalty,geometry.soft[i])}
    if(blocked)finish(left);else{if(runStart===null)runStart=left;runPenalty+=penalty;runCount++}
    if(right===box.x+box.width)finish(right)
  }
  return best
}
