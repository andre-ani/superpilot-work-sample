import assert from 'node:assert/strict'
import test from 'node:test'
import { userError } from './user-error.ts'

test('maps catalog failures without exposing provider or response details', () => {
  const result = userError(new Error('<html>provider token=secret</html> catalog did not contain usable product records'), 'catalog')
  assert.equal(result.title, 'No usable products found')
  assert.equal(result.retryable, true)
  assert.doesNotMatch(result.message, /html|provider|secret|product records/i)
})

test('maps timeout, rate limit, and persistence signals to safe recovery', () => {
  assert.deepEqual(userError({ name: 'AbortError', message: 'request timed out' }, 'chat'), {
    title: 'That took too long',
    message: 'The request timed out. Check your connection and try again.',
    retryable: true,
  })
  assert.equal(userError({ status: 429, message: 'rate limit from provider' }, 'catalog').retryable, true)
  assert.equal(userError({ code: 'ENOSPC', message: 'write failed' }, 'storage').title, 'Could not save your changes')
})

test('does not encourage retrying a paid generation failure', () => {
  const result = userError(new Error('image provider returned an internal schema error'), 'generation')
  assert.equal(result.title, 'Image creation did not finish')
  assert.equal(result.retryable, false)
  assert.doesNotMatch(result.message, /provider|schema|internal/i)
})
