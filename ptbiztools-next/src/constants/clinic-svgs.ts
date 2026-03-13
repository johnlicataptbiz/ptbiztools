/**
 * Local clinic-themed SVGs from clinic_svg_pack
 * Paths relative to public/
 */
export const CLINIC_SVGS = {
  performance: '/clinic-icons/clinic_performance_banner.svg',
  growth: '/clinic-icons/growth_arrow_banner.svg',
  kpiTexture: '/clinic-icons/kpi_chart_texture.svg',
  kpiBarbell: '/clinic-icons/barbell_kpi_strip.svg',
  network: '/clinic-icons/network_arrow_banner.svg',
  coachingGrid: '/clinic-icons/coaching_blueprint_grid.svg',
  progressBar: '/clinic-icons/progress_bar_banner.svg',
  analyticsStrip: '/clinic-icons/analytics_strip.svg',
  analyticsArrow: '/clinic-icons/analytics_arrow_pattern.svg',
  nodeNetwork: '/clinic-icons/node_network_pattern.svg',
} as const;

export type ClinicSvgName = keyof typeof CLINIC_SVGS;

