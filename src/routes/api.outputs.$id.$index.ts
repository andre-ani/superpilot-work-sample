import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/outputs/$id/$index')({
  server: { handlers: { GET: async ({ params, request }) => {
    if (!/^[a-f0-9]{64}$/.test(params.id) || !/^\d{1,2}$/.test(params.index)) return new Response('Not found', { status: 404 })
    const { outputImage } = await import('@/lib/studio.server')
    const image = await outputImage(params.id, Number(params.index))
    if (!image) return new Response('Image not found', { status: 404 })
    return new Response(new Uint8Array(image.bytes), { headers: {
      'Content-Type': image.type,
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ...(new URL(request.url).searchParams.has('download') ? { 'Content-Disposition': `attachment; filename="superpilot-${params.id.slice(0,8)}-${image.filename}"` } : {}),
    } })
  } } },
})
