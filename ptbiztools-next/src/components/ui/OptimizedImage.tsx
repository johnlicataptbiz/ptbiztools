'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { getOptimalImageSize, type CmsAssetMetadata } from '@/constants/cms-assets';

interface OptimizedImageProps {
  asset: CmsAssetMetadata;
  containerWidth?: number;
  className?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  animate?: boolean;
  overlay?: boolean;
  overlayGradient?: string;
}

/**
 * OptimizedImage Component
 * 
 * Next.js Image wrapper with CMS asset optimization, lazy loading,
 * and smooth animations. Automatically generates responsive srcsets
 * and handles HubSpot CMS image optimization.
 */
export function OptimizedImage({
  asset,
  containerWidth = 1200,
  className = '',
  fill = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  priority = false,
  onLoad,
  onError,
  animate = true,
  overlay = false,
  overlayGradient = 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 100%)'
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Get optimal size for current viewport
  const { width, height, src } = getOptimalImageSize(containerWidth, asset);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Fallback for error state
  if (hasError) {
    return (
      <div 
        className={`bg-surface-elevated flex items-center justify-center ${className}`}
        style={{ aspectRatio: asset.width / asset.height }}
      >
        <span className="text-text-muted text-sm">Image unavailable</span>
      </div>
    );
  }

  const imageContent = (
    <Image
      src={src}
      alt={asset.alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      fill={fill}
      sizes={sizes}
      priority={priority || asset.priority}
      onLoad={handleLoad}
      onError={handleError}
      className={`object-cover ${className}`}
      style={{
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out'
      }}
    />
  );

  return (
    <div className="relative overflow-hidden">
      {/* Loading placeholder */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-surface-elevated animate-pulse"
          style={{ aspectRatio: asset.width / asset.height }}
        />
      )}
      
      {/* Animated image container */}
      {animate ? (
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ 
            opacity: isLoaded ? 1 : 0, 
            scale: isLoaded ? 1 : 1.05 
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative"
        >
          {imageContent}
        </motion.div>
      ) : (
        imageContent
      )}

      {/* Optional overlay */}
      {overlay && isLoaded && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ background: overlayGradient }}
        />
      )}
    </div>
  );
}

/**
 * HeroImage Component
 * 
 * Full-width hero image with CMS asset optimization and
 * gradient overlay support.
 */
interface HeroImageProps {
  asset: CmsAssetMetadata;
  height?: string;
  overlayOpacity?: number;
  children?: React.ReactNode;
  className?: string;
}

export function HeroImage({
  asset,
  height = '60vh',
  overlayOpacity = 0.3,
  children,
  className = ''
}: HeroImageProps) {
  return (
    <div 
      className={`relative w-full overflow-hidden ${className}`}
      style={{ height }}
    >
      <OptimizedImage
        asset={asset}
        fill
        sizes="100vw"
        priority
        className="object-cover"
        animate={true}
      />
      
      {/* Gradient overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(
            to bottom,
            transparent 0%,
            rgba(0,0,0,${overlayOpacity * 0.5}) 50%,
            rgba(0,0,0,${overlayOpacity}) 100%
          )`
        }}
      />
      
      {/* Content overlay */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * AssetCard Component
 * 
 * Card component with CMS asset thumbnail and hover effects.
 */
interface AssetCardProps {
  asset: CmsAssetMetadata;
  title: string;
  description?: string;
  onClick?: () => void;
  className?: string;
}

export function AssetCard({
  asset,
  title,
  description,
  onClick,
  className = ''
}: AssetCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`cursor-pointer group ${className}`}
      onClick={onClick}
    >
      <div className="relative rounded-xl overflow-hidden bg-surface-elevated shadow-lg">
        <OptimizedImage
          asset={asset}
          containerWidth={400}
          className="w-full h-48 object-cover"
          animate={true}
          overlay={true}
        />
        
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          {description && (
            <p className="text-white/80 text-sm mt-1">{description}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * BackgroundImage Component
 * 
 * Fixed/absolute background image for sections with parallax support.
 */
interface BackgroundImageProps {
  asset: CmsAssetMetadata;
  fixed?: boolean;
  parallax?: boolean;
  overlayColor?: string;
  className?: string;
  children?: React.ReactNode;
}

export function BackgroundImage({
  asset,
  fixed = false,
  parallax = false,
  overlayColor = 'rgba(0,0,0,0.2)',
  className = '',
  children
}: BackgroundImageProps) {
  return (
    <div className={`relative ${className}`}>
      <div 
        className={`absolute inset-0 ${fixed ? 'fixed' : 'absolute'} ${parallax ? 'bg-fixed' : ''}`}
        style={{
          backgroundImage: `url(${asset.url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: -1
        }}
      />
      
      {/* Overlay */}
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: overlayColor }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
