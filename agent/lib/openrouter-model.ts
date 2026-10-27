import { createOpenAI } from '@ai-sdk/openai'

/** The SDK does not recognize provider-prefixed IDs in its optional-settings table. */
export function solModel(fetchImpl: typeof fetch = globalThis.fetch) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  const provider = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey || 'unconfigured',
    fetch: async (url, init) => {
      if (!apiKey) throw new Error('The project OpenRouter key is not configured.')
      if (typeof init?.body === 'string') {
        const body = JSON.parse(init.body)
        if (body.model === 'openai/gpt-6.1-sol') {
          // Apply after SDK serialization, so Fast and low reasoning cannot be silently dropped.
          body.service_tier = 'priority'
          body.reasoning = { ...body.reasoning, effort: 'low' }
          return fetchImpl(url, { ...init, body: JSON.stringify(body) })
        }
      }
      return fetchImpl(url, init)
    },
  })
  return provider.responses('openai/gpt-6.1-sol')
}
