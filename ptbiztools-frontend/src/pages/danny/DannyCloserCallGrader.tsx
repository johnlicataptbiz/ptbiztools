// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { extractTranscriptFromFile, logAction, ActionTypes, saveCoachingAnalysis, savePdfExport } from "../../services/api";
import { gradeTranscript } from "../../utils/grader";

const STORAGE_KEY = "ptbiz-call-grades";

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

const SYSTEM_PROMPT = `You are a sales call analyst for PT Biz, a physical therapy business coaching company. You grade sales call transcripts against a specific 7-phase framework.

SCORING FRAMEWORK (each phase scored 0-100):

1. CONNECTION & AGENDA (Weight: 10%)
- Did the closer build genuine rapport in 3-5 minutes?
- Was the agenda clearly set?
- Did the prospect feel comfortable and heard from the start?

2. DISCOVERY (Weight: 25%) — THIS IS THE MOST IMPORTANT PHASE
- Did they get the FACTS? (revenue, sessions, evals, overhead, team size, years in business)
- Did they get the FEELINGS? When the prospect shared stress, fear, overwhelm — did the closer go DEEPER or move on? Saying "sure" or "yeah" and moving to the next question = low score. Asking "what does that look like day to day?" or "how is that affecting things at home?" = high score.
- Did they explore the FUTURE? What does the prospect want? Why does it matter to them personally?
- A closer who gets all the numbers but misses the emotion scores no higher than 60 here.

3. GAP CREATION (Weight: 20%)
- Did they help the prospect see the gap between where they are and where they want to be?
- Did they quantify the cost of staying stuck? (Math exercise: "If you stay at $15K/mo for another year, that's $180K you're leaving on the table")
- Did they identify skill gaps the prospect can't solve alone?

4. TEMPERATURE CHECK (Weight: 10%)
- Did they explicitly or clearly gauge the prospect's readiness/interest level?
- If the prospect was cold (below 5/10), did they adjust strategy or wrap up?
- If no temperature check happened, this scores low automatically.

5. SOLUTION PRESENTATION (Weight: 15%)
- Was the presentation calibrated to the prospect's specific situation, or generic?
- Did they deploy a personal ownership story or relevant client transformation story?
- Did they focus on outcomes and transformation, or just features and platform demos?
- A walkthrough of the platform/course without tying it to the prospect's specific pain = low score.

6. INVESTMENT & CLOSE (Weight: 15%)
- Was the price presented confidently?
- How was objection handling? (Acknowledge → Isolate → Resolve → Re-ask)
- DISCOUNT DISCIPLINE: Did they offer unprompted discounts? Did they cave at first pushback? Offering a discount to someone who was already buying = major deduction.
- Did they actually ASK for the sale clearly?

7. FOLLOW-UP / WRAP (Weight: 5%)
- If the prospect said yes: clean onboarding, next steps
- If the prospect said no: did they schedule a specific follow-up or just let them drift?
- CRITICAL: Did they give away free consulting AFTER the prospect declined? (e.g., hiring advice, marketing tips, Amazon links for equipment). This is a major negative.

CRITICAL BEHAVIORS (Pass/Fail):
- No Free Consulting: Did they avoid giving actionable business advice before or after the prospect committed? Diagnosing the problem is fine. Handing over the solution is not.
- Discount Discipline: No unprompted concessions. Structured incentives (workshop waiver, etc.) are fine if presented early as a benefit, not reactively.
- Emotional Depth: Did they go below the surface when prospects shared feelings?
- Time Management: Call under 60 minutes. Did not spend 20+ minutes after a clear "no."
- Story Deployment: Used a personal or client transformation story effectively.

RESPONSE FORMAT — You MUST respond in valid JSON only, no other text:
{
  "phases": {
    "connection": { "score": 0-100, "summary": "2-3 sentence assessment" },
    "discovery": { "score": 0-100, "summary": "2-3 sentence assessment" },
    "gap_creation": { "score": 0-100, "summary": "2-3 sentence assessment" },
    "temp_check": { "score": 0-100, "summary": "2-3 sentence assessment" },
    "solution": { "score": 0-100, "summary": "2-3 sentence assessment" },
    "close": { "score": 0-100, "summary": "2-3 sentence assessment" },
    "followup": { "score": 0-100, "summary": "2-3 sentence assessment" }
  },
  "critical_behaviors": {
    "free_consulting": { "pass": true/false, "note": "brief explanation" },
    "discount_discipline": { "pass": true/false, "note": "brief explanation" },
    "emotional_depth": { "pass": true/false, "note": "brief explanation" },
    "time_management": { "pass": true/false, "note": "brief explanation" },
    "personal_story": { "pass": true/false, "note": "brief explanation" }
  },
  "overall_score": 0-100,
  "top_strength": "One sentence — the single best thing they did on this call",
  "top_improvement": "One sentence — the single highest-leverage thing to fix",
  "prospect_summary": "Brief: prospect name, business stage, revenue, program discussed"
}`;

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
      <div style={{ flex: 1, background: "#1a1f2e", borderRadius: "4px", height, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: getColor(score), borderRadius: "4px", transition: "width 0.8s ease" }} />
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: size === "lg" ? "18px" : "13px", fontWeight: 700, color: getColor(score), minWidth: "32px" }}>{score}</span>
      {size === "lg" && <span style={{ fontSize: "11px", color: getColor(score), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{getLabel(score)}</span>}
    </div>
  );
}

function PassFail({ pass }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 8px", borderRadius: "3px", fontSize: "11px", fontWeight: 700,
      letterSpacing: "0.05em", textTransform: "uppercase",
      background: pass ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
      color: pass ? "#22c55e" : "#ef4444",
      border: `1px solid ${pass ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`
    }}>
      {pass ? "✓ PASS" : "✗ FAIL"}
    </span>
  );
}

function normalizePhaseScore(phase) {
  if (!phase || !phase.maxScore) return 0;
  return Math.max(0, Math.min(100, Math.round((phase.score / phase.maxScore) * 100)));
}

function mapGradeToDannySchema(grade, transcriptText, meta) {
  const lookup = {};
  (grade.phaseScores || []).forEach((phase) => {
    lookup[phase.name] = normalizePhaseScore(phase);
  });

  const lower = (transcriptText || "").toLowerCase();
  const connection = Math.round(((lookup["Opening & Rapport"] || 0) + (lookup["Set the Scene / Take Control"] || 0)) / 2);
  const discovery = Math.round(((lookup["Discovery — Current State"] || 0) + (lookup["Discovery — Goals & Why"] || 0)) / 2);
  const solution = lookup["Value Presentation"] || 0;
  const close = lookup["The Close"] || 0;
  const objection = lookup["Objection Handling"] || 0;

  const tempCheck = /temperature|readiness|on a scale|1 to 10|out of ten/.test(lower) ? 80 : 45;
  const followup = /(next step|follow up|follow-up|scheduled|calendar|booked|check in)/.test(lower) ? 78 : 46;
  const gapCreation = Math.round((discovery + solution + objection) / 3);

  const phases = {
    connection: {
      score: connection,
      summary: connection >= 70 ? "Strong rapport and clear agenda control were demonstrated." : "Rapport or agenda control was inconsistent and needs tightening early in the call.",
    },
    discovery: {
      score: discovery,
      summary: discovery >= 70 ? "Discovery covered both facts and motivations with useful depth." : "Discovery stayed too surface-level and should go deeper on emotional stakes and urgency.",
    },
    gap_creation: {
      score: gapCreation,
      summary: gapCreation >= 70 ? "The conversation built a clear gap between current state and desired outcome." : "Gap creation was light; quantify cost of inaction and sharpen consequences.",
    },
    temp_check: {
      score: tempCheck,
      summary: tempCheck >= 70 ? "Readiness checks were present and handled appropriately." : "A clear readiness/temperature check was missing or underused.",
    },
    solution: {
      score: solution,
      summary: solution >= 70 ? "Solution framing was tied to the prospect’s specific context." : "Solution delivery felt generic and needs tighter personalization to stated pain/goals.",
    },
    close: {
      score: close,
      summary: close >= 70 ? "Close sequence was confident with clear next-step asks." : "Closing sequence needs a stronger ask and tighter objection resolution flow.",
    },
    followup: {
      score: followup,
      summary: followup >= 70 ? "Wrap-up and next-step commitments were cleanly handled." : "Follow-up commitments were weak or unclear at the end of the call.",
    },
  };

  const critical_behaviors = {
    free_consulting: {
      pass: !/(you should just|free advice|just do this|go do this)/.test(lower),
      note: /(you should just|free advice|just do this|go do this)/.test(lower)
        ? "Call included potential free-consulting language before commitment."
        : "No clear free-consulting behavior detected.",
    },
    discount_discipline: {
      pass: !/(discount|lower the price|special deal|cheaper|price cut)/.test(lower),
      note: /(discount|lower the price|special deal|cheaper|price cut)/.test(lower)
        ? "Discount language was detected and should be used with stricter guardrails."
        : "No obvious discount-discipline violations detected.",
    },
    emotional_depth: {
      pass: discovery >= 65,
      note: discovery >= 65
        ? "Discovery likely reached emotional context beyond surface facts."
        : "Emotional depth appears limited; add follow-up questions on impact and stakes.",
    },
    time_management: {
      pass: (transcriptText || "").split(/\s+/).length < 9000,
      note: (transcriptText || "").split(/\s+/).length < 9000
        ? "Transcript length suggests reasonable pacing."
        : "Transcript appears very long; tighten pacing and avoid over-extending low-intent calls.",
    },
    personal_story: {
      pass: /(story|client story|one of our clients|i went through|i had a client)/.test(lower),
      note: /(story|client story|one of our clients|i went through|i had a client)/.test(lower)
        ? "Personal/client story language was detected."
        : "No obvious personal story deployment detected.",
    },
  };

  return {
    phases,
    critical_behaviors,
    overall_score: grade.score,
    top_strength: grade.strengths?.[0] || "Solid foundation in key call flow elements.",
    top_improvement: grade.improvements?.[0] || "Tighten discovery and close sequencing.",
    prospect_summary: `${meta.prospectName || "Unknown Prospect"} | Program: ${meta.program} | Outcome: ${meta.outcome}`,
  };
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
      if (raw) setHistory(JSON.parse(raw));
    } catch (e) {
      console.error("Storage read error:", e);
    }
    setLoadingHistory(false);
  };

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
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
  const totalWords = fullTranscript ? fullTranscript.split(/\\s+/).length : 0;

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
      return `<tr style="border-bottom:1px solid #e5e7eb;background:${i % 2 === 0 ? "transparent" : "#f9fafb"}">
        <td style="padding:10px 4px;font-weight:600;font-family:system-ui,sans-serif;width:160px;vertical-align:top">${b.name}</td>
        <td style="padding:10px 4px;width:50px;vertical-align:top"><span style="font-family:system-ui,sans-serif;font-weight:800;font-size:12px;color:${cb.pass ? "#16a34a" : "#dc2626"}">${cb.pass ? "PASS" : "FAIL"}</span></td>
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
    const hasContent = (fullTranscript && fullTranscript.trim()) || uploadedFile;
    if (!hasContent) return;
    setLoading(true);
    setError(null);
    try {
      const transcriptText = uploadedFile?.text || fullTranscript;
      await logAction({
        actionType: ActionTypes.TRANSCRIPT_PASTED,
        description: "Prepared transcript for Danny sales call grading",
        metadata: { wordCount: (transcriptText || "").split(/\s+/).filter(Boolean).length },
        sessionId,
      });

      const grade = gradeTranscript(transcriptText);
      const parsed = mapGradeToDannySchema(grade, transcriptText, {
        closer,
        outcome,
        program,
        prospectName: prospectName.trim(),
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
        metadata: { score: parsed.overall_score, tool: "sales_discovery_grader_danny" },
        sessionId,
      });

      const coachingSave = await saveCoachingAnalysis({
        sessionId,
        coachName: closer,
        clientName: prospectName.trim() || "Unknown",
        callDate: new Date().toISOString().slice(0, 10),
        grade: {
          score: grade.score,
          outcome: grade.outcome,
          summary: grade.summary,
          phaseScores: grade.phaseScores,
          strengths: grade.strengths,
          improvements: grade.improvements,
          redFlags: grade.redFlags,
          deidentifiedTranscript: grade.deidentifiedTranscript,
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
          tool: "sales_discovery_grader_danny",
          outcome,
          program,
        },
      });
    } catch (e) {
      console.error(e);
      setError("Analysis failed. Check that the transcript is readable and try again.");
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
  const bg = "#0d1117";
  const card = "#161b22";
  const border = "#21262d";
  const textPrimary = "#e6edf3";
  const textSecondary = "#8b949e";
  const accent = "#58a6ff";

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
              <div style={{ display: "flex", gap: "2px", background: "#0d1117", borderRadius: "5px", padding: "2px" }}>
                {opts.map(o => (
                  <button key={o} onClick={() => setter(o)} style={{
                    ...btnBase, padding: "6px 14px", fontSize: "12px",
                    background: val === o ? accent : "transparent",
                    color: val === o ? "#0d1117" : textSecondary,
                  }}>{o}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <span style={{ fontSize: "11px", color: textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Prospect</span>
          <input
            type="text"
            value={prospectName}
            onChange={e => setProspectName(e.target.value)}
            placeholder="Prospect name (optional)"
            style={{
              background: "#0d1117", border: `1px solid ${border}`, borderRadius: "5px",
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
                width: "100%", minHeight: "180px", background: "#0d1117", border: `1px solid ${border}`,
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
            {!uploadedFile && transcript.trim() && (
              <button onClick={addChunk} style={{ ...btnBase, padding: "6px 14px", fontSize: "12px", background: "rgba(88,166,255,0.12)", color: accent, border: `1px solid rgba(88,166,255,0.25)` }}>
                + Add Part
              </button>
            )}
          </div>
          <button
            onClick={analyzeCall}
            disabled={loading || (!uploadedFile && totalWords === 0)}
            style={{
              ...btnBase, padding: "12px 32px", fontSize: "14px",
              background: loading || (!uploadedFile && totalWords === 0) ? "#21262d" : accent,
              color: loading || (!uploadedFile && totalWords === 0) ? textSecondary : "#0d1117",
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
          background: `conic-gradient(${data.overall_score >= 65 ? "#22c55e" : data.overall_score >= 50 ? "#eab308" : "#ef4444"} ${data.overall_score * 3.6}deg, #1a1f2e ${data.overall_score * 3.6}deg)`,
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
            return (
              <div key={b.id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 12px", background: "#0d1117", borderRadius: "5px" }}>
                <div style={{ minWidth: "70px", paddingTop: "2px" }}><PassFail pass={cb.pass} /></div>
                <div>
                  <div style={{ fontSize: "13px", color: textPrimary, fontWeight: 600 }}>{b.name}</div>
                  <div style={{ fontSize: "12px", color: textSecondary, marginTop: "2px" }}>{cb.note}</div>
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
                color: timePeriod === val ? "#0d1117" : textSecondary,
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
                  background: selectedHistory?.id === entry.id ? "rgba(88,166,255,0.08)" : "#0d1117",
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
          <button onClick={downloadReport} style={{ ...btnBase, padding: "10px 24px", background: accent, color: "#0d1117" }}>
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
                  return (
                    <tr key={b.id} style={{ borderBottom: `1px solid ${rpt.border}`, background: i % 2 === 0 ? "transparent" : rpt.lightBg }}>
                      <td style={{ padding: "10px 4px", fontWeight: 600, fontFamily: "system-ui, sans-serif", width: "160px", verticalAlign: "top" }}>{b.name}</td>
                      <td style={{ padding: "10px 4px", width: "50px", verticalAlign: "top" }}>
                        <span style={{
                          fontFamily: "system-ui, sans-serif", fontWeight: 800, fontSize: "12px",
                          color: cb.pass ? rpt.green : rpt.red,
                        }}>{cb.pass ? "PASS" : "FAIL"}</span>
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
            <span style={{ fontSize: "10px", padding: "2px 8px", background: accent, color: "#0d1117", borderRadius: "3px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
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
                color: view === v ? "#0d1117" : ((v === "results" && !result) || (v === "report" && !reportData)) ? "#30363d" : textSecondary,
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
