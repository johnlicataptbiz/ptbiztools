import { useMemo } from 'react'
import type { PLInput, PLResult } from './plTypes'
import { buildPLResult } from './pl/engine'
import { buildLegacyPLResult } from './pl/legacyEngine'

function isV2Enabled() {
  const flagValue = String(import.meta.env.VITE_PL_CALCULATOR_V2 || '').toLowerCase().trim()
  return flagValue === 'true' || flagValue === '1' || flagValue === 'yes' || flagValue === 'on'
}

export function usePLGrader(input: PLInput | null): PLResult | null {
  return useMemo(() => {
    if (!input) return null

    if (isV2Enabled()) {
      return buildPLResult(input)
    }

    return buildLegacyPLResult(input)
  }, [input])
}
