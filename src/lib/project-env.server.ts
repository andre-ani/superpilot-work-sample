import { readFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { resolve } from 'node:path'

/** Local secrets come only from this project; deployed secrets come from its Vercel environment. */
export async function projectEnv(): Promise<Record<string, string | undefined>> {
  if (process.env.VERCEL) return { OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY, FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY }
  try { return parseEnv(await readFile(resolve('.env'), 'utf8')) } catch { return {} }
}
