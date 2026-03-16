"use client";

import { ChevronDown, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { PhaseDefinition } from "./types";
import { sc } from "./utils";

interface PhaseCardProps {
  phase: PhaseDefinition;
  score: number;
  notes: string;
  onScore: (id: string, val: number) => void;
  onNotes: (id: string, val: string) => void;
  isOpen: boolean;
  onToggle: (id: string) => void;
}

export function PhaseCard({
  phase,
  score,
  notes,
  onScore,
  onNotes,
  isOpen,
  onToggle,
}: PhaseCardProps) {
  const pct = phase.maxPoints > 0 ? (score / phase.maxPoints) * 100 : 0;
  const color = sc(pct);

  return (
    <div className="phase-card">
      <div className="phase-card-header">
        <h3 className="phase-card-title">{phase.name}</h3>
        <button
          onClick={() => onToggle(phase.id)}
          className="phase-card-toggle"
        >
          {isOpen ? "Hide Rubric" : "Show Rubric"}
          <ChevronDown
            className={`phase-card-chevron ${isOpen ? "open" : ""}`}
            size={16}
          />
        </button>
      </div>

      <div className="phase-card-score-row">
        <input
          type="range"
          min={0}
          max={phase.maxPoints}
          step={1}
          value={score}
          onChange={(e) => onScore(phase.id, parseInt(e.target.value))}
          className="phase-card-slider"
          style={{ accentColor: color }}
        />
        <span className="phase-card-score" style={{ color }}>
          {score}
          <span className="phase-card-max">/{phase.maxPoints}</span>
        </span>
      </div>

      {isOpen && (
        <div className="phase-card-rubric">
          <div className="rubric-section rubric-great">
            <p className="rubric-title">What great looks like</p>
            {phase.great.map((t, i) => (
              <div key={i} className="rubric-item rubric-item-great">
                <CheckCircle size={14} /> {t}
              </div>
            ))}
          </div>
          <div className="rubric-section rubric-mistakes">
            <p className="rubric-title">Common mistakes</p>
            {phase.mistakes.map((t, i) => (
              <div key={i} className="rubric-item rubric-item-mistake">
                <XCircle size={14} /> {t}
              </div>
            ))}
          </div>
        </div>
      )}

      {phase.callout && isOpen && (
        <div className="phase-card-callout">
          <AlertCircle size={16} />
          <p>{phase.callout}</p>
        </div>
      )}

      <textarea
        value={notes}
        onChange={(e) => onNotes(phase.id, e.target.value)}
        placeholder="Add coaching notes..."
        rows={2}
        className="phase-card-notes"
      />
    </div>
  );
}
