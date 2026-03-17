"use client";

import { Download, History, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ClinicBackground } from "@/components/clinic/ClinicBackgrounds";
import { ClinicIcon } from "@/components/clinic/ClinicIcon";
import type { GraderResultsModalProps } from "./types";

const scoreColorValue = (score: number) => (score >= 65 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444");

function ScoreBar({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return "#22c55e";
    if (s >= 65) return "#84cc16";
    if (s >= 50) return "#eab308";
    if (s >= 35) return "#f97316";
    return "#ef4444";
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
      <div style={{ flex: 1, background: "#2C2C31", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: getColor(score), borderRadius: "4px", transition: "width 0.8s ease" }} />
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 700, color: getColor(score), minWidth: "32px" }}>{score}</span>
    </div>
  );
}

function PassFail({ status }: { status: string }) {
  const normalized = status === "pass" || status === "fail" || status === "unknown" ? status : "unknown";
  const isPass = normalized === "pass";
  const isUnknown = normalized === "unknown";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "3px",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        background: isUnknown ? "rgba(148,163,184,0.12)" : isPass ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
        color: isUnknown ? "#94a3b8" : isPass ? "#22c55e" : "#ef4444",
        border: `1px solid ${isUnknown ? "rgba(148,163,184,0.25)" : isPass ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
      }}
    >
      {isUnknown ? "? UNKNOWN" : isPass ? "✓ PASS" : "✗ FAIL"}
    </span>
  );
}

export function GraderResultsModal({
  isOpen,
  onClose,
  result,
  inputData,
  onGeneratePDF,
  onViewHistory,
  badgeSrc,
  badgeAlt,
  title = "Sales Call Scorecard",
  subtitle = "Performance summary, strengths, and phase diagnostics",
}: GraderResultsModalProps) {
  const card = "#242428";
  const cardSoft = "#2C2C31";
  const border = "#35353A";
  const textPrimary = "#F5F5F7";
  const textSecondary = "#9A9AA0";
  const textMuted = "#6A6A70";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="grade-modal-overlay sales-modal-overlay clinic-pattern-overlay" onClick={onClose} style={{ position: "relative" }}>
          <ClinicBackground pattern="kpiTexture" opacity={0.04} />
          <motion.div
            className="grade-modal-container sales-modal-container clinic-pattern-kpi"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "980px", position: "relative", zIndex: 1 }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="grade-modal-header sales-modal-header">
              <button className="grade-modal-close" onClick={onClose} aria-label="Close modal">
                <X size={20} />
              </button>
              <div className="sales-modal-title-row">
                <img src={badgeSrc} alt={badgeAlt} className="grade-modal-badge sales-modal-badge" />
                <ClinicIcon name="growth" size={24} className="clinic-icon-hover" />
              </div>
              <h2 className="grade-modal-title">{title}</h2>
              <p className="grade-modal-subtitle">{subtitle}</p>
            </div>

            <div className="grade-modal-content sales-modal-content">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", fontSize: "12px" }}>
                  {[["Closer", inputData.coachName], ["Prospect", inputData.prospectName || inputData.clientName || "—"], ["Outcome", inputData.outcome || "—"], ["Program", inputData.program || "—"], ["Date", inputData.callDate || "—"]].map(([l, v]) => (
                    <span key={String(l)} style={{ padding: "4px 10px", background: card, border: `1px solid ${border}`, borderRadius: "4px", color: textSecondary }}>
                      <span style={{ color: textPrimary, fontWeight: 600 }}>{l}:</span> {v}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: "8px", padding: "20px", display: "flex", alignItems: "center", gap: "24px", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "88px",
                    height: "88px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: `conic-gradient(${scoreColorValue(result.score)} ${result.score * 3.6}deg, #1a1f2e ${result.score * 3.6}deg)`,
                  }}
                >
                  <div
                    style={{
                      width: "72px",
                      height: "72px",
                      borderRadius: "50%",
                      background: card,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "28px",
                      fontWeight: 800,
                      color: textPrimary,
                    }}
                  >
                    {result.score}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Overall Score</div>
                  {result.prospectSummary && <div style={{ fontSize: "13px", color: textSecondary, marginBottom: "10px" }}>{result.prospectSummary}</div>}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {result.strengths[0] && (
                      <div style={{ padding: "8px 12px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "5px" }}>
                        <span style={{ fontSize: "10px", color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Strength</span>
                        <div style={{ fontSize: "13px", color: textPrimary, marginTop: "2px" }}>{result.strengths[0]}</div>
                      </div>
                    )}
                    {result.improvements[0] && (
                      <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "5px" }}>
                        <span style={{ fontSize: "10px", color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Focus Area</span>
                        <div style={{ fontSize: "13px", color: textPrimary, marginTop: "2px" }}>{result.improvements[0]}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(result.deterministic || result.confidence) && (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: "8px", padding: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                  {result.deterministic && (
                    <div style={{ padding: "12px", background: cardSoft, borderRadius: "6px", border: `1px solid ${border}` }}>
                      <div style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Deterministic Breakdown</div>
                      <div style={{ fontSize: "13px", color: textPrimary }}>Weighted phase score: <strong>{result.deterministic.weightedPhaseScore}</strong></div>
                      <div style={{ fontSize: "13px", color: textPrimary }}>Penalty points: <strong>{result.deterministic.penaltyPoints}</strong></div>
                      <div style={{ fontSize: "13px", color: textPrimary }}>Unknown penalty: <strong>{result.deterministic.unknownPenalty}</strong></div>
                      <div style={{ fontSize: "13px", color: textPrimary }}>Overall score: <strong>{result.deterministic.overallScore}</strong></div>
                    </div>
                  )}
                  {result.confidence && (
                    <div style={{ padding: "12px", background: cardSoft, borderRadius: "6px", border: `1px solid ${border}` }}>
                      <div style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Confidence</div>
                      <div style={{ fontSize: "18px", color: textPrimary, fontWeight: 800, marginBottom: "6px" }}>{result.confidence.score}/100</div>
                      <div style={{ fontSize: "12px", color: textSecondary }}>
                        Evidence coverage {Math.round((result.confidence.evidenceCoverage || 0) * 100)}% · Quote verification {Math.round((result.confidence.quoteVerificationRate || 0) * 100)}% · Transcript quality {Math.round((result.confidence.transcriptQuality || 0) * 100)}%
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: "8px", padding: "20px", marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "16px" }}>Phase Breakdown</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {result.phaseScores.map((phase, idx) => (
                    <div key={`${phase.name}-${idx}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontSize: "13px", color: textPrimary, fontWeight: 600 }}>{phase.name}</span>
                        <span style={{ fontSize: "10px", color: textSecondary }}>{phase.weight ?? 0}% weight</span>
                      </div>
                      <ScoreBar score={phase.score} />
                      {phase.summary && <div style={{ fontSize: "12px", color: textSecondary, marginTop: "4px", lineHeight: 1.5 }}>{phase.summary}</div>}
                      {Array.isArray(phase.evidence) && phase.evidence.length > 0 && (
                        <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          {phase.evidence.slice(0, 3).map((quote, quoteIndex) => (
                            <div key={`${phase.name}-${quoteIndex}`} style={{ fontSize: "11px", color: textMuted, borderLeft: "2px solid rgba(88,166,255,0.25)", paddingLeft: "8px" }}>
                              &ldquo;{quote}&rdquo;
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {result.criticalBehaviors && result.criticalBehaviors.length > 0 && (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: "8px", padding: "20px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "16px" }}>Critical Behaviors</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {result.criticalBehaviors.map((behavior) => (
                      <div key={behavior.id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 12px", background: cardSoft, borderRadius: "5px" }}>
                        <div style={{ minWidth: "90px", paddingTop: "2px" }}><PassFail status={behavior.status} /></div>
                        <div>
                          <div style={{ fontSize: "13px", color: textPrimary, fontWeight: 600 }}>{behavior.name}</div>
                          <div style={{ fontSize: "12px", color: textSecondary, marginTop: "2px" }}>{behavior.note}</div>
                          {Array.isArray(behavior.evidence) && behavior.evidence.length > 0 && (
                            <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                            {behavior.evidence.slice(0, 2).map((quote, quoteIndex) => (
                              <div key={`${behavior.id}-${quoteIndex}`} style={{ fontSize: "11px", color: textMuted, borderLeft: "2px solid rgba(88,166,255,0.25)", paddingLeft: "8px" }}>
                                &ldquo;{quote}&rdquo;
                              </div>
                            ))}
                          </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.redFlags.length > 0 && (
                <div style={{ background: card, border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "20px", marginBottom: "16px" }}>
                  <h4 style={{ fontSize: "11px", color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <AlertCircle size={14} /> Red Flags ({result.redFlags.length})
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {result.redFlags.map((flag, idx) => (
                      <div key={idx} style={{ fontSize: "13px", color: textPrimary, padding: "8px 12px", background: "rgba(239,68,68,0.06)", borderRadius: "4px", borderLeft: "3px solid rgba(239,68,68,0.4)" }}>
                        {flag}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(result.strengths.length > 1 || result.improvements.length > 1) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  {result.strengths.length > 0 && (
                    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: "8px", padding: "16px" }}>
                      <div style={{ fontSize: "11px", color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "10px" }}>Strengths</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {result.strengths.map((s, i) => (
                          <div key={i} style={{ fontSize: "12px", color: textSecondary, paddingLeft: "10px", borderLeft: "2px solid rgba(34,197,94,0.3)" }}>{s}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.improvements.length > 0 && (
                    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: "8px", padding: "16px" }}>
                      <div style={{ fontSize: "11px", color: "#eab308", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "10px" }}>Areas for Improvement</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {result.improvements.map((imp, i) => (
                          <div key={i} style={{ fontSize: "12px", color: textSecondary, paddingLeft: "10px", borderLeft: "2px solid rgba(234,179,8,0.3)" }}>{imp}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {result.summary && (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: "8px", padding: "20px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "8px" }}>Summary</div>
                  <div style={{ fontSize: "13px", color: textSecondary, lineHeight: 1.6 }}>{result.summary}</div>
                </div>
              )}
            </div>

            <div className="grade-modal-footer sales-modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: `1px solid ${border}` }}>
              <button
                onClick={onViewHistory}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 16px", background: "transparent",
                  border: `1px solid ${border}`, borderRadius: "6px",
                  color: textSecondary, fontSize: "13px", fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <History size={14} /> History
              </button>
              <button
                onClick={onGeneratePDF}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 16px", background: "#58A6FF",
                  border: "none", borderRadius: "6px",
                  color: "#fff", fontSize: "13px", fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Download size={14} /> Export PDF
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
