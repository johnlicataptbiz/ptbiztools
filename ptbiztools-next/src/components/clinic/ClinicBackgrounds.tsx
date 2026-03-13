"use client";

import { ClinicSvgName, CLINIC_SVGS } from '@/constants/clinic-svgs';

interface ClinicBackgroundProps {
  pattern: ClinicSvgName;
  className?: string;
  opacity?: number;
  size?: 'sm' | 'md' | 'lg';
}

const PATTERN_SIZES = {
  sm: '60px',
  md: '120px',
  lg: '200px',
};

export function ClinicBackground({ pattern, className = '', opacity = 0.08, size = 'md' }: ClinicBackgroundProps) {
  const src = CLINIC_SVGS[pattern];
  return (
    <div 
      className={className}
      style={{
        backgroundImage: `url(${src})`,
        backgroundRepeat: 'repeat',
        backgroundSize: PATTERN_SIZES[size],
        opacity,
        position: 'absolute',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}

