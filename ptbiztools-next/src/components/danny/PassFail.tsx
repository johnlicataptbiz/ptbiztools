import React from 'react';
import type { DannyComponentProps } from './types';

interface PassFailProps extends DannyComponentProps {
  status: 'pass' | 'fail' | 'unknown';
}

const PassFail: React.FC<PassFailProps> = ({ status, className = '' }) => {
  const isPass = status === 'pass';
  const isUnknown = status === 'unknown';
  
  const config = {
    pass: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: '✓ PASS' },
    fail: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: '✗ FAIL' },
    unknown: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', label: '? UNKNOWN' }
  }[status];

  return (
    <span 
      className={`danny-passfail ${className}`} 
      style={{
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '4px',
        padding: '2px 8px', 
        borderRadius: '3px', 
        fontSize: '11px', 
        fontWeight: 700,
        letterSpacing: '0.05em', 
        textTransform: 'uppercase',
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.color.replace('0.12', '0.25')}`
      }}
    >
      {config.label}
    </span>
  );
};

export { PassFail };
export type { PassFailProps };
