import { createFileRoute } from '@tanstack/react-router'
import { Studio } from '@/components/studio'
export const Route = createFileRoute('/products')({
  validateSearch: (search: Record<string, unknown>): { store?: string } => ({ store: typeof search.store === 'string' ? search.store.slice(0, 2048) : undefined }),
  component: ProductsPage,
})
function ProductsPage() {
  const { store } = Route.useSearch()
  return <Studio initialStore={store} initialStep="products" />
}
