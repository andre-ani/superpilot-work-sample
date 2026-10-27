import { defineAgent } from 'eve'
import { solModel } from '../../lib/openrouter-model'
export default defineAgent({ description: 'Review brand context, evidence quality, palette/logo choices, and creative guidelines. Keep deterministic extraction separate from interpretation.', model: solModel(), reasoning: 'low', modelContextWindowTokens: 1_050_000, defaultTools: false, modelOptions: { providerOptions: { openai: { serviceTier: 'priority' } } } })
