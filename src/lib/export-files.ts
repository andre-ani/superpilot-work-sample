export function canvasPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('This image could not be exported. Try again.')), 'image/png'))
}
export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ (crc & 1 ? 0xedb88320 : 0) }
  return (crc ^ 0xffffffff) >>> 0
}
/** Stored ZIP entries: PNG is already compressed; no extra dependency or server upload. */
export async function imageArchive(files: {name: string; blob: Blob}[]): Promise<Blob> {
  const local: BlobPart[] = [], central: BlobPart[] = []
  let offset = 0, centralSize = 0
  for (const file of files) {
    const name = new TextEncoder().encode(file.name), bytes = new Uint8Array(await file.blob.arrayBuffer()), crc = crc32(bytes)
    const header = new ArrayBuffer(30), h = new DataView(header)
    h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x800,true)
    h.setUint32(14,crc,true); h.setUint32(18,bytes.length,true); h.setUint32(22,bytes.length,true); h.setUint16(26,name.length,true)
    local.push(header,name,bytes)
    const entry = new ArrayBuffer(46), e = new DataView(entry)
    e.setUint32(0,0x02014b50,true); e.setUint16(4,20,true); e.setUint16(6,20,true); e.setUint16(8,0x800,true)
    e.setUint32(16,crc,true); e.setUint32(20,bytes.length,true); e.setUint32(24,bytes.length,true); e.setUint16(28,name.length,true); e.setUint32(42,offset,true)
    central.push(entry,name); centralSize += 46+name.length; offset += 30+name.length+bytes.length
  }
  const end = new ArrayBuffer(22), e = new DataView(end)
  e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true); e.setUint32(12,centralSize,true); e.setUint32(16,offset,true)
  return new Blob([...local,...central,end],{type:'application/zip'})
}
