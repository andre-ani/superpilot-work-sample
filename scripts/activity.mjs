import { appendFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  type: { type: 'string', default: 'progress' }, stream: { type: 'string', default: 'project' },
  session: { type: 'string' }, source: { type: 'string' }, at: { type: 'string' },
  timing: { type: 'string', default: 'observed' },
} })
const summary = positionals.join(' ').trim()
if (!summary || summary.length > 1500) throw new Error('Provide a concise activity summary (1–1500 characters). Never include secrets.')
if (!['started', 'progress', 'completed', 'blocked', 'decision', 'paused', 'resumed', 'checkpoint'].includes(values.type)) throw new Error('Invalid activity type.')
if (!['observed', 'reported', 'approximate'].includes(values.timing)) throw new Error('Invalid timing basis.')
const now = new Date().toISOString(), at = values.at ?? now
if (!Number.isFinite(Date.parse(at))) throw new Error('Invalid event time.')
const entry = { id: crypto.randomUUID(), at, recordedAt: now, type: values.type, workstream: values.stream, session: values.session, summary, source: values.source, timing: values.timing }
appendFileSync(new URL('../docs/activity-log.jsonl', import.meta.url), JSON.stringify(entry) + '\n')
console.log(`${entry.type}: ${entry.summary}`)
