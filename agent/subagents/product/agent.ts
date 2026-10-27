import { defineAgent } from 'eve'
import { solModel } from '../../lib/openrouter-model'
export default defineAgent({ description: 'Find and compare catalog products using exact search or fast OpenAI Decisions classification. Preserve product/variant IDs and report coverage.', model: solModel(), reasoning: 'low', modelContextWindowTokens: 1_050_000, defaultTools: false, modelOptions: { providerOptions: { openai: { serviceTier: 'priority' } } } })
