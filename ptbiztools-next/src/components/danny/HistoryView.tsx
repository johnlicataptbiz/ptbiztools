import React from 'react';
import type { HistoryEntry, DannyComponentProps } from './types';
import { ScoreBar } from './ScoreBar';

interface HistoryViewProps extends DannyComponentProps {
  history: HistoryEntry[];
  filteredHistory: HistoryEntry[];
  timePeriod: 'week' | 'month' | 'quarter' | 'all';
  onSetTimePeriod: (period: 'week' | 'month' | 'quarter' | 'all') => void;
  onSelectHistory: (entry: HistoryEntry | null) => void;
  selectedHistory: HistoryEntry | null;
  onClearAll: () => void;
  onDeleteEntry: (id: number) => void;
  onOpenReport: (entry: HistoryEntry) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({
  filteredHistory,
  timePeriod,
  onSetTimePeriod,
  selectedHistory,
  onSelectHistory,
  onClearAll,
  onDeleteEntry,
  onOpenReport,
  className = ''
}) => {
  if (!filteredHistory.length) {
    return (
      <div className={`danny-history-empty ${className}`}>
        <div className="empty-icon">📊</div>
        <div className="empty-title">No calls graded yet</div>
        <div className="empty-subtitle">Grade your first call to start tracking performance.</div>
      </div>
    );
  }

  const closerNames = [...new Set(filteredHistory.map(h => h.closer))];

  return (
    <div className={`danny-history-view ${className}`}>
      {/* Time Filter */}
      <div className="history-controls">
        <div className="time-filter">
          {(['week', 'month', 'quarter', 'all'] as const).map(period => (
            <button
              key={period}
              className={`filter-btn ${timePeriod === period ? 'active' : ''}`}
              onClick={() => onSetTimePeriod(period)}
            >
              {period === 'week' ? '7 Days' : period === 'month' ? '30 Days' : period === 'quarter' ? '90 Days' : 'All Time'}
            </button>
          ))}
        </div>
        <span className="history-count">
          {filteredHistory.length} call{filteredHistory.length !== 1 ? 's' : ''}
          {timePeriod !== 'all' && ` in last ${timePeriod === 'week' ? '7' : timePeriod === 'month' ? '30' : '90'} days`}
        </span>
      </div>

      {/* Closer Summaries */}
      {closerNames.map(name => {
        // Calculate stats for this closer
        const calls = filteredHistory.filter(h => h.closer === name);
        const avg = Math.round(calls.reduce((s, c) => s + c.result.overall_score, 0) / calls.length);
        // ... other stats calculation (implement getCloserStats from original)

        return (
          <div key={name} className="closer-card">
            {/* Closer stats card */}
            <div className="closer-header">
              <span>{name}</span>
              <span>{avg}</span>
            </div>
            {/* Phase bars and behavior badges */}
          </div>
        );
      })}

      {/* Call Log Table */}
      <div className="call-log-section">
        <div className="call-log-header">
          <span>Call Log</span>
          {filteredHistory.length > 0 && (
            <button onClick={onClearAll} className="clear-all-btn">
              Clear All
            </button>
          )}
        </div>
        <div className="call-log">
          {filteredHistory.map(entry => (
            <div
              key={entry.id}
              className={`call-log-row ${selectedHistory?.id === entry.id ? 'selected' : ''}`}
              onClick={() => onSelectHistory(selectedHistory?.id === entry.id ? null : entry)}
            >
              <ScoreBar score={entry.result.overall_score} size="sm" />
              <div className="call-details">
                <span className="closer-name">{entry.closer}</span>
                {entry.prospectName && entry.prospectName !== 'Unknown' && (
                  <span className="prospect-name">→ {entry.prospectName}</span>
                )}
                <span className="program">{entry.program}</span>
              </div>
              <span className={`outcome-badge ${entry.outcome.toLowerCase()}`}>
                {entry.outcome}
              </span>
              <span className="call-date">{new Date(entry.date).toLocaleDateString()}</span>
              <div className="call-actions">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenReport(entry);
                  }} 
                  title="Export Report"
                  className="action-btn export"
                >
                  ⬇
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteEntry(entry.id);
                  }} 
                  className="action-btn delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { HistoryView };
export type { HistoryViewProps };
