"use client";

import { ClinicSvgName, CLINIC_SVGS } from '@/constants/clinic-svgs';

interface ClinicBackgroundProps {
  pattern: ClinicSvgName;
  className?: string;
  opacity?: number;
  size?: 'sm' | 'md' | 'lg';
}

const PATTERN_SIZES = {
  sm: '180%',
  md: '220%',
  lg: '260%',
};

export function ClinicBackground({ pattern, className = '', opacity = 0.03, size = 'md' }: ClinicBackgroundProps) {
  const src = CLINIC_SVGS[pattern];
  return (
    <div 
      className={className}
      style={{
        backgroundImage: `url(${src})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
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
