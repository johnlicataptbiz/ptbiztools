export const MIN_TRANSCRIPT_WORDS = 120
export const PUNCTUATION_DENSITY_THRESHOLD = 0.005

export interface TranscriptQualityResult {
  accepted: boolean
  reasons: string[]
  wordCount: number
  punctuationDensity: number
  hasDialogueTurns: boolean
  transcriptQuality: number
}

export function countWords(transcript: string): number {
  const trimmed = transcript.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

export function detectDialogueTurns(transcript: string): boolean {
  const lines = transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  let labeledTurns = 0
  for (const line of lines) {
    if (/^[A-Za-z][A-Za-z\s'\-]{1,30}:\s+.{2,}$/.test(line)) {
      labeledTurns += 1
      if (labeledTurns >= 2) return true
    }
  }

  const quotedUtterances = (transcript.match(/[“\"].+?[”\"]/g) || []).length
  return quotedUtterances >= 3
}

export function punctuationDensity(transcript: string): number {
  const punctuationMatches = transcript.match(/[.,!?;:]/g)
  const punctuationCount = punctuationMatches ? punctuationMatches.length : 0
  const length = Math.max(1, transcript.length)
  return punctuationCount / length
}

export function mapTranscriptQuality(wordCount: number): number {
  if (wordCount >= 500) return 1.0
  if (wordCount >= 300) return 0.8
  if (wordCount >= 180) return 0.6
  if (wordCount >= 120) return 0.4
  return 0
}

export function evaluateTranscriptQuality(transcript: string): TranscriptQualityResult {
  const reasons: string[] = []
  const words = countWords(transcript)
  if (words < MIN_TRANSCRIPT_WORDS) {
    reasons.push(`Transcript is too short: ${words} words (minimum ${MIN_TRANSCRIPT_WORDS})`)
  }

  const hasDialogueTurns = detectDialogueTurns(transcript)
  const density = punctuationDensity(transcript)
  if (!hasDialogueTurns && density < PUNCTUATION_DENSITY_THRESHOLD) {
    reasons.push(
      'Transcript appears low quality: no recognizable dialogue turns and punctuation density is below threshold',
    )
  }

  return {
    accepted: reasons.length === 0,
    reasons,
    wordCount: words,
    punctuationDensity: density,
    hasDialogueTurns,
    transcriptQuality: mapTranscriptQuality(words),
  }
}
