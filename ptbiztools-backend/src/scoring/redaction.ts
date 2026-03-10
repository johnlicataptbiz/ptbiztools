import { createHash } from 'node:crypto'

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const PHONE_REGEX = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g
const URL_REGEX = /\b(?:https?:\/\/|www\.)\S+\b/gi
const ADDRESS_REGEX = /\b\d{1,5}\s+[A-Za-z0-9.'\-\s]{2,40}\s(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir|Highway|Hwy)\b/gi

const ALLOWED_MULTI_WORD_TOKENS = new Set([
  'PT Biz',
  'PT Biz Tools',
  'Rainmaker',
  'Mastermind',
  'Discovery Call',
])

function redactSpeakerLabels(input: string): string {
  return input.replace(/(^|\n)\s*([A-Z][A-Za-z'\-]{1,24})\s*:/g, '$1[NAME]:')
}

function redactDeclaredNames(input: string): string {
  return input
    .replace(/\b(?:my name is|this is|i am|i'm)\s+([A-Z][A-Za-z'\-]{1,24})\b/g, (_full, name: string) => {
      if (name.toLowerCase() === 'i') return _full
      return _full.replace(name, '[NAME]')
    })
    .replace(/\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})\b/g, (match) => {
      if (ALLOWED_MULTI_WORD_TOKENS.has(match)) return match
      return '[NAME]'
    })
}

export function redactTranscript(input: string): string {
  const base = input
    .replace(EMAIL_REGEX, '[EMAIL]')
    .replace(PHONE_REGEX, '[PHONE]')
    .replace(URL_REGEX, '[URL]')
    .replace(ADDRESS_REGEX, '[ADDRESS]')

  const withLabels = redactSpeakerLabels(base)
  const withNames = redactDeclaredNames(withLabels)
  return withNames.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

export function hashTranscript(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

export interface TranscriptPrivacyArtifacts {
  redactedTranscript: string
  transcriptHash: string
}

export function buildTranscriptPrivacyArtifacts(transcript: string): TranscriptPrivacyArtifacts {
  return {
    redactedTranscript: redactTranscript(transcript),
    transcriptHash: hashTranscript(transcript),
  }
}
