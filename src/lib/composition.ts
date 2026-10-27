import type { CreativeState } from './creative'
import { AD_MIN_HEADLINE_SIZE, AD_MIN_BODY_SIZE, AD_BODY_LEADING, safeAdBox } from './ad-typography.ts'
import { lineSpan, type ForegroundGeometry } from './foreground-geometry.ts'
import { fitText } from './text-fit.ts'

export function loadCompositionImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('An image could not be loaded for export. Try again.'))
    image.src = url
  })
}
export function textLayerBounds(state: CreativeState, name: 'headline' | 'body') {
  const layer = state.layers[name]
  const followingTop = Object.entries(state.layers).filter(([key, other]) => key !== name && other.visible && other.y > layer.y).map(([, other]) => other.y)
  const defaultHeight = Math.min(name === 'headline' ? 28 : 12, Math.min(100, ...followingTop) - layer.y - 2)
  return safeAdBox({ x: layer.x, y: layer.y, width: Math.min(layer.width, 100 - layer.x), height: Math.min(layer.height ?? Math.max(4, defaultHeight), 100 - layer.y) }, state.imageAnalysis?.safeInset)
}
/** Fit both axes inside the safe logo rectangle; never scale against the canvas edge. */
export function logoPlacement(state: CreativeState, logoWidth: number, logoHeight: number, canvasWidth: number, canvasHeight: number) {
  const layer=state.layers.logo
  const box = safeAdBox({x:layer.x,y:layer.y,width:layer.width,height:layer.height??12},state.imageAnalysis?.safeInset)
  const width = canvasWidth * box.width / 100, height = canvasHeight * box.height / 100
  if (width <= 0 || height <= 0 || logoWidth <= 0 || logoHeight <= 0) return null
  const scale = Math.min(width / logoWidth, height / logoHeight)
  const drawWidth = logoWidth * scale, drawHeight = logoHeight * scale
  return { x: canvasWidth * box.x / 100 + (width - drawWidth) / 2, y: canvasHeight * box.y / 100 + (height - drawHeight) / 2, width: drawWidth, height: drawHeight }
}
export function drawComposition(canvas: HTMLCanvasElement, artwork: HTMLImageElement, logo: HTMLImageElement | null, state: CreativeState, format: 'square' | 'story', fonts: { heading?: string; body?: string; headingWeight?: string | number; bodyWeight?: string | number }, options: { hideText?: 'headline' | 'body'; foreground?:ForegroundGeometry } = {}) {
  canvas.width = 1080; canvas.height = format === 'story' ? 1920 : 1080
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser cannot render this composition.')
  const w = canvas.width, h = canvas.height
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h)
  // Contain keeps actual product pixels intact when a saved option has another format.
  const scale = Math.min(w / artwork.naturalWidth, h / artwork.naturalHeight)
  ctx.drawImage(artwork, (w - artwork.naturalWidth * scale) / 2, (h - artwork.naturalHeight * scale) / 2, artwork.naturalWidth * scale, artwork.naturalHeight * scale)
  const fitted: { layer: string; size: number; lines: number }[] = []
  for (const name of ['headline', 'body'] as const) {
    const layer = state.layers[name], text = state.brief[name]
    if (!layer.visible || !text) continue
    const bounds = textLayerBounds(state, name)
    const x = w * bounds.x / 100, y = h * bounds.y / 100, maxWidth = w * bounds.width / 100, maxHeight = h * bounds.height / 100
    const family = name === 'headline' ? fonts.heading ?? 'sans-serif' : fonts.body ?? 'sans-serif'
    const weight = name === 'headline' ? Math.max(600,Number(fonts.headingWeight)||700) : fonts.bodyWeight ?? 400
    const result = fitText(text, family, { width: maxWidth, height: maxHeight }, { minSize: name === 'headline' ? AD_MIN_HEADLINE_SIZE : AD_MIN_BODY_SIZE, maxSize: name === 'headline' ? 240 : 100, maxLines: layer.maxLines ?? (name === 'headline' ? 2 : 4), weight, leading: name === 'headline' ? 1.05 : AD_BODY_LEADING, fixedSize: layer.autoFit === false ? layer.size : undefined, spanAtLine:options.foreground ? (top,lineHeight)=>lineSpan(options.foreground!,{x:(w-artwork.naturalWidth*scale)/2,y:(h-artwork.naturalHeight*scale)/2,width:artwork.naturalWidth*scale,height:artwork.naturalHeight*scale},{x,y,width:maxWidth,height:maxHeight},top,lineHeight) : undefined })
    if (!result.fits) throw new Error(`${name === 'headline' ? 'Headline' : 'Supporting copy'} does not fit here. Shorten it or ask the agent to adjust its placement.`)
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, maxWidth, maxHeight); ctx.clip()
    ctx.font = `${weight} ${result.size}px ${family}`
    ctx.fillStyle = layer.color; ctx.textBaseline = 'top'
    ctx.textAlign = layer.align ?? 'left'
    const textX = x + (layer.align === 'center' ? maxWidth / 2 : layer.align === 'right' ? maxWidth : 0)
    if (options.hideText !== name) for (const [index, line] of result.lines.entries()) ctx.fillText(line.text, line.x === undefined ? textX : x+line.x+(layer.align==='center'?(line.availableWidth??maxWidth)/2:layer.align==='right'?(line.availableWidth??maxWidth):0), y + index * result.lineHeight)
    ctx.restore()
    fitted.push({ layer: name, size: result.size, lines: result.lines.length })
  }
  const layer = state.layers.logo
  if (logo && layer.visible) {
    const placement = logoPlacement(state, logo.naturalWidth, logo.naturalHeight, w, h)
    if (placement) ctx.drawImage(logo, placement.x, placement.y, placement.width, placement.height)
  }
  return fitted
}
export function downloadComposition(canvas: HTMLCanvasElement) {
  return new Promise<void>((resolve, reject) => canvas.toBlob(blob => {
    if (!blob) { reject(new Error('The composition could not be exported.')); return }
    const url = URL.createObjectURL(blob), link = document.createElement('a')
    link.href = url; link.download = 'superpilot-ad.png'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000); resolve()
  }, 'image/png'))
}
