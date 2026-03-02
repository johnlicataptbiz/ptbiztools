import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MIN_TRANSCRIPT_WORDS,
  evaluateTranscriptQuality,
  mapTranscriptQuality,
  punctuationDensity,
} from './transcriptQuality.js'

test('rejects transcripts below minimum word threshold', () => {
  const shortTranscript = 'Hi there this is too short for grading quality checks only.'
  const result = evaluateTranscriptQuality(shortTranscript)

  assert.equal(result.accepted, false)
  assert.ok(result.reasons.some((reason) => reason.includes(`minimum ${MIN_TRANSCRIPT_WORDS}`)))
})

test('accepts transcripts with enough words and dialogue structure', () => {
  const transcript = Array.from({ length: 30 }, (_, index) => `Coach: Question ${index}? Prospect: Answer ${index}.`).join('\n')
  const result = evaluateTranscriptQuality(transcript)

  assert.equal(result.accepted, true)
  assert.equal(result.wordCount >= MIN_TRANSCRIPT_WORDS, true)
  assert.equal(result.hasDialogueTurns, true)
})

test('flags transcripts with no dialogue turns and very low punctuation density', () => {
  const noDialogue = Array.from({ length: 150 }, () => 'word').join(' ')
  const result = evaluateTranscriptQuality(noDialogue)

  assert.equal(result.accepted, false)
  assert.ok(result.reasons.some((reason) => reason.includes('punctuation density')))
  assert.equal(punctuationDensity(noDialogue), 0)
})

test('maps transcript quality scores by word-count bands', () => {
  assert.equal(mapTranscriptQuality(500), 1.0)
  assert.equal(mapTranscriptQuality(320), 0.8)
  assert.equal(mapTranscriptQuality(220), 0.6)
  assert.equal(mapTranscriptQuality(150), 0.4)
  assert.equal(mapTranscriptQuality(90), 0)
})
