"use client";

import { OUTCOMES } from "./constants";

interface CallDetailsProps {
  coachName: string;
  clientName: string;
  callDate: string;
  selectedOutcome: string | null;
  onCoachName: (v: string) => void;
  onClientName: (v: string) => void;
  onCallDate: (v: string) => void;
  onOutcome: (v: string) => void;
}

export function CallDetails({
  coachName,
  clientName,
  callDate,
  selectedOutcome,
  onCoachName,
  onClientName,
  onCallDate,
  onOutcome,
}: CallDetailsProps) {
  return (
    <div
      style={{
        marginTop: "24px",
        padding: "20px",
        background: "var(--color-bg-secondary)",
        borderRadius: "12px",
        border: "1px solid var(--color-border)",
      }}
    >
      <h3
        style={{
          fontSize: "14px",
          fontWeight: 600,
          marginBottom: "12px",
          color: "var(--color-text)",
        }}
      >
        Call Details
      </h3>
      <div className="grader-meta-grid">
        <div className="form-group compact">
          <input
            type="text"
            value={coachName}
            onChange={(e) => onCoachName(e.target.value)}
            placeholder="Coach name"
            aria-label="Coach name"
          />
        </div>
        <div className="form-group compact">
          <input
            type="text"
            value={clientName}
            onChange={(e) => onClientName(e.target.value)}
            placeholder="Client name"
            aria-label="Client name"
          />
        </div>
        <div className="form-group compact">
          <input
            type="date"
            value={callDate}
            onChange={(e) => onCallDate(e.target.value)}
            aria-label="Call date"
          />
        </div>
      </div>
      <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
        {OUTCOMES.map((o) => {
          const active = selectedOutcome === o;
          return (
            <button
              key={o}
              onClick={() => onOutcome(o)}
              style={{
                flex: 1,
                padding: "8px",
                fontSize: "12px",
                fontWeight: 500,
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: active
                  ? "var(--color-accent)"
                  : "var(--color-card)",
                color: active ? "white" : "var(--color-text-secondary)",
                cursor: "pointer",
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
