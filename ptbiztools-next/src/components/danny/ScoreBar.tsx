import React from 'react';
import { DannyColors } from './theme';
import type { DannyComponentProps } from './types';

interface ScoreBarProps extends DannyComponentProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

const ScoreBar: React.FC<ScoreBarProps> = ({ score, size = 'md', className = '' }) => {
  const getColor = (s: number): string => {
    const colors = DannyColors.score;
    return s >= 80 ? colors.strong : s >= 65 ? colors.good : s >= 50 ? colors.okay : s >= 35 ? colors.weak : colors.critical;
  };

  const getLabel = (s: number): string => {
    return s >= 80 ? 'Strong' : s >= 65 ? 'Solid' : s >= 50 ? 'Needs Work' : s >= 35 ? 'Weak' : 'Critical';
  };

  const height = size === 'lg' ? '10px' : size === 'md' ? '8px' : '6px';

  return (
    <div className={`danny-scorebar ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
      <div style={{ 
        flex: 1, 
        background: DannyColors.surface, 
        borderRadius: '4px', 
        height, 
        overflow: 'hidden' 
      }}>
        <div style={{ 
          width: `${score}%`, 
          height: '100%', 
          background: getColor(score), 
          borderRadius: '4px', 
          transition: 'width 0.8s ease' 
        }} />
      </div>
      <span style={{ 
        fontFamily: "'JetBrains Mono', monospace", 
        fontSize: size === 'lg' ? '18px' : size === 'md' ? '14px' : '13px', 
        fontWeight: 700, 
        color: getColor(score), 
        minWidth: '32px' 
      }}>
        {score}
      </span>
      {size === 'lg' && (
        <span style={{ 
          fontSize: '11px', 
          color: getColor(score), 
          fontWeight: 600, 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em' 
        }}>
          {getLabel(score)}
        </span>
      )}
    </div>
  );
};

export { ScoreBar };
export type { ScoreBarProps };
