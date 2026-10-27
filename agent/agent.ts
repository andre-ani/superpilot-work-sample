import { defineAgent } from 'eve'
import { solModel } from './lib/openrouter-model'
export default defineAgent({
  model: solModel(),
  reasoning: 'low',
  defaultTools: false,
  modelContextWindowTokens: 1_050_000,
  modelOptions: { providerOptions: { openai: { serviceTier: 'priority' } } },
})
