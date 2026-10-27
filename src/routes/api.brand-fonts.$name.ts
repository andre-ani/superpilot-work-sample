import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/brand-fonts/$name')({
  server: { handlers: { GET: async ({ params }) => {
    if (!/^[a-f0-9]{64}\.(woff2|woff|ttf)$/.test(params.name)) return new Response('Not found', { status: 404 })
    const { readBrandFont } = await import('@/lib/brand-fonts.server')
    try {
      const asset = await readBrandFont(params.name)
      return new Response(new Uint8Array(asset.bytes), { headers: { 'Content-Type': asset.type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, max-age=31536000, immutable' } })
    } catch { return new Response('Not found', { status: 404 }) }
  } } },
})
