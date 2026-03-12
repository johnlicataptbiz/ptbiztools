/**
 * Design Token System for PT Biz Tools
 * 
 * This file defines the semantic design tokens used throughout the application.
 * All colors, spacing, and typography values should reference these tokens
 * to ensure consistency across themes and components.
 */

// ============================================================================
// BRAND COLORS
// Extracted from the official PT Biz logo
// ============================================================================

export const BRAND_COLORS = {
  // Primary brand color - extracted from logo
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#2E7C52', // Logo green - main brand color
    600: '#166534',
    700: '#14532d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  
  // Secondary accent - complementary to primary
  secondary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#c7632f', // Warm amber for coaching feel
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },
  
  // Neutral grays with warm undertones
  neutral: {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
    950: '#0c0a09',
  },
} as const;

// ============================================================================
// SEMANTIC COLOR TOKENS
// These map brand colors to semantic meanings
// ============================================================================

export type SemanticColorScheme = {
  // Brand colors
  'brand-primary': string;
  'brand-primary-hover': string;
  'brand-primary-active': string;
  'brand-primary-subtle': string;
  'brand-secondary': string;
  'brand-secondary-hover': string;
  
  // Surface colors (backgrounds)
  'surface-base': string;
  'surface-elevated': string;
  'surface-overlay': string;
  'surface-inset': string;
  
  // Text colors
  'text-primary': string;
  'text-secondary': string;
  'text-muted': string;
  'text-inverse': string;
  'text-brand': string;
  
  // Border colors
  'border-subtle': string;
  'border-default': string;
  'border-strong': string;
  
  // Status colors
  'status-success': string;
  'status-warning': string;
  'status-danger': string;
  'status-info': string;
  
  // Interactive states
  'interactive-hover': string;
  'interactive-active': string;
  'interactive-focus': string;
  'interactive-disabled': string;
  
  // Accent variations
  'accent-subtle': string;
  'accent-default': string;
  'accent-strong': string;
  
  // Logo treatment
  'logo-filter': string;
  'logo-mask': string;
  'logo-glow': string;
};

// ============================================================================
// THEME DEFINITIONS
// Three brand-aligned themes with semantic color mappings
// ============================================================================

export type AppTheme = 'evergreen' | 'classic' | 'midnight';

export interface ThemeDefinition {
  value: AppTheme;
  label: string;
  description: string;
  colors: SemanticColorScheme;
  isDark: boolean;
}

export const THEME_DEFINITIONS: Record<AppTheme, ThemeDefinition> = {
  // Evergreen - Professional, logo-matched (DEFAULT)
  evergreen: {
    value: 'evergreen',
    label: 'Evergreen',
    description: 'Professional, clean aesthetic that matches our brand identity',
    isDark: false,
    colors: {
      // Brand colors - using logo green
      'brand-primary': BRAND_COLORS.primary[500],
      'brand-primary-hover': BRAND_COLORS.primary[600],
      'brand-primary-active': BRAND_COLORS.primary[700],
      'brand-primary-subtle': BRAND_COLORS.primary[100],
      'brand-secondary': BRAND_COLORS.secondary[500],
      'brand-secondary-hover': BRAND_COLORS.secondary[600],
      
      // Surface colors
      'surface-base': '#f8faf9',
      'surface-elevated': '#ffffff',
      'surface-overlay': 'rgba(255, 255, 255, 0.95)',
      'surface-inset': '#f0f4f2',
      
      // Text colors
      'text-primary': '#1a2e24',
      'text-secondary': '#3d5a4d',
      'text-muted': '#6b8a7a',
      'text-inverse': '#ffffff',
      'text-brand': BRAND_COLORS.primary[600],
      
      // Border colors
      'border-subtle': '#e2ebe6',
      'border-default': '#c8ddd4',
      'border-strong': '#9ab8ac',
      
      // Status colors - harmonized with brand
      'status-success': '#2b8751',
      'status-warning': '#b7791f',
      'status-danger': '#c53030',
      'status-info': '#2f6f88',
      
      // Interactive states
      'interactive-hover': 'rgba(46, 124, 82, 0.08)',
      'interactive-active': 'rgba(46, 124, 82, 0.12)',
      'interactive-focus': 'rgba(46, 124, 82, 0.25)',
      'interactive-disabled': 'rgba(107, 114, 128, 0.4)',
      
      // Accent variations
      'accent-subtle': BRAND_COLORS.primary[100],
      'accent-default': BRAND_COLORS.primary[500],
      'accent-strong': BRAND_COLORS.primary[700],
      
      // Logo treatment
      'logo-filter': 'saturate(1.02) contrast(1.04)',
      'logo-mask': 'radial-gradient(120% 120% at 52% 45%, #000 72%, rgba(0, 0, 0, 0.92) 88%, transparent 100%)',
      'logo-glow': '0 0 40px rgba(46, 124, 82, 0.3)',
    },
  },
  
  // Classic - Warm, coaching-focused
  classic: {
    value: 'classic',
    label: 'Classic Coach',
    description: 'Warm, approachable aesthetic perfect for coaching interactions',
    isDark: false,
    colors: {
      // Brand colors - slightly warmer
      'brand-primary': '#2d6a4f',
      'brand-primary-hover': '#245a42',
      'brand-primary-active': '#1b4a36',
      'brand-primary-subtle': '#e8f5e9',
      'brand-secondary': '#c7632f',
      'brand-secondary-hover': '#a55226',
      
      // Surface colors - warm cream tones
      'surface-base': '#faf8f5',
      'surface-elevated': '#ffffff',
      'surface-overlay': 'rgba(255, 253, 250, 0.95)',
      'surface-inset': '#f5f0e8',
      
      // Text colors - warm grays
      'text-primary': '#2c241b',
      'text-secondary': '#5c5145',
      'text-muted': '#8b7d6b',
      'text-inverse': '#ffffff',
      'text-brand': '#2d6a4f',
      
      // Border colors
      'border-subtle': '#ebe5db',
      'border-default': '#d4c9b8',
      'border-strong': '#b5a896',
      
      // Status colors
      'status-success': '#2f855a',
      'status-warning': '#c05621',
      'status-danger': '#c53030',
      'status-info': '#2b6cb0',
      
      // Interactive states
      'interactive-hover': 'rgba(45, 106, 79, 0.08)',
      'interactive-active': 'rgba(45, 106, 79, 0.12)',
      'interactive-focus': 'rgba(45, 106, 79, 0.25)',
      'interactive-disabled': 'rgba(107, 114, 128, 0.4)',
      
      // Accent variations
      'accent-subtle': '#e8f5e9',
      'accent-default': '#2d6a4f',
      'accent-strong': '#1b4a36',
      
      // Logo treatment
      'logo-filter': 'saturate(0.95) contrast(1.06) sepia(0.08)',
      'logo-mask': 'linear-gradient(145deg, transparent 0%, rgba(0, 0, 0, 0.85) 14%, #000 38%, #000 86%, transparent 100%)',
      'logo-glow': '0 0 40px rgba(45, 106, 79, 0.25)',
    },
  },
  
  // Midnight - Dark mode for power users
  midnight: {
    value: 'midnight',
    label: 'Midnight',
    description: 'Dark mode with subtle blue undertones for extended use',
    isDark: true,
    colors: {
      // Brand colors - adjusted for dark mode
      'brand-primary': '#4ade80',
      'brand-primary-hover': '#5eead4',
      'brand-primary-active': '#6fffe0',
      'brand-primary-subtle': 'rgba(74, 222, 128, 0.15)',
      'brand-secondary': '#fdba74',
      'brand-secondary-hover': '#fed7aa',
      
      // Surface colors - dark blue-grays
      'surface-base': '#0f1724',
      'surface-elevated': '#1a2433',
      'surface-overlay': 'rgba(26, 36, 51, 0.95)',
      'surface-inset': '#0a0f18',
      
      // Text colors
      'text-primary': '#e7edf8',
      'text-secondary': '#afbbd0',
      'text-muted': '#7a8aa3',
      'text-inverse': '#0f1724',
      'text-brand': '#4ade80',
      
      // Border colors
      'border-subtle': '#2a3a54',
      'border-default': '#3d4f6b',
      'border-strong': '#5a6f8a',
      
      // Status colors
      'status-success': '#41ba8d',
      'status-warning': '#d4a555',
      'status-danger': '#e06b7a',
      'status-info': '#7cb4ff',
      
      // Interactive states
      'interactive-hover': 'rgba(74, 222, 128, 0.12)',
      'interactive-active': 'rgba(74, 222, 128, 0.18)',
      'interactive-focus': 'rgba(74, 222, 128, 0.35)',
      'interactive-disabled': 'rgba(107, 114, 128, 0.3)',
      
      // Accent variations
      'accent-subtle': 'rgba(74, 222, 128, 0.15)',
      'accent-default': '#4ade80',
      'accent-strong': '#5eead4',
      
      // Logo treatment
      'logo-filter': 'saturate(1.08) contrast(1.12) brightness(1.04)',
      'logo-mask': 'linear-gradient(160deg, transparent 0%, rgba(0, 0, 0, 0.82) 12%, #000 36%, #000 86%, transparent 100%)',
      'logo-glow': '0 0 40px rgba(74, 222, 128, 0.4)',
    },
  },
} as const;

// ============================================================================
// SPACING TOKENS
// ============================================================================

export const SPACING = {
  '0': '0',
  '1': '0.25rem',   // 4px
  '2': '0.5rem',    // 8px
  '3': '0.75rem',   // 12px
  '4': '1rem',      // 16px
  '5': '1.25rem',   // 20px
  '6': '1.5rem',    // 24px
  '8': '2rem',      // 32px
  '10': '2.5rem',   // 40px
  '12': '3rem',     // 48px
  '16': '4rem',     // 64px
  '20': '5rem',     // 80px
  '24': '6rem',     // 96px
} as const;

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================

export const TYPOGRAPHY = {
  fontFamily: {
    sans: 'var(--font-brand-sans), system-ui, -apple-system, sans-serif',
    mono: 'var(--font-brand-mono), ui-monospace, monospace',
  },
  fontSize: {
    '2xs': '0.625rem',   // 10px
    'xs': '0.75rem',     // 12px
    'sm': '0.875rem',    // 14px
    'base': '1rem',      // 16px
    'lg': '1.125rem',    // 18px
    'xl': '1.25rem',     // 20px
    '2xl': '1.5rem',     // 24px
    '3xl': '1.875rem',   // 30px
    '4xl': '2.25rem',    // 36px
    '5xl': '3rem',       // 48px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ============================================================================
// SHADOW TOKENS
// ============================================================================

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  none: 'none',
} as const;

// ============================================================================
// RADIUS TOKENS
// ============================================================================

export const RADIUS = {
  none: '0',
  sm: '0.125rem',   // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// ============================================================================
// TRANSITION TOKENS
// ============================================================================

export const TRANSITIONS = {
  DEFAULT: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  fast: '100ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: '300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// ============================================================================
// Z-INDEX TOKENS
// ============================================================================

export const Z_INDEX = {
  hide: -1,
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate CSS custom properties from a theme's color scheme
 */
export function generateCSSVariables(colors: SemanticColorScheme): string {
  return Object.entries(colors)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join('\n');
}

/**
 * Get all available theme options for UI display
 */
export function getThemeOptions(): Array<{ value: AppTheme; label: string; description: string }> {
  return Object.values(THEME_DEFINITIONS).map(theme => ({
    value: theme.value,
    label: theme.label,
    description: theme.description,
  }));
}

/**
 * Check if a theme value is valid
 */
export function isValidTheme(value: string): value is AppTheme {
  return value in THEME_DEFINITIONS;
}

/**
 * Get theme definition by value
 */
export function getThemeDefinition(theme: AppTheme): ThemeDefinition {
  return THEME_DEFINITIONS[theme];
}

/**
 * Apply theme colors as CSS custom properties
 */
export function applyThemeToDocument(theme: AppTheme): void {
  if (typeof document === 'undefined') return;
  
  const definition = THEME_DEFINITIONS[theme];
  const root = document.documentElement;
  
  // Set data attribute for CSS selectors
  root.setAttribute('data-theme', theme);
  
  // Apply all color tokens as CSS variables
  Object.entries(definition.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
  
  // Set dark mode class for Tailwind
  if (definition.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
