// @ts-nocheck
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
import { TOOL_BADGES } from "@/constants/tool-badges";
import { generateSalesCallPdf } from "@/utils/salesCallPdf";
import { toast } from "sonner";

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

const GRADING_PROGRESS_STAGES = [
  { title: "Parsing transcript context", detail: "Reading the full call and segmenting discovery phases." },
  { title: "Applying deterministic scoring", detail: "Weighting each phase and enforcing critical behavior rules." },
  { title: "Validating evidence quality", detail: "Checking quote support and transcript consistency gates." },
  { title: "Saving analysis + report metadata", detail: "Persisting this run for dashboard and analyses retrieval." },
];

const scoreColorValue = (score: number) => (score >= 65 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444");

const formatElapsed = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};


function ScoreBar({ score, size = "md" }: { score: number; size?: "md" | "lg" }) {
  const getColor = (s: number) => {
    if (s >= 80) return "#22c55e";
    if (s >= 65) return "#84cc16";
    if (s >= 50) return "#eab308";
    if (s >= 35) return "#f97316";
    return "#ef4444";
  };
  const getLabel = (s: number) => {
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

function PassFail({ status }: { status: string }) {
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

interface HistoryEntry {
  id: number;
  date: string;
  closer: string;
  outcome: string;
  program: string;
  prospectName: string;
  result: any;
}

interface UploadedFile {
  name: string;
  type: string;
  text: string;
}

export default function SalesCallGrader() {
  const [view, setView] = useState<"grade" | "results" | "history" | "report">("grade");
  const [transcript, setTranscript] = useState("");
  const [chunks, setChunks] = useState<string[]>([]);
  const [closer, setCloser] = useState("John");
  const [outcome, setOutcome] = useState<"Won" | "Lost">("Won");
  const [program, setProgram] = useState<"Rainmaker" | "Mastermind">("Rainmaker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [timePeriod, setTimePeriod] = useState<"week" | "month" | "quarter" | "all">("all");
  const [reportData, setReportData] = useState<HistoryEntry | null>(null);
  const [prospectName, setProspectName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);
  const [gradingElapsed, setGradingElapsed] = useState(0);
  const [gradingStageIndex, setGradingStageIndex] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (!loading) {
      setGradingElapsed(0);
      setGradingStageIndex(0);
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setGradingElapsed(elapsed);
      setGradingStageIndex(Math.min(GRADING_PROGRESS_STAGES.length - 1, Math.floor(elapsed / 3)));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loading]);

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

  // Detect subtitle format (VTT/SRT) that may confuse the AI
  const isSubtitleFormat = (text: string): boolean => {
    // Check for VTT/SRT timestamp patterns like "00:00:21.660 --> 00:00:22.810"
    const timestampPattern = /\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/;
    return timestampPattern.test(text);
  };

  const hasSubtitleFormat = transcriptForValidation && isSubtitleFormat(transcriptForValidation);

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

  const downloadReport = async () => {
    if (!reportData || exportingReport) return;
    const resultData = normalizeV2Result(reportData.result);
    if (!resultData) {
      toast.error("Unable to export report: result data is missing.");
      return;
    }

    setExportingReport(true);
    toast.loading("Preparing PDF report...", { id: "sales-report-export" });
    try {
      const fileName = await generateSalesCallPdf({
        meta: {
          closer: reportData.closer,
          prospectName: reportData.prospectName,
          outcome: reportData.outcome,
          program: reportData.program,
          date: reportData.date,
        },
        result: resultData,
        phases: PHASES.map((phase) => ({ id: phase.id, name: phase.name, weight: phase.weight })),
        criticalBehaviors: CRITICAL_BEHAVIORS.map((behavior) => ({ id: behavior.id, name: behavior.name })),
      });

      await savePdfExport({
        sessionId,
        coachName: reportData.closer || "Unknown",
        clientName: reportData.prospectName || "Unknown",
        callDate: reportData.date ? String(reportData.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
        score: resultData.overall_score,
        metadata: {
          tool: "sales_discovery_grader_danny_v2",
          source: "manual_report_export",
          outcome: reportData.outcome,
          program: reportData.program,
          confidence: resultData.confidence?.score ?? null,
          fileName,
        },
      });

      await logAction({
        actionType: ActionTypes.PDF_GENERATED,
        description: `Sales report PDF generated: ${resultData.overall_score}/100`,
        metadata: {
          score: resultData.overall_score,
          closer: reportData.closer,
          prospect: reportData.prospectName || "Unknown",
          source: "report_view",
        },
        sessionId,
      });

      toast.success("PDF downloaded.", { id: "sales-report-export" });
    } catch (exportError) {
      console.error(exportError);
      toast.error("Failed to generate report PDF.", { id: "sales-report-export" });
    } finally {
      setExportingReport(false);
    }
  };

  const analyzeCall = async () => {
    const hasContent = transcriptForValidation && transcriptForValidation.trim();
    if (!hasContent) return;
    if (!meetsWordThreshold) {
      setError(`Transcript must be at least ${MIN_WORDS_REQUIRED} words before grading.`);
      return;
    }

    // Diagnostic: Check for close section in transcript before grading
    const closeSectionIndicators = ['close', 'book', 'schedule', 'appointment', 'next step', 'follow up', 'investment', 'price', 'cost', 'payment', 'sign up', 'enroll'];
    const hasCloseSection = closeSectionIndicators.some(indicator => 
      transcriptForValidation.toLowerCase().includes(indicator)
    );
    
    // Check for end-of-call indicators
    const endIndicators = ['goodbye', 'bye', 'thank you', 'thanks', 'have a great', 'talk soon', 'see you', 'take care'];
    const hasEndIndicator = endIndicators.some(indicator => 
      transcriptForValidation.toLowerCase().includes(indicator)
    );

    console.log('[DannyCloserCallGrader] Pre-grading transcript diagnostics:', {
      charCount: transcriptForValidation.length,
      wordCount: transcriptForValidation.split(/\s+/).filter(Boolean).length,
      hasCloseSection,
      hasEndIndicator,
      last300Chars: transcriptForValidation.slice(-300),
    });

    // Warning for very long transcripts that might hit token limits
    const wordCount = transcriptForValidation.split(/\s+/).filter(Boolean).length;
    const ESTIMATED_TOKENS_PER_WORD = 1.3;
    const estimatedTokens = wordCount * ESTIMATED_TOKENS_PER_WORD;
    const MAX_SAFE_TOKENS = 12000; // Leave room for system prompt and response
    
    if (estimatedTokens > MAX_SAFE_TOKENS) {
      toast.warning(`Transcript is very long (~${Math.round(estimatedTokens)} tokens). This may cause truncation. Consider focusing on the most relevant sections.`, {
        duration: 8000,
        id: 'long-transcript-warning-danny',
      });
    }

    setLoading(true);
    setError(null);
    try {
      const transcriptText = transcriptForValidation;
      await logAction({
        actionType: ActionTypes.TRANSCRIPT_PASTED,
        description: "Prepared transcript for Danny sales call grading",
        metadata: { 
          wordCount: (transcriptText || "").split(/\s+/).filter(Boolean).length,
          estimatedTokens: Math.round(estimatedTokens),
          hasCloseSection,
          hasEndIndicator,
        },
        sessionId,
      });

      const graded = await gradeDannySalesCallV2({
        transcript: transcriptText, // NEVER truncate - full transcript
        closer,
        outcome,
        program,
        prospectName: prospectName.trim() || undefined,
        // Add metadata to help backend processing
        callMeta: {
          durationMinutes: Math.round(wordCount / 145), // ~145 words per minute
        },
      });

      if (graded.error || !graded.data) {
        const reasonSuffix = graded.reasons?.length ? ` ${graded.reasons.join(" | ")}` : "";
        throw new Error((graded.error || "Failed to grade transcript.") + reasonSuffix);
      }

      const parsed = normalizeV2Result(graded.data);
      if (typeof parsed?.overall_score !== "number" || !parsed?.phases || !parsed?.critical_behaviors) {
        throw new Error("Grading response was incomplete.");
      }

      // Diagnostic logging for close phase detection
      console.log('[DannyCloserCallGrader] Grading results:', {
        overallScore: parsed.overall_score,
        closePhaseScore: parsed.phases?.close?.score,
        closePhaseSummary: parsed.phases?.close?.summary,
        followupPhaseScore: parsed.phases?.followup?.score,
        transcriptLength: transcriptText.length,
        transcriptWordCount: transcriptText.split(/\s+/).filter(Boolean).length,
      });

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
          transcript: transcriptText, // NEVER truncate - send full transcript
          deidentifiedTranscript: parsed.storage?.redactedTranscript || transcriptText, // NEVER truncate
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
  const fontSans = "var(--font-brand-sans), system-ui, sans-serif";
  const gradingPulseDots = ".".repeat((gradingElapsed % 3) + 1);
  const gradingProgressPct = Math.min(96, 14 + gradingElapsed * 8);
  const activeGradingStage = GRADING_PROGRESS_STAGES[gradingStageIndex];

  const cardStyle = {
    background: card, border: `1px solid ${border}`, borderRadius: "8px", padding: "20px",
  };

  const btnBase = {
    border: "none", borderRadius: "6px", padding: "10px 20px", fontSize: "13px",
    fontWeight: 600, cursor: "pointer", fontFamily: fontSans,
    letterSpacing: "0.01em", transition: "all 0.15s ease",
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
                accept=".pdf,.txt,.md,.csv,.json,.rtf,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
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
                  <div style={{ fontSize: "11px", color: textSecondary }}>PDF, TXT, CSV, JSON, RTF, XLSX, PNG/JPG — or paste the transcript below</div>
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
            {loading ? "Analyzing Transcript..." : "Grade This Call"}
          </button>
        </div>
        {loading && (
          <div
            style={{
              marginTop: "12px",
              padding: "12px 14px",
              borderRadius: "8px",
              border: `1px solid color-mix(in oklab, ${accent} 38%, transparent)`,
              background: "color-mix(in oklab, var(--color-bg-secondary) 92%, var(--accent) 8%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: textSecondary, letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 700 }}>
                Live Analysis{gradingPulseDots}
              </span>
              <span style={{ fontSize: "12px", color: textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>
                {formatElapsed(gradingElapsed)}
              </span>
            </div>
            <div style={{ fontSize: "14px", color: textPrimary, fontWeight: 700, marginBottom: "4px" }}>
              {activeGradingStage.title}
            </div>
            <div style={{ fontSize: "12px", color: textSecondary, marginBottom: "10px" }}>
              {activeGradingStage.detail}
            </div>
            <div style={{ height: "6px", borderRadius: "999px", background: "color-mix(in oklab, var(--color-bg-secondary) 80%, black 20%)", overflow: "hidden", marginBottom: "10px" }}>
              <div
                style={{
                  width: `${gradingProgressPct}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background: `linear-gradient(90deg, ${accent}, color-mix(in oklab, ${accent} 65%, #ffffff 35%))`,
                  transition: "width 0.8s ease",
                }}
              />
            </div>
            <div style={{ display: "grid", gap: "6px", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
              {GRADING_PROGRESS_STAGES.map((stage, index) => {
                const isComplete = index < gradingStageIndex;
                const isCurrent = index === gradingStageIndex;
                return (
                  <div
                    key={stage.title}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: `1px solid ${isCurrent ? "color-mix(in oklab, var(--accent) 35%, transparent)" : "color-mix(in oklab, var(--color-border) 75%, transparent)"}`,
                      background: isCurrent ? "color-mix(in oklab, var(--accent) 14%, transparent)" : "color-mix(in oklab, var(--color-bg-secondary) 88%, transparent)",
                      fontSize: "11px",
                      color: isComplete ? "#22c55e" : isCurrent ? textPrimary : textSecondary,
                      fontWeight: isCurrent ? 700 : 600,
                    }}
                  >
                    {isComplete ? "✓ " : isCurrent ? "● " : "○ "}
                    {stage.title}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {hasSubtitleFormat && (
          <div style={{ marginTop: "12px", padding: "12px 14px", background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: "6px", color: "#eab308", fontSize: "13px" }}>
            <strong>⚠️ Subtitle format detected</strong>
            <p style={{ margin: "4px 0 0", fontSize: "12px" }}>
              Your transcript appears to be in VTT/SRT subtitle format with timestamps. 
              This may cause the AI to incorrectly interpret the call as ending early. 
              For best results, paste a plain text transcript without timestamps.
            </p>
          </div>
        )}
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
          <button
            onClick={downloadReport}
            disabled={exportingReport}
            style={{
              ...btnBase,
              padding: "10px 24px",
              background: exportingReport ? "#d7cebf" : accent,
              color: exportingReport ? textSecondary : "#ffffff",
            }}
          >
            {exportingReport ? "Preparing PDF..." : "Download PDF"}
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

          {(d.deterministic || d.confidence || d.qualityGate) && (
            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "15px", fontFamily: "system-ui, sans-serif", fontWeight: 700, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: rpt.muted }}>Deterministic + Confidence</h2>
              <div style={{ display: "grid", gap: "8px" }}>
                {d.deterministic && (
                  <div style={{ padding: "10px 12px", border: `1px solid ${rpt.border}`, borderRadius: "6px", background: rpt.lightBg, fontSize: "13px", color: rpt.muted }}>
                    Weighted phase score <strong style={{ color: rpt.text }}>{d.deterministic.weightedPhaseScore}</strong> · Penalty points <strong style={{ color: rpt.text }}>{d.deterministic.penaltyPoints}</strong> · Unknown penalty <strong style={{ color: rpt.text }}>{d.deterministic.unknownPenalty}</strong> · Final score <strong style={{ color: rpt.text }}>{d.deterministic.overallScore}</strong>
                  </div>
                )}
                {d.confidence && (
                  <div style={{ padding: "10px 12px", border: `1px solid ${rpt.border}`, borderRadius: "6px", background: rpt.lightBg, fontSize: "13px", color: rpt.muted }}>
                    Confidence <strong style={{ color: rpt.text }}>{d.confidence.score}/100</strong> · Evidence coverage <strong style={{ color: rpt.text }}>{Math.round((d.confidence.evidenceCoverage || 0) * 100)}%</strong> · Quote verification <strong style={{ color: rpt.text }}>{Math.round((d.confidence.quoteVerificationRate || 0) * 100)}%</strong> · Transcript quality <strong style={{ color: rpt.text }}>{Math.round((d.confidence.transcriptQuality || 0) * 100)}%</strong>
                  </div>
                )}
                {d.qualityGate && (
                  <div style={{ padding: "10px 12px", border: `1px solid ${rpt.border}`, borderRadius: "6px", background: rpt.lightBg, fontSize: "13px", color: rpt.muted }}>
                    Quality gate: <strong style={{ color: d.qualityGate.accepted ? rpt.green : rpt.red }}>{d.qualityGate.accepted ? "Accepted" : "Rejected"}</strong>
                    {Array.isArray(d.qualityGate.reasons) && d.qualityGate.reasons.length > 0 && (
                      <ul style={{ margin: "8px 0 0", paddingLeft: "18px" }}>
                        {d.qualityGate.reasons.map((reason, index) => (
                          <li key={`${reason}-${index}`} style={{ marginBottom: "2px" }}>{reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

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
            <div style={{ marginTop: "10px", display: "grid", gap: "8px" }}>
              {PHASES.map((phase) => {
                const p = d.phases[phase.id];
                if (!p || !Array.isArray(p.evidence) || p.evidence.length === 0) return null;
                return (
                  <div key={`${phase.id}-evidence`} style={{ padding: "9px 11px", border: `1px solid ${rpt.border}`, borderRadius: "6px", background: rpt.lightBg }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: rpt.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "5px" }}>{phase.name} evidence</div>
                    {p.evidence.slice(0, 3).map((quote, quoteIndex) => (
                      <div key={`${phase.id}-quote-${quoteIndex}`} style={{ fontSize: "12px", color: rpt.muted, marginBottom: "3px" }}>
                        "{quote}"
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
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
            <div style={{ marginTop: "10px", display: "grid", gap: "8px" }}>
              {CRITICAL_BEHAVIORS.map((behavior) => {
                const behaviorResult = d.critical_behaviors[behavior.id];
                if (!behaviorResult || !Array.isArray(behaviorResult.evidence) || behaviorResult.evidence.length === 0) return null;
                return (
                  <div key={`${behavior.id}-evidence`} style={{ padding: "9px 11px", border: `1px solid ${rpt.border}`, borderRadius: "6px", background: rpt.lightBg }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: rpt.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "5px" }}>{behavior.name} evidence</div>
                    {behaviorResult.evidence.slice(0, 2).map((quote, quoteIndex) => (
                      <div key={`${behavior.id}-quote-${quoteIndex}`} style={{ fontSize: "12px", color: rpt.muted, marginBottom: "3px" }}>
                        "{quote}"
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
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
      fontFamily: fontSans,
    }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body, html { background: white !important; }
          #printable-report { box-shadow: none !important; border-radius: 0 !important; padding: 20px !important; }
        }
      `}</style>
      <div className="tool-page" style={{ maxWidth: "1120px", margin: "0 auto", padding: "28px 20px" }}>
        {/* Header */}
        <div className="no-print tool-page-hero" style={{ marginBottom: "20px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="tool-page-badge" src={TOOL_BADGES.sales} alt="Sales Grader badge" />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "4px", flexWrap: "wrap" }}>
            <h1 className="tool-page-title" style={{ margin: 0 }}>
              PT Biz Call Grader
            </h1>
            <span style={{ fontSize: "11px", padding: "4px 10px", background: accent, color: "#ffffff", borderRadius: "999px", fontWeight: 700, fontFamily: fontSans }}>
              v1.0
            </span>
          </div>
          <p className="tool-page-subtitle" style={{ marginTop: "6px" }}>
            Score calls against the 7-phase framework. Track closer performance over time.
          </p>
        </div>

        {/* Nav */}
        <div className="no-print" style={{ display: "flex", gap: "2px", marginBottom: "20px", background: card, borderRadius: "10px", padding: "4px", width: "fit-content", border: `1px solid ${border}` }}>
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
