import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildTranscriptPrivacyArtifacts,
  hashTranscript,
  redactTranscript,
} from './redaction.js'

test('redacts email, phone, url, and address patterns', () => {
  const transcript = `
  John: Email me at john@example.com or call 555-222-1111.
  Website is https://example.com and office is 123 Main Street.
  `.trim()

  const redacted = redactTranscript(transcript)

  assert.ok(!redacted.includes('john@example.com'))
  assert.ok(!redacted.includes('555-222-1111'))
  assert.ok(!redacted.includes('https://example.com'))
  assert.ok(!redacted.includes('123 Main Street'))
  assert.ok(redacted.includes('[EMAIL]'))
  assert.ok(redacted.includes('[PHONE]'))
  assert.ok(redacted.includes('[URL]'))
  assert.ok(redacted.includes('[ADDRESS]'))
})

test('transcript hash is stable and deterministic', () => {
  const text = 'Coach: Same text every run.'
  const hashA = hashTranscript(text)
  const hashB = hashTranscript(text)
  const hashC = hashTranscript(text + ' changed')

  assert.equal(hashA, hashB)
  assert.notEqual(hashA, hashC)
})

test('privacy artifacts include redacted transcript and hash', () => {
  const transcript = 'Jane Doe: Reach me at jane@demo.com'
  const artifacts = buildTranscriptPrivacyArtifacts(transcript)

  assert.ok(artifacts.redactedTranscript.includes('[EMAIL]'))
  assert.ok(artifacts.redactedTranscript.includes('[NAME]'))
  assert.equal(artifacts.transcriptHash.length, 64)
})
