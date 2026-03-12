/**
 * PT Biz Tools - Branding Constants
 * 
 * This file contains all brand-related constants including logos, colors,
 * and visual identity elements. All colors are derived from the official
 * brand logo to ensure consistency.
 */

import { BRAND_COLORS } from './design-tokens';

// ============================================================================
// LOGO ASSETS
// ============================================================================

// New Brand Logo (ChatGPT Image Mar 2, 2026) - Primary brand mark
export const NEW_BRAND_LOGO_URL = 'https://22001532.fs1.hubspotusercontent-na1.net/hubfs/22001532/JL/ChatGPT%20Image%20Mar%202%2c%202026%2c%2008_52_11%20AM.png';

// Legacy logos (kept for reference and PDF generation)
export const PTBIZ_LOGO_LIGHT_BG_URL = 'https://22001532.fs1.hubspotusercontent-na1.net/hubfs/22001532/Logos/PTBIZ_Logo-Primary_Black-Blue_RGB.png';
export const PTBIZ_LOGO_DARK_BG_URL = 'https://22001532.fs1.hubspotusercontent-na1.net/hubfs/22001532/Logos/PTBIZ_Logo-Primary_1Color_White_RGB.png';
export const PTBIZCOACH_LOGIN_LOGO_URL = 'https://22001532.fs1.hubspotusercontent-na1.net/hubfs/22001532/Logos/logfin.png';
export const PTBIZCOACH_LOGO_URL = 'https://22001532.fs1.hubspotusercontent-na1.net/hubfs/22001532/Logos/log.png';
export const PTBIZCOACH_FAVICON_URL = '/favicon.png';

// Active branding - using new logo across all touchpoints
export const SITE_LOGO_URL = NEW_BRAND_LOGO_URL;
export const LOGIN_LOGO_URL = NEW_BRAND_LOGO_URL;
export const LOGIN_BACKGROUND_IMAGE_URL = NEW_BRAND_LOGO_URL;
export const DISCOVERY_PDF_LOGO_WHITE_URL = PTBIZ_LOGO_DARK_BG_URL;

// ============================================================================
// BRAND COLORS
// Extracted from the official logo for consistency
// ============================================================================

/**
 * Primary brand green - extracted directly from logo
 * Use this for: primary buttons, active states, key accents
 */
export const BRAND_PRIMARY = BRAND_COLORS.primary[500]; // #2E7C52

/**
 * Primary brand green hover state
 */
export const BRAND_PRIMARY_HOVER = BRAND_COLORS.primary[600]; // #166534

/**
 * Primary brand green subtle variant
 * Use this for: backgrounds, badges, subtle highlights
 */
export const BRAND_PRIMARY_SUBTLE = BRAND_COLORS.primary[100]; // #dcfce7

/**
 * Secondary brand color - warm amber for coaching feel
 * Use this for: secondary actions, warm accents, CTAs
 */
export const BRAND_SECONDARY = BRAND_COLORS.secondary[500]; // #c7632f

/**
 * Brand dark - for sidebar backgrounds, dark sections
 */
export const BRAND_DARK = '#1a2e24';

/**
 * Brand accent light - for hover states, highlights
 */
export const BRAND_ACCENT_LIGHT = BRAND_COLORS.primary[300]; // #86efac

// ============================================================================
// LOGO DISPLAY CONFIGURATION
// ============================================================================

/**
 * Logo sizing for different contexts
 */
export const LOGO_SIZES = {
  /** Sidebar logo - prominent but not overwhelming */
  sidebar: {
    height: 120, // Increased from 68px for better visibility
    width: 'auto',
  },
  /** Login page hero logo - large and impactful */
  loginHero: {
    height: 200,
    width: 'auto',
  },
  /** Small logo for compact spaces */
  compact: {
    height: 48,
    width: 'auto',
  },
  /** Favicon size */
  favicon: {
    height: 32,
    width: 32,
  },
} as const;

/**
 * Logo visual treatments by theme
 */
export const LOGO_TREATMENTS = {
  evergreen: {
    filter: 'saturate(1.02) contrast(1.04)',
    mask: 'radial-gradient(120% 120% at 52% 45%, #000 72%, rgba(0, 0, 0, 0.92) 88%, transparent 100%)',
    glow: `0 0 40px ${BRAND_PRIMARY}4D`, // 30% opacity
  },
  classic: {
    filter: 'saturate(0.95) contrast(1.06) sepia(0.08)',
    mask: 'linear-gradient(145deg, transparent 0%, rgba(0, 0, 0, 0.85) 14%, #000 38%, #000 86%, transparent 100%)',
    glow: `0 0 40px ${BRAND_PRIMARY}40`, // 25% opacity
  },
  midnight: {
    filter: 'saturate(1.08) contrast(1.12) brightness(1.04)',
    mask: 'linear-gradient(160deg, transparent 0%, rgba(0, 0, 0, 0.82) 12%, #000 36%, #000 86%, transparent 100%)',
    glow: `0 0 40px ${BRAND_PRIMARY}66`, // 40% opacity
  },
} as const;

// ============================================================================
// BRAND TYPOGRAPHY
// ============================================================================

/**
 * Brand font stack
 */
export const BRAND_FONT_FAMILY = {
  sans: 'var(--font-brand-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: 'var(--font-brand-mono), ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
} as const;

/**
 * Brand typography scale
 */
export const BRAND_TYPOGRAPHY = {
  logo: {
    fontSize: '0.875rem', // 14px
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
  },
  headline: {
    fontSize: '2.25rem', // 36px
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  subheadline: {
    fontSize: '1.125rem', // 18px
    fontWeight: 500,
    letterSpacing: '-0.01em',
    lineHeight: 1.5,
  },
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get logo treatment for a specific theme
 */
export function getLogoTreatment(theme: 'evergreen' | 'classic' | 'midnight') {
  return LOGO_TREATMENTS[theme];
}

/**
 * Generate CSS for logo glow effect
 */
export function getLogoGlowCSS(theme: 'evergreen' | 'classic' | 'midnight'): string {
  const treatment = LOGO_TREATMENTS[theme];
  return `
    filter: ${treatment.filter};
    -webkit-mask-image: ${treatment.mask};
    mask-image: ${treatment.mask};
    transition: transform 220ms ease, filter 220ms ease, box-shadow 220ms ease;
  `;
}

/**
 * Check if a color is the brand primary
 */
export function isBrandPrimary(color: string): boolean {
  return color.toLowerCase() === BRAND_PRIMARY.toLowerCase();
}

/**
 * Mix brand primary with another color at a given opacity
 */
export function mixBrandPrimary(color: string, opacity: number): string {
  // Convert hex to rgba
  const r = parseInt(BRAND_PRIMARY.slice(1, 3), 16);
  const g = parseInt(BRAND_PRIMARY.slice(3, 5), 16);
  const b = parseInt(BRAND_PRIMARY.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
