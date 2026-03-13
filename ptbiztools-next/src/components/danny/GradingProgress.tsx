import React from 'react';
import type { DannyComponentProps } from './types';

interface GradingStage {
  title: string;
  detail: string;
}

const GRADING_PROGRESS_STAGES: GradingStage[] = [
  { title: "Parsing transcript context", detail: "Reading the full call and segmenting discovery phases." },
  { title: "Applying deterministic scoring", detail: "Weighting each phase and enforcing critical behavior rules." },
  { title: "Validating evidence quality", detail: "Checking quote support and transcript consistency gates." },
  { title: "Saving analysis + report metadata", detail: "Persisting this run for dashboard and analyses retrieval." },
];

interface GradingProgressProps extends DannyComponentProps {
  elapsed: number;
  loading: boolean;
}

const GradingProgress: React.FC<GradingProgressProps> = ({ elapsed, loading }) => {
  if (!loading) return null;

  const pulseDots = '.'.repeat((elapsed % 3) + 1);
  const stageIndex = Math.min(GRADING_PROGRESS_STAGES.length - 1, Math.floor(elapsed / 3));
  const activeStage = GRADING_PROGRESS_STAGES[stageIndex];
  const progressPct = Math.min(96, 14 + elapsed * 8);

  return (
    <div className="danny-grading-progress">
      <div className="progress-header">
        <span className="progress-title">
          Live Analysis{pulseDots}
        </span>
        <span className="progress-timer">
          {formatElapsed(elapsed)}
        </span>
      </div>
      <div className="progress-stage">
        <div className="stage-title">{activeStage.title}</div>
        <div className="stage-detail">{activeStage.detail}</div>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="progress-stages">
        {GRADING_PROGRESS_STAGES.map((stage, index) => {
          const isComplete = index < stageIndex;
          const isCurrent = index === stageIndex;
          return (
            <div 
              key={stage.title} 
              className={`progress-stage-item ${isCurrent ? 'current' : isComplete ? 'complete' : ''}`}
            >
              {isComplete ? '✓ ' : isCurrent ? '● ' : '○ '}
              {stage.title}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const formatElapsed = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export { GradingProgress };
export type { GradingProgressProps, GradingStage };
