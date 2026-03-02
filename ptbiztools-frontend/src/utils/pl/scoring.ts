import type { GradeBand, GradeLevel } from '../plTypes'

export const GRADE_SCORES: Record<GradeLevel, number> = {
  green: 100,
  yellow: 72,
  red: 40,
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function toFiniteNumber(value: number | undefined | null): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) return 0
  return value
}

export function percent(part: number, total: number): number {
  if (total <= 0) return 0
  return (part / total) * 100
}

export function resolveGrade(
  value: number,
  bands: GradeBand[],
): { grade: GradeLevel; label: string } {
  for (const band of bands) {
    const minPass = band.min === undefined || value >= band.min
    const maxPass = band.max === undefined || value <= band.max

    if (minPass && maxPass) {
      return { grade: band.grade, label: band.label }
    }
  }

  const fallback = bands[bands.length - 1]
  return { grade: fallback.grade, label: fallback.label }
}

export function calculateWeightedScore(
  metrics: Array<{ score: number; weight: number }>,
): number {
  if (metrics.length === 0) return 0

  const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0)
  if (totalWeight <= 0) return 0

  const weighted = metrics.reduce((sum, metric) => sum + metric.score * metric.weight, 0)
  return Math.round(weighted / totalWeight)
}

export function overallGradeFromScore(score: number): GradeLevel {
  if (score >= 85) return 'green'
  if (score >= 65) return 'yellow'
  return 'red'
}
