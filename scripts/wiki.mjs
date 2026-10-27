import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

let config
try {
  config = parseEnv(readFileSync(new URL('../.env.local', import.meta.url), 'utf8'))
} catch {
  console.error('Create .env.local from .env.example before running OpenWiki.')
  process.exit(1)
}
if (!config.OPENROUTER_API_KEY?.trim() || !config.OPENWIKI_MODEL_ID?.trim()) {
  console.error('Set OPENROUTER_API_KEY and OPENWIKI_MODEL_ID in .env.local before running OpenWiki. No inference was requested.')
  process.exit(1)
}

const result = spawnSync('openwiki', ['--update', '--print', '--modelId', config.OPENWIKI_MODEL_ID], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  env: { ...process.env, ...config, OPENWIKI_PROVIDER: 'openrouter' },
  stdio: 'inherit',
})
if (result.error) console.error('OpenWiki could not start. Install its CLI before using this optional command.')
process.exit(result.status ?? 1)
