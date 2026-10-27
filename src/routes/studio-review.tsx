import { createFileRoute, notFound } from '@tanstack/react-router'
import { Studio } from '@/components/studio'
import { getStudioPreview } from '@/lib/studio-preview-functions'

export const Route = createFileRoute('/studio-review')({
  validateSearch: (search: Record<string, unknown>): { generation?: string } => ({ generation: typeof search.generation === 'string' ? search.generation : undefined }),
  beforeLoad: () => { if (!import.meta.env.DEV) throw notFound() },
  loaderDeps: ({ search }) => ({ generationId: search.generation }),
  loader: ({ deps }) => getStudioPreview({ data: deps }),
  component: SavedStudioReview,
})
function SavedStudioReview() {
  const preview = Route.useLoaderData()
  return <Studio key={preview.generation.id} initialPreview={preview} />
}
