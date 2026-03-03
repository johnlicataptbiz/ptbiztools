// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
  extractTranscriptFromFile,
  logAction,
  ActionTypes,
  saveCoachingAnalysis,
  savePdfExport,
  gradeDannySalesCallV2,
} from "@/lib/ptbiz-api";
import {
  canSubmitByWordCount,
  getWordGateMessage,
  normalizeBehaviorStatus,
  normalizeV2Result,
} from "@/components/danny/graderV2Helpers";

const STORAGE_KEY = "ptbiz-call-grades";
const MIN_WORDS_REQUIRED = 120;

const PHASES = [
  { id: "connection", name: "Connection & Agenda", weight: 10, description: "Rapport building, agenda setting, tone establishment" },
  { id: "discovery", name: "Discovery", weight: 25, description: "Facts, Feelings, Future — emotional depth, not just KPIs" },
  { id: "gap_creation", name: "Gap Creation", weight: 20, description: "Cost of inaction, math exercise, skills gap identification" },
  { id: "temp_check", name: "Temperature Check", weight: 10, description: "Did they gauge readiness? Did they act on it appropriately?" },
  { id: "solution", name: "Solution Presentation", weight: 15, description: "Calibrated to prospect, personal story deployed, not a platform demo" },
  { id: "close", name: "Investment & Close", weight: 15, description: "Price presentation, objection handling, the ask, discount discipline" },
  { id: "followup", name: "Follow-Up / Wrap", weight: 5, description: "Clean exit, next steps scheduled, no lingering free consulting" },
];

const CRITICAL_BEHAVIORS = [
  { id: "free_consulting", name: "No Free Consulting", description: "Did NOT give away actionable advice before commitment" },
  { id: "discount_discipline", name: "Discount Discipline", description: "No unprompted concessions or ad-hoc discounts" },
  { id: "emotional_depth", name: "Emotional Depth", description: "Went beyond surface answers to uncover real feelings/fears" },
  { id: "time_management", name: "Time Management", description: "Call stayed under 60 min, didn't linger after clear 'no'" },
  { id: "personal_story", name: "Story Deployment", description: "Used personal or client transformation story effectively" },
];

const scoreColorValue = (score) => (score >= 65 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444");


function ScoreBar({ score, size = "md" }) {
  const getColor = (s) => {
    if (s >= 80) return "#22c55e";
    if (s >= 65) return "#84cc16";
    if (s >= 50) return "#eab308";
    if (s >= 35) return "#f97316";
    return "#ef4444";
  };
  const getLabel = (s) => {
    if (s >= 80) return "Strong";
    if (s >= 65) return "Solid";
    if (s >= 50) return "Needs Work";
    if (s >= 35) return "Weak";
    return "Critical";
  };
  const height = size === "lg" ? "10px" : "6px";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
      <div style={{ flex: 1, background: "var(--color-bg-secondary)", borderRadius: "4px", height, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: getColor(score), borderRadius: "4px", transition: "width 0.8s ease" }} />
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: size === "lg" ? "18px" : "13px", fontWeight: 700, color: getColor(score), minWidth: "32px" }}>{score}</span>
      {size === "lg" && <span style={{ fontSize: "11px", color: getColor(score), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{getLabel(score)}</span>}
    </div>
  );
}

function PassFail({ status }) {
  const normalized = status === "pass" || status === "fail" || status === "unknown" ? status : "unknown";
  const isPass = normalized === "pass";
  const isUnknown = normalized === "unknown";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 8px", borderRadius: "3px", fontSize: "11px", fontWeight: 700,
      letterSpacing: "0.05em", textTransform: "uppercase",
      background: isUnknown
        ? "rgba(148,163,184,0.12)"
        : isPass
          ? "rgba(34,197,94,0.12)"
          : "rgba(239,68,68,0.12)",
      color: isUnknown ? "#94a3b8" : isPass ? "#22c55e" : "#ef4444",
      border: `1px solid ${isUnknown ? "rgba(148,163,184,0.25)" : isPass ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`
    }}>
      {isUnknown ? "? UNKNOWN" : isPass ? "✓ PASS" : "✗ FAIL"}
    </span>
  );
}

export default function SalesCallGrader() {
  const [view, setView] = useState("grade"); // grade | results | history | report
  const [transcript, setTranscript] = useState("");
  const [chunks, setChunks] = useState([]);
  const [closer, setCloser] = useState("John");
  const [outcome, setOutcome] = useState("Won");
  const [program, setProgram] = useState("Rainmaker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [timePeriod, setTimePeriod] = useState("all"); // week | month | quarter | all
  const [reportData, setReportData] = useState(null); // for PDF export view
  const [prospectName, setProspectName] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null); // { name, type, text? }
  const [fileLoading, setFileLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsedHistory = JSON.parse(raw);
        const normalizedHistory = parsedHistory.map((entry) => ({
          ...entry,
          result: normalizeV2Result(entry.result),
        }));
        setHistory(normalizedHistory);
      }
    } catch (e) {
      console.error("Storage read error:", e);
    }
    setLoadingHistory(false);
  };

  const saveHistory = (newHistory) => {
    const normalizedHistory = newHistory.map((entry) => ({
      ...entry,
      result: normalizeV2Result(entry.result),
    }));
    setHistory(normalizedHistory);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedHistory));
    } catch (e) { console.error("Storage error:", e); }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setFileLoading(true);
    setError(null);
    try {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (ext === "docx" || ext === "doc") {
        setError("DOC/DOCX upload is not enabled in this tool. Please use PDF/TXT or paste transcript text.");
      } else {
        const extracted = await extractTranscriptFromFile(file);
        if (extracted.error || !extracted.text) {
          setError(extracted.error || "Failed to extract transcript text from file.");
        } else {
          setUploadedFile({ name: file.name, type: extracted.sourceType || "text", text: extracted.text });
          setTranscript("");
          setChunks([]);
          await logAction({
            actionType: ActionTypes.TRANSCRIPT_UPLOADED,
            description: `Uploaded transcript file: ${file.name}`,
            metadata: { sourceType: extracted.sourceType || "text", wordCount: extracted.wordCount || 0 },
            sessionId,
          });
        }
      }
    } catch (e) {
      console.error(e);
      setError("Failed to read file. Try pasting the transcript instead.");
    }
    setFileLoading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const clearFile = () => {
    setUploadedFile(null);
  };

  const getFullTranscript = () => {
    const all = [...chunks, transcript.trim()].filter(Boolean).join("\\n\\n");
    return all;
  };

  const addChunk = () => {
    if (transcript.trim()) {
      setChunks(prev => [...prev, transcript.trim()]);
      setTranscript("");
    }
  };

  const clearTranscript = () => {
    setChunks([]);
    setTranscript("");
  };

  const fullTranscript = getFullTranscript();
  const transcriptForValidation = uploadedFile?.text || fullTranscript;
  const totalWords = transcriptForValidation ? transcriptForValidation.split(/\s+/).filter(Boolean).length : 0;
  const meetsWordThreshold = canSubmitByWordCount(totalWords, MIN_WORDS_REQUIRED);

  const getTimeBoundary = (period) => {
    const now = new Date();
    if (period === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    if (period === "month") { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
    if (period === "quarter") { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
    return new Date(0);
  };

  const filteredHistory = history.filter(h => {
    const boundary = getTimeBoundary(timePeriod);
    return new Date(h.date) >= boundary;
  });

  const openReport = (entry) => {
    setReportData(entry);
    setView("report");
  };

  const downloadReport = () => {
    if (!reportData) return;
    const d = reportData.result;
    const scoreColor = (s) => s >= 65 ? "#16a34a" : s >= 50 ? "#ca8a04" : "#dc2626";

    const phaseRows = PHASES.map((phase, i) => {
      const p = d.phases[phase.id];
      if (!p) return "";
      return `<tr style="border-bottom:1px solid #e5e7eb;background:${i % 2 === 0 ? "transparent" : "#f9fafb"}">
        <td style="padding:10px 4px;font-weight:600;font-family:system-ui,sans-serif;vertical-align:top;white-space:nowrap">${phase.name} <span style="font-size:10px;color:#6b7280;font-weight:400">(${phase.weight}%)</span></td>
        <td style="padding:10px 4px;text-align:center;font-weight:800;font-family:system-ui,sans-serif;color:${scoreColor(p.score)};vertical-align:top">${p.score}</td>
        <td style="padding:10px 4px;color:#6b7280;vertical-align:top">${p.summary}</td>
      </tr>`;
    }).join("");

    const behaviorRows = CRITICAL_BEHAVIORS.map((b, i) => {
      const cb = d.critical_behaviors[b.id];
      if (!cb) return "";
      const status = normalizeBehaviorStatus(cb);
      const statusColor = status === "pass" ? "#16a34a" : status === "unknown" ? "#64748b" : "#dc2626";
      const statusText = status === "pass" ? "PASS" : status === "unknown" ? "UNKNOWN" : "FAIL";
      return `<tr style="border-bottom:1px solid #e5e7eb;background:${i % 2 === 0 ? "transparent" : "#f9fafb"}">
        <td style="padding:10px 4px;font-weight:600;font-family:system-ui,sans-serif;width:160px;vertical-align:top">${b.name}</td>
        <td style="padding:10px 4px;width:50px;vertical-align:top"><span style="font-family:system-ui,sans-serif;font-weight:800;font-size:12px;color:${statusColor}">${statusText}</span></td>
        <td style="padding:10px 4px;color:#6b7280;vertical-align:top">${cb.note}</td>
      </tr>`;
    }).join("");

    const detailItems = [["Closer", reportData.closer], ["Prospect", reportData.prospectName || "—"], ["Program", reportData.program], ["Outcome", reportData.outcome], ["Date", new Date(reportData.date).toLocaleDateString()]];
    const detailsHtml = detailItems.map(([l, v]) => `<div><span style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.05em">${l}</span><div style="font-weight:600;font-family:system-ui,sans-serif">${v}</div></div>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Call Report - ${reportData.closer} - ${new Date(reportData.date).toLocaleDateString()}</title>
<style>@media print{body{margin:0}}.page{max-width:700px;margin:0 auto;padding:40px;font-family:Georgia,'Times New Roman',serif;line-height:1.6;color:#111827}</style>
</head><body><div class="page">
<div style="border-bottom:2px solid #111827;padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start">
<div><h1 style="margin:0;font-size:22px;font-weight:700;font-family:system-ui,sans-serif;letter-spacing:-0.02em">Sales Call Performance Report</h1><p style="margin:4px 0 0;font-size:13px;color:#6b7280">PT Biz — Confidential</p></div>
<div style="font-size:36px;font-weight:800;font-family:system-ui,sans-serif;color:${scoreColor(d.overall_score)}">${d.overall_score}</div></div>
<div style="display:flex;gap:24px;margin-bottom:24px;font-size:14px;flex-wrap:wrap">${detailsHtml}</div>
${d.prospect_summary ? `<div style="padding:12px 16px;background:#f9fafb;border-radius:6px;margin-bottom:24px;font-size:13px;color:#6b7280;border-left:3px solid #e5e7eb">${d.prospect_summary}</div>` : ""}
<div style="margin-bottom:28px"><h2 style="font-size:15px;font-family:system-ui,sans-serif;font-weight:700;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">Key Takeaways</h2>
<div style="padding:10px 14px;border:1px solid rgba(22,163,74,0.2);border-radius:5px;border-left:3px solid #16a34a;margin-bottom:8px"><span style="font-size:10px;color:#16a34a;text-transform:uppercase;font-weight:700;font-family:system-ui,sans-serif">Top Strength</span><div style="font-size:14px;margin-top:2px">${d.top_strength}</div></div>
<div style="padding:10px 14px;border:1px solid rgba(220,38,38,0.2);border-radius:5px;border-left:3px solid #dc2626"><span style="font-size:10px;color:#dc2626;text-transform:uppercase;font-weight:700;font-family:system-ui,sans-serif">Highest Leverage Improvement</span><div style="font-size:14px;margin-top:2px">${d.top_improvement}</div></div></div>
<div style="margin-bottom:28px"><h2 style="font-size:15px;font-family:system-ui,sans-serif;font-weight:700;margin-bottom:14px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">Phase-by-Phase Breakdown</h2>
<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:2px solid #111827"><th style="text-align:left;padding:8px 4px;font-family:system-ui,sans-serif;font-weight:700">Phase</th><th style="text-align:center;padding:8px 4px;font-family:system-ui,sans-serif;font-weight:700;width:60px">Score</th><th style="text-align:left;padding:8px 4px;font-family:system-ui,sans-serif;font-weight:700">Assessment</th></tr></thead><tbody>${phaseRows}</tbody></table></div>
<div style="margin-bottom:28px"><h2 style="font-size:15px;font-family:system-ui,sans-serif;font-weight:700;margin-bottom:14px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">Critical Behaviors</h2>
<table style="width:100%;border-collapse:collapse;font-size:13px"><tbody>${behaviorRows}</tbody></table></div>
<div style="border-top:1px solid #e5e7eb;padding-top:12px;font-size:11px;color:#6b7280;display:flex;justify-content:space-between"><span>Generated ${new Date().toLocaleDateString()}</span><span>PT Biz Sales Performance System</span></div>
</div></body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Call_Report_${reportData.closer}_${new Date(reportData.date).toLocaleDateString().replace(/\\//g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const analyzeCall = async () => {
    const hasContent = transcriptForValidation && transcriptForValidation.trim();
    if (!hasContent) return;
    if (!meetsWordThreshold) {
      setError(`Transcript must be at least ${MIN_WORDS_REQUIRED} words before grading.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const transcriptText = transcriptForValidation;
      await logAction({
        actionType: ActionTypes.TRANSCRIPT_PASTED,
        description: "Prepared transcript for Danny sales call grading",
        metadata: { wordCount: (transcriptText || "").split(/\s+/).filter(Boolean).length },
        sessionId,
      });

      const graded = await gradeDannySalesCallV2({
        transcript: transcriptText,
        closer,
        outcome,
        program,
        prospectName: prospectName.trim() || undefined,
      });

      if (graded.error || !graded.data) {
        const reasonSuffix = graded.reasons?.length ? ` ${graded.reasons.join(" | ")}` : "";
        throw new Error((graded.error || "Failed to grade transcript.") + reasonSuffix);
      }

      const parsed = normalizeV2Result(graded.data);
      if (typeof parsed?.overall_score !== "number" || !parsed?.phases || !parsed?.critical_behaviors) {
        throw new Error("Grading response was incomplete.");
      }

      const entry = {
        id: Date.now(),
        date: new Date().toISOString(),
        closer,
        outcome,
        program,
        prospectName: prospectName.trim() || "Unknown",
        result: parsed,
      };

      const newHistory = [entry, ...history];
      saveHistory(newHistory);
      setResult(parsed);
      setView("results");
      setChunks([]);
      setTranscript("");
      setProspectName("");
      setUploadedFile(null);

      await logAction({
        actionType: ActionTypes.GRADE_GENERATED,
        description: `Danny sales grade generated: ${parsed.overall_score}/100`,
        metadata: { score: parsed.overall_score, tool: "sales_discovery_grader_danny_v2", model: parsed?.metadata?.model || "unknown" },
        sessionId,
      });

      const coachingSave = await saveCoachingAnalysis({
        sessionId,
        coachName: closer,
        clientName: prospectName.trim() || "Unknown",
        callDate: new Date().toISOString().slice(0, 10),
        grade: {
          score: parsed.overall_score,
          outcome,
          summary: `${parsed.top_strength || ""} ${parsed.top_improvement || ""}`.trim(),
          phaseScores: parsed.phases,
          strengths: parsed.top_strength ? [parsed.top_strength] : [],
          improvements: parsed.top_improvement ? [parsed.top_improvement] : [],
          redFlags: Object.entries(parsed.critical_behaviors || {})
            .filter(([, value]) => value && value.status === "fail")
            .map(([key]) => key),
          transcript: transcriptText,
          deidentifiedTranscript: parsed.storage?.redactedTranscript || transcriptText.slice(0, 20000),
          gradingVersion: "v2",
          deterministic: parsed.deterministic,
          criticalBehaviors: parsed.critical_behaviors,
          confidence: parsed.confidence?.score,
          qualityGate: parsed.qualityGate,
          evidence: {
            phases: parsed.phases,
            criticalBehaviors: parsed.critical_behaviors,
          },
          transcriptHash: parsed.storage?.transcriptHash,
        },
      });

      await savePdfExport({
        sessionId,
        coachingAnalysisId: coachingSave.analysisId,
        coachName: closer,
        clientName: prospectName.trim() || "Unknown",
        callDate: new Date().toISOString().slice(0, 10),
        score: parsed.overall_score,
        metadata: {
          tool: "sales_discovery_grader_danny_v2",
          outcome,
          program,
          confidence: parsed.confidence?.score ?? null,
        },
      });
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Analysis failed. Check that the transcript is readable and try again.";
      setError(message);
    }
    setLoading(false);
  };

  const deleteEntry = (id) => {
    const newHistory = history.filter(h => h.id !== id);
    saveHistory(newHistory);
    if (selectedHistory?.id === id) setSelectedHistory(null);
  };

  const clearAll = () => {
    saveHistory([]);
    setSelectedHistory(null);
  };

  const getCloserStats = (name, sourceHistory = null) => {
    const calls = (sourceHistory || history).filter(h => h.closer === name);
    if (!calls.length) return null;
    const avg = Math.round(calls.reduce((s, c) => s + c.result.overall_score, 0) / calls.length);
    const wins = calls.filter(c => c.outcome === "Won").length;
    const phaseAvgs = {};
    PHASES.forEach(p => {
      phaseAvgs[p.id] = Math.round(calls.reduce((s, c) => s + (c.result.phases[p.id]?.score || 0), 0) / calls.length);
    });
    const behaviorRates = {};
    CRITICAL_BEHAVIORS.forEach(b => {
      behaviorRates[b.id] = Math.round((calls.filter(c => c.result.critical_behaviors[b.id]?.pass).length / calls.length) * 100);
    });
    return { total: calls.length, avg, wins, phaseAvgs, behaviorRates };
  };

  const closerNames = [...new Set(filteredHistory.map(h => h.closer))];

  // Styles
  const bg = "var(--color-bg)";
  const card = "var(--color-card)";
  const cardSoft = "var(--color-bg-secondary)";
  const border = "var(--color-border)";
  const textPrimary = "var(--color-text)";
  const textSecondary = "var(--color-text-secondary)";
  const textMuted = "var(--color-text-muted)";
  const accent = "var(--accent)";

  const cardStyle = {
    background: card, border: `1px solid ${border}`, borderRadius: "8px", padding: "20px",
  };

  const btnBase = {
    border: "none", borderRadius: "6px", padding: "10px 20px", fontSize: "13px",
    fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.02em", transition: "all 0.15s ease",
  };

  const renderGradeView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          {[["Closer", closer, setCloser, ["John", "Toni", "Other"]],
            ["Outcome", outcome, setOutcome, ["Won", "Lost"]],
            ["Program", program, setProgram, ["Rainmaker", "Mastermind"]]
          ].map(([label, val, setter, opts]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{label}</span>
              <div style={{ display: "flex", gap: "2px", background: cardSoft, borderRadius: "5px", padding: "2px" }}>
                {opts.map(o => (
                  <button key={o} onClick={() => setter(o)} style={{
                    ...btnBase, padding: "6px 14px", fontSize: "12px",
                    background: val === o ? accent : "transparent",
                    color: val === o ? "#ffffff" : textSecondary,
                  }}>{o}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          marginBottom: "12px",
          padding: "8px 10px",
          border: `1px solid ${border}`,
          borderRadius: "5px",
          fontSize: "11px",
          color: textSecondary,
          background: "rgba(88,166,255,0.04)",
        }}>
          Closer and outcome are metadata only. Scoring is determined by transcript evidence and selected program profile.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <span style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Prospect</span>
          <input
            type="text"
            value={prospectName}
            onChange={e => setProspectName(e.target.value)}
            placeholder="Prospect name (optional)"
            style={{
                background: cardSoft, border: `1px solid ${border}`, borderRadius: "5px",
              padding: "6px 12px", color: textPrimary, fontSize: "12px",
              fontFamily: "'JetBrains Mono', monospace", outline: "none", width: "220px",
            }}
          />
        </div>
        {/* File Upload Zone */}
        {uploadedFile ? (
          <div style={{ marginBottom: "10px", padding: "14px 16px", background: "rgba(34,197,94,0.08)", border: `1px solid rgba(34,197,94,0.25)`, borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "13px", color: "#22c55e", fontWeight: 600 }}>📄 {uploadedFile.name}</span>
              <span style={{ fontSize: "12px", color: textSecondary, marginLeft: "10px" }}>
                {`${(uploadedFile.text || "").split(/\s+/).filter(Boolean).length.toLocaleString()} words extracted from ${uploadedFile.type?.toUpperCase() || "file"}`}
              </span>
            </div>
            <button onClick={clearFile} style={{ ...btnBase, padding: "4px 12px", fontSize: "11px", background: "transparent", color: textSecondary, border: `1px solid ${border}` }}>Remove</button>
          </div>
        ) : (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById("file-input").click()}
              style={{
                marginBottom: "10px", padding: "20px", border: `2px dashed ${border}`, borderRadius: "6px",
                textAlign: "center", cursor: "pointer", transition: "border-color 0.15s ease",
                background: "rgba(88,166,255,0.03)",
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = accent}
              onMouseOut={e => e.currentTarget.style.borderColor = border}
            >
              <input
                id="file-input"
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                style={{ display: "none" }}
                onChange={e => handleFileUpload(e.target.files?.[0])}
              />
              {fileLoading ? (
                <span style={{ fontSize: "13px", color: accent }}>Reading file...</span>
              ) : (
                <>
                  <div style={{ fontSize: "13px", color: textSecondary, marginBottom: "4px" }}>
                    Drop a file here or <span style={{ color: accent, fontWeight: 600 }}>click to upload</span>
                  </div>
                  <div style={{ fontSize: "11px", color: textSecondary }}>PDF, DOCX, or TXT — or paste the transcript below</div>
                </>
              )}
            </div>
            {chunks.length > 0 && (
              <div style={{ marginBottom: "10px", padding: "10px 14px", background: "rgba(88,166,255,0.08)", border: `1px solid rgba(88,166,255,0.2)`, borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: accent }}>
                  {chunks.length} {chunks.length === 1 ? "part" : "parts"} saved — {chunks.join(" ").split(/\\s+/).length.toLocaleString()} words so far
                </span>
                <button onClick={clearTranscript} style={{ ...btnBase, padding: "3px 10px", fontSize: "11px", background: "transparent", color: textSecondary, border: `1px solid ${border}` }}>Clear All</button>
              </div>
            )}
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder={chunks.length > 0 ? "Paste the next part of the transcript..." : "Or paste the transcript here..."}
              style={{
                width: "100%", minHeight: "180px", background: card, border: `1px solid ${border}`,
                borderRadius: "6px", padding: "16px", color: textPrimary, fontSize: "13px",
                fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6, resize: "vertical", outline: "none",
                boxSizing: "border-box",
              }}
            />
          </>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "12px", color: textSecondary }}>
              {uploadedFile ? "File ready" : totalWords > 0 ? `${totalWords.toLocaleString()} total words` : "Waiting for transcript..."}
            </span>
            <span style={{
              fontSize: "12px",
              color: meetsWordThreshold ? "#22c55e" : "#f59e0b",
              fontWeight: 600,
            }}>
              {getWordGateMessage(totalWords, MIN_WORDS_REQUIRED)}
            </span>
            {!uploadedFile && transcript.trim() && (
              <button onClick={addChunk} style={{ ...btnBase, padding: "6px 14px", fontSize: "12px", background: "rgba(88,166,255,0.12)", color: accent, border: `1px solid rgba(88,166,255,0.25)` }}>
                + Add Part
              </button>
            )}
          </div>
          <button
            onClick={analyzeCall}
            disabled={loading || !meetsWordThreshold}
            style={{
              ...btnBase, padding: "12px 32px", fontSize: "14px",
              background: loading || !meetsWordThreshold ? "#d7cebf" : accent,
              color: loading || !meetsWordThreshold ? textSecondary : "#ffffff",
            }}
          >
            {loading ? "Analyzing..." : "Grade This Call"}
          </button>
        </div>
        {error && <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "6px", color: "#ef4444", fontSize: "13px" }}>{error}</div>}
      </div>
    </div>
  );

  const renderResults = (data, meta = null) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {meta && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", fontSize: "12px" }}>
            {[["Closer", meta.closer], ["Prospect", meta.prospectName || "—"], ["Outcome", meta.outcome], ["Program", meta.program], ["Date", new Date(meta.date).toLocaleDateString()]].map(([l, v]) => (
              <span key={l} style={{ padding: "4px 10px", background: card, border: `1px solid ${border}`, borderRadius: "4px", color: textSecondary }}>
                <span style={{ color: textPrimary, fontWeight: 600 }}>{l}:</span> {v}
              </span>
            ))}
          </div>
          <button onClick={() => openReport(meta)} style={{ ...btnBase, padding: "6px 16px", fontSize: "11px", background: "rgba(88,166,255,0.12)", color: accent, border: `1px solid rgba(88,166,255,0.25)` }}>
            Export Report
          </button>
        </div>
      )}

      {/* Overall Score */}
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "24px" }}>
        <div style={{
          width: "88px", height: "88px", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          background: `conic-gradient(${scoreColorValue(data.overall_score)} ${data.overall_score * 3.6}deg, #1a1f2e ${data.overall_score * 3.6}deg)`,
        }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%", background: card,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'JetBrains Mono', monospace", fontSize: "28px", fontWeight: 800, color: textPrimary,
          }}>{data.overall_score}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Overall Score</div>
          {data.prospect_summary && <div style={{ fontSize: "13px", color: textSecondary, marginBottom: "10px" }}>{data.prospect_summary}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ padding: "8px 12px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "5px" }}>
              <span style={{ fontSize: "10px", color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Strength</span>
              <div style={{ fontSize: "13px", color: textPrimary, marginTop: "2px" }}>{data.top_strength}</div>
            </div>
            <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "5px" }}>
              <span style={{ fontSize: "10px", color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Focus Area</span>
              <div style={{ fontSize: "13px", color: textPrimary, marginTop: "2px" }}>{data.top_improvement}</div>
            </div>
          </div>
        </div>
      </div>

      {(data.deterministic || data.confidence) && (
        <div style={{ ...cardStyle, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          {data.deterministic && (
            <div style={{ padding: "12px", background: cardSoft, borderRadius: "6px", border: `1px solid ${border}` }}>
              <div style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Deterministic Breakdown</div>
              <div style={{ fontSize: "13px", color: textPrimary }}>Weighted phase score: <strong>{data.deterministic.weightedPhaseScore}</strong></div>
              <div style={{ fontSize: "13px", color: textPrimary }}>Penalty points: <strong>{data.deterministic.penaltyPoints}</strong></div>
              <div style={{ fontSize: "13px", color: textPrimary }}>Unknown penalty: <strong>{data.deterministic.unknownPenalty}</strong></div>
              <div style={{ fontSize: "13px", color: textPrimary }}>Overall score: <strong>{data.deterministic.overallScore}</strong></div>
            </div>
          )}
          {data.confidence && (
            <div style={{ padding: "12px", background: cardSoft, borderRadius: "6px", border: `1px solid ${border}` }}>
              <div style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Confidence</div>
              <div style={{ fontSize: "18px", color: textPrimary, fontWeight: 800, marginBottom: "6px" }}>{data.confidence.score}/100</div>
              <div style={{ fontSize: "12px", color: textSecondary }}>
                Evidence coverage {Math.round((data.confidence.evidenceCoverage || 0) * 100)}% ·
                Quote verification {Math.round((data.confidence.quoteVerificationRate || 0) * 100)}% ·
                Transcript quality {Math.round((data.confidence.transcriptQuality || 0) * 100)}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phase Scores */}
      <div style={cardStyle}>
        <div style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "16px" }}>Phase Breakdown</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {PHASES.map(phase => {
            const p = data.phases[phase.id];
            if (!p) return null;
            return (
              <div key={phase.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "13px", color: textPrimary, fontWeight: 600 }}>{phase.name}</span>
                  <span style={{ fontSize: "10px", color: textSecondary }}>{phase.weight}% weight</span>
                </div>
                <ScoreBar score={p.score} />
                <div style={{ fontSize: "12px", color: textSecondary, marginTop: "4px", lineHeight: 1.5 }}>{p.summary}</div>
                {Array.isArray(p.evidence) && p.evidence.length > 0 && (
                  <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {p.evidence.slice(0, 3).map((quote, quoteIndex) => (
                      <div key={`${phase.id}-${quoteIndex}`} style={{ fontSize: "11px", color: textMuted, borderLeft: "2px solid rgba(88,166,255,0.25)", paddingLeft: "8px" }}>
                        "{quote}"
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Critical Behaviors */}
      <div style={cardStyle}>
        <div style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "16px" }}>Critical Behaviors</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {CRITICAL_BEHAVIORS.map(b => {
            const cb = data.critical_behaviors[b.id];
            if (!cb) return null;
            const status = normalizeBehaviorStatus(cb);
            return (
              <div key={b.id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 12px", background: cardSoft, borderRadius: "5px" }}>
                <div style={{ minWidth: "90px", paddingTop: "2px" }}><PassFail status={status} /></div>
                <div>
                  <div style={{ fontSize: "13px", color: textPrimary, fontWeight: 600 }}>{b.name}</div>
                  <div style={{ fontSize: "12px", color: textSecondary, marginTop: "2px" }}>{cb.note}</div>
                  {Array.isArray(cb.evidence) && cb.evidence.length > 0 && (
                    <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      {cb.evidence.slice(0, 2).map((quote, quoteIndex) => (
                        <div key={`${b.id}-${quoteIndex}`} style={{ fontSize: "11px", color: textMuted, borderLeft: "2px solid rgba(88,166,255,0.25)", paddingLeft: "8px" }}>
                          "{quote}"
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderHistory = () => {
    if (loadingHistory) return <div style={{ color: textSecondary, textAlign: "center", padding: "40px" }}>Loading history...</div>;
    if (!history.length) return (
      <div style={{ ...cardStyle, textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: "15px", color: textSecondary, marginBottom: "8px" }}>No calls graded yet</div>
        <div style={{ fontSize: "12px", color: textSecondary }}>Grade your first call to start tracking performance.</div>
      </div>
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Time Period Filter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", gap: "2px", background: card, borderRadius: "5px", padding: "2px" }}>
            {[["week", "7 Days"], ["month", "30 Days"], ["quarter", "90 Days"], ["all", "All Time"]].map(([val, label]) => (
              <button key={val} onClick={() => setTimePeriod(val)} style={{
                ...btnBase, padding: "6px 14px", fontSize: "11px",
                background: timePeriod === val ? accent : "transparent",
                color: timePeriod === val ? "#ffffff" : textSecondary,
              }}>{label}</button>
            ))}
          </div>
          <span style={{ fontSize: "12px", color: textSecondary }}>
            {filteredHistory.length} call{filteredHistory.length !== 1 ? "s" : ""} {timePeriod !== "all" ? `in last ${timePeriod === "week" ? "7" : timePeriod === "month" ? "30" : "90"} days` : "total"}
          </span>
        </div>

        {/* Closer Summaries */}
        {closerNames.length > 0 && (
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {closerNames.map(name => {
              const stats = getCloserStats(name, filteredHistory);
              if (!stats) return null;
              const weakest = Object.entries(stats.phaseAvgs).sort((a, b) => a[1] - b[1])[0];
              const weakPhase = PHASES.find(p => p.id === weakest[0]);
              return (
                <div key={name} style={{ ...cardStyle, flex: "1 1 280px", minWidth: "280px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 700, color: textPrimary }}>{name}</span>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: "22px", fontWeight: 800,
                      color: stats.avg >= 65 ? "#22c55e" : stats.avg >= 50 ? "#eab308" : "#ef4444"
                    }}>{stats.avg}</span>
                  </div>
                  <div style={{ display: "flex", gap: "16px", marginBottom: "14px", fontSize: "12px", color: textSecondary }}>
                    <span>{stats.total} calls</span>
                    <span>{stats.wins}W / {stats.total - stats.wins}L</span>
                    <span>{Math.round((stats.wins / stats.total) * 100)}% close</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
                    {PHASES.map(phase => (
                      <div key={phase.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "10px", color: textSecondary, width: "80px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{phase.name.replace(" & ", "/")}</span>
                        <div style={{ flex: 1 }}><ScoreBar score={stats.phaseAvgs[phase.id]} size="sm" /></div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {CRITICAL_BEHAVIORS.map(b => (
                      <span key={b.id} style={{
                        fontSize: "10px", padding: "3px 7px", borderRadius: "3px",
                        background: stats.behaviorRates[b.id] >= 75 ? "rgba(34,197,94,0.1)" : stats.behaviorRates[b.id] >= 50 ? "rgba(234,179,8,0.1)" : "rgba(239,68,68,0.1)",
                        color: stats.behaviorRates[b.id] >= 75 ? "#22c55e" : stats.behaviorRates[b.id] >= 50 ? "#eab308" : "#ef4444",
                        border: `1px solid ${stats.behaviorRates[b.id] >= 75 ? "rgba(34,197,94,0.2)" : stats.behaviorRates[b.id] >= 50 ? "rgba(234,179,8,0.2)" : "rgba(239,68,68,0.2)"}`,
                      }}>{b.name}: {stats.behaviorRates[b.id]}%</span>
                    ))}
                  </div>
                  {weakPhase && (
                    <div style={{ marginTop: "12px", padding: "8px 10px", background: "rgba(239,68,68,0.06)", borderRadius: "4px", fontSize: "11px", color: "#ef4444" }}>
                      Weakest area: <strong>{weakPhase.name}</strong> (avg {weakest[1]})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Call Log */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Call Log</span>
            {history.length > 0 && (
              <button onClick={clearAll} style={{ ...btnBase, padding: "4px 12px", fontSize: "11px", background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                Clear All
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {filteredHistory.map(entry => (
              <div
                key={entry.id}
                style={{
                  display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px",
                  background: selectedHistory?.id === entry.id ? "rgba(30,118,143,0.12)" : "#f8f2e8",
                  border: `1px solid ${selectedHistory?.id === entry.id ? "rgba(88,166,255,0.3)" : "transparent"}`,
                  borderRadius: "5px", cursor: "pointer", transition: "all 0.1s ease",
                }}
                onClick={() => setSelectedHistory(selectedHistory?.id === entry.id ? null : entry)}
              >
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: "18px", fontWeight: 800, minWidth: "32px",
                  color: entry.result.overall_score >= 65 ? "#22c55e" : entry.result.overall_score >= 50 ? "#eab308" : "#ef4444",
                }}>{entry.result.overall_score}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "13px", color: textPrimary, fontWeight: 600 }}>{entry.closer}</span>
                  {entry.prospectName && entry.prospectName !== "Unknown" && (
                    <span style={{ fontSize: "12px", color: textSecondary, marginLeft: "6px" }}>→ {entry.prospectName}</span>
                  )}
                  <span style={{ fontSize: "11px", color: textSecondary, marginLeft: "8px" }}>{entry.program}</span>
                </div>
                <span style={{
                  fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "3px",
                  background: entry.outcome === "Won" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                  color: entry.outcome === "Won" ? "#22c55e" : "#ef4444",
                }}>{entry.outcome}</span>
                <span style={{ fontSize: "11px", color: textSecondary }}>{new Date(entry.date).toLocaleDateString()}</span>
                <button onClick={(e) => { e.stopPropagation(); openReport(entry); }} title="Export Report" style={{ ...btnBase, padding: "2px 8px", fontSize: "11px", background: "transparent", color: accent }}>⬇</button>
                <button onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }} style={{ ...btnBase, padding: "2px 8px", fontSize: "11px", background: "transparent", color: textSecondary }}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {selectedHistory && renderResults(selectedHistory.result, selectedHistory)}
      </div>
    );
  };

  // Printable Report View
  const renderReport = () => {
    if (!reportData) return null;
    const d = reportData.result;
    const rpt = {
      bg: "#ffffff", text: "#111827", muted: "#6b7280", green: "#16a34a", red: "#dc2626",
      yellow: "#ca8a04", border: "#e5e7eb", lightBg: "#f9fafb",
    };
    const scoreColor = (s) => s >= 65 ? rpt.green : s >= 50 ? rpt.yellow : rpt.red;

    return (
      <div>
        {/* Print button - hidden when printing */}
        <div className="no-print" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button onClick={downloadReport} style={{ ...btnBase, padding: "10px 24px", background: accent, color: "#ffffff" }}>
            Download Report
          </button>
          <button onClick={() => setView("history")} style={{ ...btnBase, padding: "10px 24px", background: "transparent", color: textSecondary, border: `1px solid ${border}` }}>
            Back to Dashboard
          </button>
        </div>

        {/* Printable report */}
        <div id="printable-report" style={{
          background: rpt.bg, color: rpt.text, padding: "40px", borderRadius: "8px",
          fontFamily: "Georgia, 'Times New Roman', serif", maxWidth: "700px", margin: "0 auto",
          lineHeight: 1.6,
        }}>

          {/* Header */}
          <div style={{ borderBottom: `2px solid ${rpt.text}`, paddingBottom: "16px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700, fontFamily: "system-ui, sans-serif", letterSpacing: "-0.02em" }}>
                  Sales Call Performance Report
                </h1>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: rpt.muted }}>PT Biz — Confidential</p>
              </div>
              <div style={{
                fontSize: "36px", fontWeight: 800, fontFamily: "system-ui, sans-serif",
                color: scoreColor(d.overall_score),
              }}>{d.overall_score}</div>
            </div>
          </div>

          {/* Call Details */}
          <div style={{ display: "flex", gap: "24px", marginBottom: "24px", fontSize: "14px", flexWrap: "wrap" }}>
            {[["Closer", reportData.closer], ["Prospect", reportData.prospectName || "—"], ["Program", reportData.program], ["Outcome", reportData.outcome], ["Date", new Date(reportData.date).toLocaleDateString()]].map(([l, v]) => (
              <div key={l}>
                <span style={{ color: rpt.muted, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</span>
                <div style={{ fontWeight: 600, fontFamily: "system-ui, sans-serif" }}>{v}</div>
              </div>
            ))}
          </div>

          {d.prospect_summary && (
            <div style={{ padding: "12px 16px", background: rpt.lightBg, borderRadius: "6px", marginBottom: "24px", fontSize: "13px", color: rpt.muted, borderLeft: `3px solid ${rpt.border}` }}>
              {d.prospect_summary}
            </div>
          )}

          {/* Key Takeaways */}
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "15px", fontFamily: "system-ui, sans-serif", fontWeight: 700, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: rpt.muted }}>Key Takeaways</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ padding: "10px 14px", border: `1px solid ${rpt.green}30`, borderRadius: "5px", borderLeft: `3px solid ${rpt.green}` }}>
                <span style={{ fontSize: "10px", color: rpt.green, textTransform: "uppercase", fontWeight: 700, fontFamily: "system-ui, sans-serif" }}>Top Strength</span>
                <div style={{ fontSize: "14px", marginTop: "2px" }}>{d.top_strength}</div>
              </div>
              <div style={{ padding: "10px 14px", border: `1px solid ${rpt.red}30`, borderRadius: "5px", borderLeft: `3px solid ${rpt.red}` }}>
                <span style={{ fontSize: "10px", color: rpt.red, textTransform: "uppercase", fontWeight: 700, fontFamily: "system-ui, sans-serif" }}>Highest Leverage Improvement</span>
                <div style={{ fontSize: "14px", marginTop: "2px" }}>{d.top_improvement}</div>
              </div>
            </div>
          </div>

          {/* Phase Breakdown */}
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "15px", fontFamily: "system-ui, sans-serif", fontWeight: 700, marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.05em", color: rpt.muted }}>Phase-by-Phase Breakdown</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${rpt.text}` }}>
                  <th style={{ textAlign: "left", padding: "8px 4px", fontFamily: "system-ui, sans-serif", fontWeight: 700 }}>Phase</th>
                  <th style={{ textAlign: "center", padding: "8px 4px", fontFamily: "system-ui, sans-serif", fontWeight: 700, width: "60px" }}>Score</th>
                  <th style={{ textAlign: "left", padding: "8px 4px", fontFamily: "system-ui, sans-serif", fontWeight: 700 }}>Assessment</th>
                </tr>
              </thead>
              <tbody>
                {PHASES.map((phase, i) => {
                  const p = d.phases[phase.id];
                  if (!p) return null;
                  return (
                    <tr key={phase.id} style={{ borderBottom: `1px solid ${rpt.border}`, background: i % 2 === 0 ? "transparent" : rpt.lightBg }}>
                      <td style={{ padding: "10px 4px", fontWeight: 600, fontFamily: "system-ui, sans-serif", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        {phase.name}
                        <span style={{ fontSize: "10px", color: rpt.muted, fontWeight: 400, marginLeft: "4px" }}>({phase.weight}%)</span>
                      </td>
                      <td style={{ padding: "10px 4px", textAlign: "center", fontWeight: 800, fontFamily: "system-ui, sans-serif", color: scoreColor(p.score), verticalAlign: "top" }}>
                        {p.score}
                      </td>
                      <td style={{ padding: "10px 4px", color: rpt.muted, verticalAlign: "top" }}>{p.summary}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Critical Behaviors */}
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "15px", fontFamily: "system-ui, sans-serif", fontWeight: 700, marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.05em", color: rpt.muted }}>Critical Behaviors</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <tbody>
                {CRITICAL_BEHAVIORS.map((b, i) => {
                  const cb = d.critical_behaviors[b.id];
                  if (!cb) return null;
                  const status = normalizeBehaviorStatus(cb);
                  return (
                    <tr key={b.id} style={{ borderBottom: `1px solid ${rpt.border}`, background: i % 2 === 0 ? "transparent" : rpt.lightBg }}>
                      <td style={{ padding: "10px 4px", fontWeight: 600, fontFamily: "system-ui, sans-serif", width: "160px", verticalAlign: "top" }}>{b.name}</td>
                      <td style={{ padding: "10px 4px", width: "50px", verticalAlign: "top" }}>
                        <span style={{
                          fontFamily: "system-ui, sans-serif", fontWeight: 800, fontSize: "12px",
                          color: status === "pass" ? rpt.green : status === "unknown" ? rpt.muted : rpt.red,
                        }}>{status === "pass" ? "PASS" : status === "unknown" ? "UNKNOWN" : "FAIL"}</span>
                      </td>
                      <td style={{ padding: "10px 4px", color: rpt.muted, verticalAlign: "top" }}>{cb.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ borderTop: `1px solid ${rpt.border}`, paddingTop: "12px", fontSize: "11px", color: rpt.muted, display: "flex", justifyContent: "space-between" }}>
            <span>Generated {new Date().toLocaleDateString()}</span>
            <span>PT Biz Sales Performance System</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: bg, minHeight: "100vh", color: textPrimary,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body, html { background: white !important; }
          #printable-report { box-shadow: none !important; border-radius: 0 !important; padding: 20px !important; }
        }
      `}</style>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "24px 20px" }}>
        {/* Header */}
        <div className="no-print" style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>
              PT Biz Call Grader
            </h1>
            <span style={{ fontSize: "10px", padding: "2px 8px", background: accent, color: "#ffffff", borderRadius: "3px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
              v1.0
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: textSecondary }}>
            Score calls against the 7-phase framework. Track closer performance over time.
          </p>
        </div>

        {/* Nav */}
        <div className="no-print" style={{ display: "flex", gap: "2px", marginBottom: "20px", background: card, borderRadius: "6px", padding: "3px", width: "fit-content" }}>
          {[["grade", "Grade Call"], ["results", "Last Result"], ["history", "Dashboard"], ["report", "Report"]].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              disabled={(v === "results" && !result) || (v === "report" && !reportData)}
              style={{
                ...btnBase, padding: "8px 18px", fontSize: "12px",
                background: view === v ? accent : "transparent",
                color: view === v ? "#ffffff" : ((v === "results" && !result) || (v === "report" && !reportData)) ? textMuted : textSecondary,
              }}
            >{label}</button>
          ))}
        </div>

        {/* Content */}
        {view === "grade" && renderGradeView()}
        {view === "results" && result && renderResults(result, history.length > 0 ? history[0] : null)}
        {view === "history" && renderHistory()}
        {view === "report" && renderReport()}
      </div>
    </div>
  );
}
