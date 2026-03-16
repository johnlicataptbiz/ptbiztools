"use client";

import { RED_FLAGS } from "./constants";

interface RedFlagsPanelProps {
  flags: string[];
  onToggle: (id: string) => void;
}

export function RedFlagsPanel({ flags, onToggle }: RedFlagsPanelProps) {
  const totalDeduction = flags.reduce((sum, id) => {
    const f = RED_FLAGS.find((x) => x.id === id);
    return sum + (f ? f.deduction : 0);
  }, 0);

  return (
    <div className="redflags-panel">
      <h2 className="redflags-title">Red Flags</h2>
      <p className="redflags-subtitle">
        Check any critical errors. Deductions subtract from total.
      </p>

      {RED_FLAGS.map((f) => {
        const isOn = flags.includes(f.id);
        return (
          <div
            key={f.id}
            onClick={() => onToggle(f.id)}
            className={`redflag-item ${isOn ? "active" : ""}`}
          >
            <input
              type="checkbox"
              checked={isOn}
              readOnly
              className="redflag-checkbox"
              aria-label={f.label}
            />
            <div className="redflag-content">
              <span className="redflag-label">{f.label}</span>
              <span className={`redflag-deduction ${isOn ? "active" : ""}`}>
                {f.deduction}
              </span>
              <p className="redflag-desc">{f.desc}</p>
            </div>
          </div>
        );
      })}

      {flags.length > 0 && (
        <div className="redflags-total">
          <span>Total Red Flag Deductions</span>
          <span className="redflags-total-amount">{totalDeduction}</span>
        </div>
      )}
    </div>
  );
}
