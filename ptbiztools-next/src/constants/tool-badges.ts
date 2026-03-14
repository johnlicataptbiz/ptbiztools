import { CLINIC_SVGS } from './clinic-svgs';

export const TOOL_BADGES = {
  discovery: CLINIC_SVGS.discallGrader,
  sales: CLINIC_SVGS.salesGrader,
  pl: CLINIC_SVGS.plGrader,
  comp: CLINIC_SVGS.compGrader,
  // Local fallbacks
  discoveryLocal: CLINIC_SVGS.analyticsStrip,
  salesLocal: CLINIC_SVGS.growth,
  plLocal: CLINIC_SVGS.performance,
  compLocal: CLINIC_SVGS.kpiBarbell,
} as const;
