import { createOpenAI } from '@ai-sdk/openai'

/** Refuse schema-less requests and routing that may silently drop structured output. */
export function strictJsonProvider(apiKey: string, transport: typeof fetch = globalThis.fetch) {
  return createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1', apiKey,
    fetch: async (url, init) => {
      const body = JSON.parse(String(init?.body))
      if (body.response_format?.type !== 'json_schema' || body.response_format.json_schema?.strict !== true || !body.response_format.json_schema?.schema) throw new Error('Structured generation requires a strict JSON schema.')
      return transport(url, { ...init, body: JSON.stringify({ ...body, provider: { ...body.provider, require_parameters: true } }) })
    },
  })
}

export const creativePlanSettings = {
  maxOutputTokens: 16384,
  timeoutMs: 180000,
  providerOptions: { openai: { strictJsonSchema: true } },
} as const
