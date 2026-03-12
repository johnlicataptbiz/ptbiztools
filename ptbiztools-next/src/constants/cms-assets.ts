/**
 * CMS Assets Configuration
 * 
 * Centralized management of all HubSpot CMS assets for consistent
 * usage across the application with metadata for optimization.
 */

// Base URL for HubSpot CMS assets
const CMS_BASE_URL = 'https://22001532.fs1.hubspotusercontent-na1.net/hubfs/22001532/JL/pt%20biz%20coach';

// Asset categories for organized access
export const CMS_ASSETS = {
  // Generated brand visuals for hero sections and backgrounds
  brand: {
    heroPrimary: {
      url: `${CMS_BASE_URL}/Generated%20Image%20March%2011%2c%202026%20-%206_06PM.png`,
      alt: 'PT Biz Coach Hero Visual',
      width: 1920,
      height: 1080,
      priority: true,
      usage: ['login-hero', 'dashboard-banner', 'page-backgrounds']
    },
    heroSecondary: {
      url: `${CMS_BASE_URL}/Generated%20Image%20March%2011%2c%202026%20-%206_32PM.png`,
      alt: 'PT Biz Coach Secondary Visual',
      width: 1920,
      height: 1080,
      priority: false,
      usage: ['tool-heroes', 'feature-sections']
    }
  },

  // UI Reference screenshots for previews and documentation
  screenshots: {
    dashboard: {
      url: `${CMS_BASE_URL}/Screenshot%202026-03-11%20at%206.07.18%20PM.png`,
      alt: 'Dashboard Interface',
      width: 1200,
      height: 800,
      priority: false,
      usage: ['tour', 'help-docs', 'feature-previews']
    },
    toolsOverview: {
      url: `${CMS_BASE_URL}/Screenshot%202026-03-11%20at%206.07.07%20PM.png`,
      alt: 'Tools Overview',
      width: 1200,
      height: 800,
      priority: false,
      usage: ['tour', 'help-docs']
    },
    callGrader: {
      url: `${CMS_BASE_URL}/Screenshot%202026-03-11%20at%206.20.04%20PM.png`,
      alt: 'Call Grader Tool',
      width: 1200,
      height: 800,
      priority: false,
      usage: ['tool-previews', 'help-docs']
    },
    calculator: {
      url: `${CMS_BASE_URL}/Screenshot%202026-03-11%20at%206.20.15%20PM.png`,
      alt: 'Calculator Tool',
      width: 1200,
      height: 800,
      priority: false,
      usage: ['tool-previews', 'help-docs']
    },
    analysis: {
      url: `${CMS_BASE_URL}/Screenshot%202026-03-11%20at%206.20.10%20PM.png`,
      alt: 'Analysis Results',
      width: 1200,
      height: 800,
      priority: false,
      usage: ['feature-previews', 'help-docs']
    },
    reports: {
      url: `${CMS_BASE_URL}/Screenshot%202026-03-11%20at%206.20.20%20PM.png`,
      alt: 'Reports Interface',
      width: 1200,
      height: 800,
      priority: false,
      usage: ['feature-previews', 'help-docs']
    }
  }
} as const;

// Type exports for TypeScript safety
export type CmsAssetCategory = keyof typeof CMS_ASSETS;
export type BrandAssetKey = keyof typeof CMS_ASSETS.brand;
export type ScreenshotAssetKey = keyof typeof CMS_ASSETS.screenshots;

export interface CmsAssetMetadata {
  url: string;
  alt: string;
  width: number;
  height: number;
  priority: boolean;
  usage: readonly string[] | string[];
}

/**
 * Get asset by category and key with full metadata
 */
export function getCmsAsset<T extends CmsAssetCategory>(
  category: T,
  key: T extends 'brand' ? BrandAssetKey : ScreenshotAssetKey
): CmsAssetMetadata {
  const assets = CMS_ASSETS[category];
  const asset = assets[key as keyof typeof assets] as CmsAssetMetadata;
  
  if (!asset) {
    throw new Error(`CMS asset not found: ${category}.${String(key)}`);
  }
  
  return asset;
}

/**
 * Get asset URL only (convenience function)
 */
export function getCmsAssetUrl(
  category: CmsAssetCategory,
  key: BrandAssetKey | ScreenshotAssetKey
): string {
  const asset = getCmsAsset(category, key);
  return asset.url;
}

/**
 * Get all assets for a specific usage context
 */
export function getAssetsByUsage(usage: string): CmsAssetMetadata[] {
  const results: CmsAssetMetadata[] = [];
  
  Object.values(CMS_ASSETS).forEach(category => {
    Object.values(category).forEach(asset => {
      if (asset.usage.includes(usage)) {
        results.push(asset);
      }
    });
  });
  
  return results;
}

/**
 * Preload critical assets for better performance
 */
export function preloadCriticalAssets(): void {
  if (typeof window === 'undefined') return;
  
  const criticalAssets = [
    CMS_ASSETS.brand.heroPrimary,
    CMS_ASSETS.screenshots.dashboard
  ].filter(asset => asset.priority);
  
  criticalAssets.forEach(asset => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = asset.url;
    link.type = 'image/png';
    document.head.appendChild(link);
  });
}

/**
 * Generate responsive srcset for CMS images
 */
export function generateSrcset(url: string, widths: number[] = [640, 750, 828, 1080, 1200, 1920]): string {
  // For HubSpot CMS, we can use their built-in image optimization
  // by appending width parameters
  return widths
    .map(width => {
      // HubSpot supports width parameter for optimization
      const optimizedUrl = url.includes('?') 
        ? `${url}&width=${width}` 
        : `${url}?width=${width}`;
      return `${optimizedUrl} ${width}w`;
    })
    .join(', ');
}

/**
 * Get optimal image size for viewport
 */
export function getOptimalImageSize(
  containerWidth: number,
  asset: CmsAssetMetadata
): { width: number; height: number; src: string } {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const targetWidth = Math.min(containerWidth * dpr, asset.width);
  
  // Generate optimized URL
  const optimizedSrc = asset.url.includes('?')
    ? `${asset.url}&width=${Math.round(targetWidth)}`
    : `${asset.url}?width=${Math.round(targetWidth)}`;
  
  const aspectRatio = asset.width / asset.height;
  const height = Math.round(targetWidth / aspectRatio);
  
  return {
    width: Math.round(targetWidth),
    height,
    src: optimizedSrc
  };
}
