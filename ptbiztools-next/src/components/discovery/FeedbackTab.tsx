"use client";

interface FeedbackTabProps {
  strengths: string;
  improvements: string;
  flagNotes: string;
  onStrengths: (v: string) => void;
  onImprovements: (v: string) => void;
  onFlagNotes: (v: string) => void;
}

export function FeedbackTab({
  strengths,
  improvements,
  flagNotes,
  onStrengths,
  onImprovements,
  onFlagNotes,
}: FeedbackTabProps) {
  return (
    <div className="feedback-tab">
      <div className="form-group">
        <label htmlFor="strengths-input">Strengths</label>
        <textarea
          id="strengths-input"
          value={strengths}
          onChange={(e) => onStrengths(e.target.value)}
          placeholder="What did the coach do well?"
          rows={4}
        />
      </div>
      <div className="form-group">
        <label htmlFor="improvements-input">Areas for Improvement</label>
        <textarea
          id="improvements-input"
          value={improvements}
          onChange={(e) => onImprovements(e.target.value)}
          placeholder="What should the coach work on?"
          rows={4}
        />
      </div>
      <div className="form-group">
        <label htmlFor="flag-notes-input">Red Flag Notes</label>
        <textarea
          id="flag-notes-input"
          value={flagNotes}
          onChange={(e) => onFlagNotes(e.target.value)}
          placeholder="Notes on any red flags observed..."
          rows={3}
        />
      </div>
    </div>
  );
}
