import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const getStudioPreview = createServerFn({ method: 'GET' })
  .validator(z.object({ generationId: z.string().regex(/^[a-f0-9]{64}$/).optional() }))
  .handler(async ({ data }) => {
    const { readStudioPreview } = await import('./studio-preview.server')
    return readStudioPreview(data.generationId)
  })
