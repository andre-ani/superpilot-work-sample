import { prepareWithSegments, layoutWithLines, layoutNextLine } from '@chenglou/pretext'

export type TextLine = { text: string; width: number; x?: number; availableWidth?:number }
export type FittedText = { size: number; lineHeight: number; lines: TextLine[]; height: number; fits: boolean }
export type TextBox = { width: number; height: number }
type Measure = (text: string, font: string, width: number, lineHeight: number) => { lines: TextLine[]; height: number }
const preparedCache = new Map<string, ReturnType<typeof prepareWithSegments>>()
function preparedText(text:string,font:string) {
  const key = JSON.stringify([text, font])
  let prepared = preparedCache.get(key)
  if (!prepared) {
    prepared = prepareWithSegments(text, font, { whiteSpace: 'pre-wrap' })
    if (preparedCache.size >= 160) preparedCache.delete(preparedCache.keys().next().value!)
    preparedCache.set(key, prepared)
  }
  return prepared
}
const measureText:Measure=(text,font,width,lineHeight)=>layoutWithLines(preparedText(text,font),width,lineHeight)

/** Maximize type within a bounded box; wrapping participates in sizing. */
export function fitText(text: string, family: string, box: TextBox, options: {
  minSize: number; maxSize: number; maxLines: number; weight?: string | number; leading?: number; fixedSize?: number; spanAtLine?: (top:number,height:number)=>{x:number;width:number}|null
}, measure: Measure = measureText): FittedText {
  const leading = options.leading ?? 1.05
  function at(size: number): FittedText {
    const lineHeight = size * leading
    const font=`${options.weight ?? 700} ${size}px ${family}`
    let result=measure(text,font,box.width,lineHeight),complete=true
    if(options.spanAtLine){
      const prepared=preparedText(text,font),lines:TextLine[]=[]
      let cursor={segmentIndex:0,graphemeIndex:0}
      for(let row=0;row<options.maxLines;row++){
        const span=options.spanAtLine(row*lineHeight,lineHeight)
        if(!span||span.width<=0){complete=false;break}
        const line=layoutNextLine(prepared,span.width,cursor)
        if(!line)break
        lines.push({text:line.text,width:line.width,x:span.x,availableWidth:span.width});cursor=line.end
        if(!layoutNextLine(prepared,box.width,cursor))break
        if(row===options.maxLines-1)complete=false
      }
      result={lines,height:lines.length*lineHeight}
    }
    return { ...result, size, lineHeight, fits:complete && result.lines.length <= options.maxLines && result.height <= box.height + 0.01 && result.lines.every(line => line.width <= (line.availableWidth ?? box.width) + 0.01) }
  }
  if (!text.trim()) return { size: 0, lineHeight: 0, lines: [], height: 0, fits: true }
  if (options.fixedSize !== undefined) return at(Math.max(options.minSize, options.fixedSize))
  let low = Math.ceil(options.minSize), high = Math.floor(options.maxSize)
  let best = at(low)
  if (!best.fits) return best
  while (low <= high) {
    const size = Math.floor((low + high) / 2), candidate = at(size)
    if (candidate.fits) { best = candidate; low = size + 1 } else high = size - 1
  }
  return best
}
