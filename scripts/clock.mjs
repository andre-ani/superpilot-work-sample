import { readFileSync, writeFileSync } from 'node:fs'

const path = new URL('../docs/time-log.json', import.meta.url)
const log = JSON.parse(readFileSync(path, 'utf8'))
const command = process.argv[2] ?? 'status'
const now = new Date()
const active = log.intervals.find((interval) => interval.end === null)

if (!['status', 'start', 'pause'].includes(command)) {
  console.error('Usage: pnpm clock [status|start|pause]')
  process.exit(1)
}
if (command === 'start' && !active) {
  log.intervals.push({ start: now.toISOString(), end: null })
} else if (command === 'pause' && active) {
  active.end = now.toISOString()
}
if (command !== 'status') writeFileSync(path, JSON.stringify(log, null, 2) + '\n')

const elapsed = log.intervals.reduce((total, interval) =>
  total + Math.max(0, new Date(interval.end ?? now).getTime() - new Date(interval.start).getTime()), 0)
const minutes = Math.floor(elapsed / 60000)
console.log(`Clock ${log.intervals.some((interval) => interval.end === null) ? 'running' : 'paused'} · ${minutes}m recorded · ${Math.max(0, log.budgetMinutes - minutes)}m remaining of ${log.budgetMinutes}m`)
console.log(`Due ${new Date(log.deadline).toLocaleString('en-CA', { timeZone: log.timezone })} (${log.timezone})`)
if (minutes >= log.budgetMinutes) console.log('Active-work budget reached. Pause and review scope before continuing.')
