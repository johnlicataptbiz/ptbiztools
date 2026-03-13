import { CLINIC_SVGS } from './clinic-svgs';

export const TOOL_BADGES = {
  discovery: "https://22001532.fs1.hubspotusercontent-na1.net/hubfs/22001532/JL/pt%20biz%20coach/discallgrader.png",
  sales: "https://22001532.fs1.hubspotusercontent-na1.net/hubfs/22001532/JL/pt%20biz%20coach/salesgrader.png",
  pl: "https://22001532.fs1.hubspotusercontent-na1.net/hubfs/22001532/JL/pt%20biz%20coach/plgrader.png",
  comp: "https://22001532.fs1.hubspotusercontent-na1.net/hubfs/22001532/JL/pt%20biz%20coach/compgrader.png",
  // Local fallbacks
  discoveryLocal: CLINIC_SVGS.analyticsStrip,
  salesLocal: CLINIC_SVGS.growth,
  plLocal: CLINIC_SVGS.performance,
  compLocal: CLINIC_SVGS.kpiBarbell,
} as const;

