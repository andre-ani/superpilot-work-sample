import { defineAgent } from 'eve'
import { createOpenAI } from '@ai-sdk/openai'
import { creativeModel } from '../../../src/lib/creative'

const provider = createOpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY })
export default defineAgent({
  description: 'Develop advertising briefs, distinct hooks and copy, and edit studio composition layouts. One creative specialist serves both creative development and the final studio.',
  tool: false,
  model: provider.chat(creativeModel),
  modelContextWindowTokens: 1_000_000,
  defaultTools: false,
})
