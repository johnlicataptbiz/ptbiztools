# Clinic SVG Integration TODO

## Preparation (Steps 1-2)
- [x] Copy selected SVGs from /Users/jl/Downloads/clinic_svg_pack to ptbiztools-next/public/clinic-icons/ (12 files: clinic_performance_banner.svg, growth_arrow_banner.svg, kpi_chart_texture.svg, barbell_kpi_strip.svg, node_network_pattern.svg, analytics_strip.svg, coaching_blueprint_grid.svg, progress_bar_banner.svg, network_arrow_banner.svg, analytics_arrow_pattern.svg, etc.)
- [x] Create ptbiztools-next/src/constants/clinic-svgs.ts exporting icon paths/names

## Components (Steps 2-3)
- [x] Create ptbiztools-next/src/components/clinic/ClinicIcon.tsx (SVG wrapper with size/color props)
- [x] Create ptbiztools-next/src/components/clinic/ClinicBackgrounds.tsx (pattern components)

## Styling (Steps 3)
- [x] Create ptbiztools-next/src/styles/clinic-theme.css (CSS vars/animations)
- [x] Import clinic-theme.css to ptbiztools-next/src/app/layout.tsx and ptbiztools-next/src/components/danny/danny-theme.css

## Core Updates (Steps 4-6)
- [x] Update ptbiztools-next/src/app/(app)/dashboard/page.tsx: Replace Lucide icons with ClinicIcon; add backgrounds
- [x] Update ptbiztools-next/src/constants/tool-badges.ts: Add local SVG paths
- [x] Update DannyCloserCallGrader.tsx: Add banners/icons to modals/progress

- [x] Update DannyFinancialAudit.jsx: Add SVGs to tables/charts
 
 ## Polish & Test (Steps 7-9)
 - [x] Update ptbiztools-next/src/styles/dashboard.css and danny-theme.css for patterns
- [x] Add 2 visual tests to ptbiztools-next/src/components/danny/DannyCloserCallGrader.test.tsx
- [x] QA: npm run dev, test responsive/print/hover; attempt_completion


