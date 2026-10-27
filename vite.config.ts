import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { eveTanStack } from 'eve/tanstack'
import { nitro } from 'nitro/vite'
import { workflow } from 'workflow/vite'

export default defineConfig(() => {
  // Vite's loadEnv gives ambient variables precedence. This work sample must use its own key.
  if (!process.env.VERCEL) {
    let projectKey: string | undefined
    try { projectKey = parseEnv(readFileSync('.env', 'utf8')).OPENROUTER_API_KEY?.trim() } catch {}
    if (projectKey) process.env.OPENROUTER_API_KEY = projectKey
    else delete process.env.OPENROUTER_API_KEY
  }
  return {
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [workflow({ dirs: ['workflows', 'src/lib'], runtime: 'nodejs24.x', sourcemap: false }), eveTanStack(), tailwindcss(), tanstackStart(), react(), nitro()],
  }
})
