export type UserErrorContext = 'catalog' | 'storage' | 'generation' | 'chat' | 'workspace'

export type UserError = {
  title: string
  message: string
  retryable: boolean
}

type ErrorRecord = Record<string, unknown>

const isRecord = (value: unknown): value is ErrorRecord => typeof value === 'object' && value !== null

function collectSignals(value: unknown, parts: string[], seen: Set<object>, depth = 0) {
  if (depth > 2 || value === null || value === undefined) return
  if (typeof value === 'string' || typeof value === 'number') {
    parts.push(String(value))
    return
  }

  if (!isRecord(value) && !(value instanceof Error)) return
  if (seen.has(value)) return
  seen.add(value)

  const record = value as ErrorRecord
  for (const key of ['name', 'message', 'code', 'status', 'statusCode', 'reason']) {
    const item = record[key]
    if (typeof item === 'string' || typeof item === 'number') parts.push(String(item))
  }
  for (const key of ['cause', 'error', 'response']) collectSignals(record[key], parts, seen, depth + 1)
}

function signalFor(error: unknown) {
  const parts: string[] = []
  collectSignals(error, parts, new Set())
  return parts.join(' ').toLowerCase()
}

function statusFor(error: unknown): number | undefined {
  const values: unknown[] = []
  const seen = new Set<object>()
  const visit = (value: unknown, depth = 0) => {
    if (depth > 2 || !isRecord(value) || seen.has(value)) return
    seen.add(value)
    for (const key of ['status', 'statusCode']) {
      const candidate = value[key]
      const status = typeof candidate === 'number' ? candidate : typeof candidate === 'string' && /^\d{3}$/.test(candidate) ? Number(candidate) : undefined
      if (status !== undefined) values.push(status)
    }
    visit(value.cause, depth + 1)
    visit(value.error, depth + 1)
    visit(value.response, depth + 1)
  }
  visit(error)
  return values.find(value => typeof value === 'number') as number | undefined
}

const networkPattern = /\b(?:abort(?:ed|error)?|econnreset|econnrefused|enotfound|enetunreach|ehostunreach|fetch failed|failed to fetch|network(?: error)?|connection (?:reset|refused|lost|interrupted)|socket hang up|service unavailable|temporarily unavailable)\b/
const timeoutPattern = /\b(?:timeout|timed out|deadline exceeded|request took too long)\b/
const rateLimitPattern = /\b(?:429|rate[ -]?limit(?:ed)?|too many requests|requests? (?:are|is) (?:being )?limited|quota exceeded|throttl)/
const persistencePattern = /\b(?:eacces|eperm|enospc|quota(?:exceeded)?|storage|persist|save(?:d|ing)?|write|read|database|blob|filesystem|localstorage|indexeddb|saved scan)\b/
const emptyCatalogPattern = /\b(?:no products?|empty catalog|did not contain|(?:catalog|product data).{0,24}usable|usable.{0,24}(?:catalog|product)|product records?)\b/
const inaccessibleCatalogPattern = /\b(?:catalog|storefront|shopify|public storefront|password|login|admin|redirect|custom port|local address|ip address|domain|store address)\b/

function transientError(context: UserErrorContext | undefined, timedOut: boolean): UserError {
  if (timedOut) {
    return {
      title: 'That took too long',
      message: context === 'generation'
        ? 'The image request timed out. Review your inputs and start a new version when ready.'
        : 'The request timed out. Check your connection and try again.',
      retryable: true,
    }
  }
  return {
    title: 'Connection issue',
    message: context === 'generation'
      ? 'The image request was interrupted. Review your inputs and start a new version when ready.'
      : 'We could not reach the service. Check your connection and try again.',
    retryable: true,
  }
}

function rateLimited(context: UserErrorContext | undefined): UserError {
  return {
    title: 'A short pause may help',
    message: context === 'generation'
      ? 'Image requests are temporarily limited. Wait a moment, then start a new version when ready.'
      : 'Requests are temporarily limited. Wait a moment, then try again.',
    retryable: true,
  }
}

/** Convert unknown errors into concise, safe product copy. Raw error details are never returned. */
export function isUnavailableConversation(error: unknown): boolean {
  return /session_stranded|session_retired|session_ended|this session is no longer available|deployment (?:was )?retired/.test(signalFor(error))
}

export function userError(error: unknown, context?: UserErrorContext): UserError {
  const signal = signalFor(error)
  if (context === 'chat' && isUnavailableConversation(error)) return { title: 'This conversation has ended', message: 'Its history is saved. Start a new conversation to continue with this brand.', retryable: false }
  const status = statusFor(error)
  const timedOut = timeoutPattern.test(signal) || status === 408 || status === 504
  const network = networkPattern.test(signal) || (status !== undefined && status >= 500 && status <= 599)

  if (rateLimitPattern.test(signal) || status === 429) return rateLimited(context)
  if (timedOut || network) return transientError(context, timedOut)

  if (context === 'catalog') {
    if (emptyCatalogPattern.test(signal)) {
      return {
        title: 'No usable products found',
        message: 'We reached the store, but couldn’t find usable products. Check the address or try again.',
        retryable: true,
      }
    }
    if (/\b(?:enter|valid|use|without)\b/.test(signal) || /\b(?:admin|login|custom port|local address|ip address)\b/.test(signal)) {
      return {
        title: 'Check the store address',
        message: 'Use a public storefront address, such as yourbrand.com, without a login or admin URL.',
        retryable: false,
      }
    }
    if (inaccessibleCatalogPattern.test(signal) || status === 401 || status === 403 || status === 404) {
      return {
        title: 'Catalog unavailable',
        message: 'We reached the site, but couldn’t read its products. Check the address or try again.',
        retryable: true,
      }
    }
    return {
      title: 'Could not load products',
      message: 'The public catalog could not be loaded. Check the store address and try again.',
      retryable: true,
    }
  }

  if (context === 'storage') {
    if (/\b(?:not found|missing|does not exist)\b/.test(signal)) {
      return {
        title: 'Saved workspace unavailable',
        message: 'That saved workspace could not be found. Reopen the store to start a fresh workspace.',
        retryable: false,
      }
    }
    if (persistencePattern.test(signal) || !signal) {
      return {
        title: 'Could not save your changes',
        message: 'Keep this tab open and try saving again. Copy important edits before closing the tab.',
        retryable: true,
      }
    }
    return {
      title: 'Could not update saved work',
      message: 'Keep this tab open and try saving again. Your latest changes may not be saved yet.',
      retryable: true,
    }
  }

  if (context === 'generation') {
    if (/\b(?:key|configured|configuration|disabled|unavailable)\b/.test(signal)) {
      return {
        title: 'Image creation unavailable',
        message: 'Image creation is not available in this workspace yet. You can keep editing and try later.',
        retryable: false,
      }
    }
    return {
      title: 'Image creation did not finish',
      message: 'The image could not be created. Review your inputs and start a new version when ready.',
      retryable: false,
    }
  }

  if (context === 'chat') {
    return {
      title: 'Connection interrupted',
      message: 'Your conversation is saved. Reconnect to continue where you left off.',
      retryable: true,
    }
  }

  if (context === 'workspace') {
    return {
      title: 'Workspace could not update',
      message: 'We could not complete that workspace action. Try again; the latest action may not be reflected yet.',
      retryable: true,
    }
  }

  return {
    title: 'Something went wrong',
    message: 'We could not complete that action. Try again or dismiss this message and continue.',
    retryable: false,
  }
}
