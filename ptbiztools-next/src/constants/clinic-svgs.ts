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
  // Grader Badges
  discallGrader: '/assets/graders/discallgrader.png',
  salesGrader: '/assets/graders/salesgrader.png',
  plGrader: '/assets/graders/plgrader.png',
  compGrader: '/assets/graders/compgrader.png',
  // PTBiz Brand Backgrounds
  ptbizPatternDarkBlue: '/assets/ptbiz-pattern-dark-blue.png',
  ptbizPatternAlt: '/assets/ptbiz-pattern-alt.png',
  ptbizBg1: '/assets/ptbiz-bg-1.webp',
  ptbizBg2: '/assets/ptbiz-bg-2.webp',
  ptbizBg3: '/assets/ptbiz-bg-3.webp',
  // Extracted dashboard/sub-page assets
  heroBackground: '/clinic-icons/hero_background.png',
  waveBackgroundBand: '/clinic-icons/wave_background_band.png',
  coachingNodeNetwork: '/clinic-icons/coaching_node_network.png',
  fiveTierBanner: '/clinic-icons/five_tier_banner.png',
  growthGraphPattern: '/clinic-icons/growth_graph_pattern.png',
  growthBubblesIcon: '/clinic-icons/growth_bubbles_icon.png',
  targetArrowIcon: '/clinic-icons/target_arrow_icon.png',
  clipboardIcon: '/clinic-icons/clipboard_icon.png',
  stackedTilesIcon: '/clinic-icons/stacked_tiles_icon.png',
  motivationalStrip: '/clinic-icons/motivational_strip.png',
  motivationalTable: '/clinic-icons/motivational_table.png',
  trainingBannerVariant: '/clinic-icons/training_banner_variant.png',
  graphDivider: '/clinic-icons/graph_divider.png',
  arrowStrip: '/clinic-icons/arrow_strip.png',
  linkedNodeBackdrop: '/clinic-icons/linked_node_backdrop.png',
  growthChannelNodeBar: '/clinic-icons/growth_channel_node_bar.png',
  nodeBar: '/clinic-icons/node_bar.png',
  miniNodeConnector: '/clinic-icons/mini_node_connector.png',
  smallCheckmarkNode: '/clinic-icons/small_checkmark_node_1.png',
  // Clinic Icon PNGs (for carousel / hero use)
  banner3: '/clinic-icons/banner3.png',
  performancePng: '/clinic-icons/clinic_performance_banner.png',
  growthPng: '/clinic-icons/growth_arrow_banner.png',
  kpiTexturePng: '/clinic-icons/kpi_chart_texture.png',
  kpiBarbellPng: '/clinic-icons/barbell_kpi_strip.png',
  networkPng: '/clinic-icons/network_arrow_banner.png',
  coachingGridPng: '/clinic-icons/coaching_blueprint_grid.png',
  progressBarPng: '/clinic-icons/progress_bar_banner.png',
  analyticsStripPng: '/clinic-icons/analytics_strip.png',
  analyticsArrowPng: '/clinic-icons/analytics_arrow_pattern.png',
  nodeNetworkPng: '/clinic-icons/node_network_pattern.png',
} as const;

export type ClinicSvgName = keyof typeof CLINIC_SVGS;

