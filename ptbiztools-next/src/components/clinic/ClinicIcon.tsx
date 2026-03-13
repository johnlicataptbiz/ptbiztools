"use client";

import { CLINIC_SVGS, type ClinicSvgName } from '@/constants/clinic-svgs';
import { cn } from '@/lib/utils';

export type { ClinicSvgName };

interface ClinicIconProps {
  name: ClinicSvgName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}

export function ClinicIcon({ name, size = 24, className, style, color }: ClinicIconProps) {
  const src = CLINIC_SVGS[name];
  return (
    <img
      src={src}
      alt={`${name} clinic icon`}
      width={size}
      height={size}
      className={cn('inline-block', className)}
      style={{
        ...style,
        color, // for currentColor if SVG supports
        width: size,
        height: size,
      }}
      onError={(e) => {
        console.warn(`ClinicIcon ${name} failed to load:`, src);
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

