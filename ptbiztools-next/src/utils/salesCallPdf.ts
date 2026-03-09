import { normalizeBehaviorStatus, type NormalizedGraderResult } from "@/components/danny/graderV2Helpers";

interface SalesPhaseDescriptor {
  id: string;
  name: string;
  weight: number;
}

interface SalesBehaviorDescriptor {
  id: string;
  name: string;
}

interface SalesReportMeta {
  closer?: string;
  prospectName?: string;
  outcome?: string;
  program?: string;
  date?: string;
}

export interface SalesCallPdfInput {
  meta: SalesReportMeta;
  result: NormalizedGraderResult;
  phases: SalesPhaseDescriptor[];
  criticalBehaviors: SalesBehaviorDescriptor[];
}

const COLORS = {
  ink: "#0f172a",
  muted: "#475569",
  border: "#cbd5e1",
  light: "#f8fafc",
  success: "#16a34a",
  warning: "#ca8a04",
  danger: "#dc2626",
  accent: "#1f6f94",
};

const sanitizeFilenamePart = (value: string) =>
  (value || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 48) || "Report";

const formatDate = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const scoreColor = (score: number) => (score >= 65 ? COLORS.success : score >= 50 ? COLORS.warning : COLORS.danger);

const percent = (value?: number) => `${Math.round((value || 0) * 100)}%`;

export async function generateSalesCallPdf(input: SalesCallPdfInput): Promise<string> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "letter" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 40;
  const lineHeight = 15;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed <= bottomLimit) return;
    doc.addPage();
    y = margin;
  };

  const writeWrapped = (
    text: string,
    opts?: { x?: number; size?: number; color?: string; style?: "normal" | "bold"; before?: number; after?: number; width?: number },
  ) => {
    if (!text) return;
    const x = opts?.x ?? margin;
    const width = opts?.width ?? contentWidth;
    const size = opts?.size ?? 10;
    const color = opts?.color ?? COLORS.ink;
    const style = opts?.style ?? "normal";
    const before = opts?.before ?? 0;
    const after = opts?.after ?? 6;
    y += before;
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(text, width);
    ensureSpace(lines.length * lineHeight + after);
    doc.text(lines, x, y);
    y += lines.length * lineHeight + after;
  };

  const writeSectionTitle = (title: string) => {
    ensureSpace(28);
    doc.setDrawColor(COLORS.border);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;
    writeWrapped(title, { size: 12, style: "bold", color: COLORS.muted, after: 10 });
  };

  const drawInfoGrid = (items: Array<[string, string]>) => {
    const columns = 3;
    const gap = 8;
    const cardHeight = 34;
    const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
    const rows = Math.ceil(items.length / columns);
    ensureSpace(rows * (cardHeight + gap) + 4);

    items.forEach(([label, value], index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const x = margin + col * (cardWidth + gap);
      const boxY = y + row * (cardHeight + gap);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(COLORS.border);
      doc.roundedRect(x, boxY, cardWidth, cardHeight, 4, 4, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(COLORS.muted);
      doc.text(label.toUpperCase(), x + 7, boxY + 11);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(COLORS.ink);
      const clippedValue = value.length > 34 ? `${value.slice(0, 34)}…` : value;
      doc.text(clippedValue, x + 7, boxY + 24);
    });

    y += rows * (cardHeight + gap) + 4;
  };

  const drawCallout = (opts: { label: string; text: string; tone: "success" | "danger" | "accent" }) => {
    const color = opts.tone === "success" ? COLORS.success : opts.tone === "danger" ? COLORS.danger : COLORS.accent;
    const innerWidth = contentWidth - 16;
    const wrapped = doc.splitTextToSize(opts.text || "N/A", innerWidth - 8);
    const boxHeight = Math.max(36, 24 + wrapped.length * 11);
    ensureSpace(boxHeight + 8);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(COLORS.border);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 5, 5, "FD");

    doc.setFillColor(color);
    doc.rect(margin, y, 4, boxHeight, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(color);
    doc.text(opts.label.toUpperCase(), margin + 10, y + 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.ink);
    doc.text(wrapped, margin + 10, y + 26);

    y += boxHeight + 8;
  };

const writeEvidenceList = (quotes?: string[], fallback = "No direct evidence quotes captured.") => {
  const values = Array.isArray(quotes) ? quotes.filter(Boolean) : [];
  if (!values.length) {
    writeWrapped(fallback, { color: COLORS.muted, size: 9, x: margin + 12, width: contentWidth - 12, after: 6 });
    return;
  }
  // Show up to 5 evidence quotes for more depth
  values.slice(0, 5).forEach((quote, index) => {
    writeWrapped(`${index + 1}. "${quote}"`, {
      color: COLORS.muted,
      size: 8.5,
      x: margin + 12,
      width: contentWidth - 16,
      after: 3,
    });
  });
};

const drawScoreBar = (score: number, label: string) => {
  const barWidth = 120;
  const barHeight = 8;
  const filledWidth = (score / 100) * barWidth;
  
  // Background bar
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(margin, y, barWidth, barHeight, 2, 2, "F");
  
  // Filled portion
  doc.setFillColor(
    score >= 80 ? 22 : score >= 60 ? 202 : 220,
    score >= 80 ? 163 : score >= 60 ? 138 : 38,
    score >= 80 ? 74 : score >= 60 ? 4 : 38
  );
  doc.roundedRect(margin, y, filledWidth, barHeight, 2, 2, "F");
  
  // Score text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.ink);
  doc.text(`${score}/100`, margin + barWidth + 8, y + 6);
  
  // Label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(COLORS.muted);
  doc.text(label, margin + barWidth + 40, y + 6);
  
  y += 14;
};

  const { meta, result, phases, criticalBehaviors } = input;
  const score = result?.overall_score || 0;

  ensureSpace(110);
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, y, contentWidth, 78, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.setTextColor("#ffffff");
  doc.text("Sales Call Performance Report", margin + 16, y + 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("PT Biz - Deterministic Grading Export", margin + 16, y + 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(scoreColor(score));
  doc.text(String(score), pageWidth - margin - 16, y + 42, { align: "right" });
  doc.setFontSize(10);
  doc.setTextColor("#ffffff");
  doc.text("/100", pageWidth - margin - 16, y + 57, { align: "right" });
  y += 98;

  drawInfoGrid([
    ["Closer", meta.closer || "Unknown"],
    ["Prospect", meta.prospectName || "Unknown"],
    ["Program", meta.program || "Unknown"],
    ["Outcome", meta.outcome || "Unknown"],
    ["Date", formatDate(meta.date) || "Unknown"],
  ]);

  if (result.prospect_summary) {
    ensureSpace(60);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(COLORS.border);
    doc.roundedRect(margin, y, contentWidth, 44, 6, 6, "FD");
    writeWrapped(result.prospect_summary, { x: margin + 10, width: contentWidth - 20, size: 9, color: COLORS.muted, before: 16, after: 10 });
  }

  writeSectionTitle("Key Takeaways");
  drawCallout({
    label: "Top Strength",
    text: result.top_strength || "No strength provided.",
    tone: "success",
  });
  drawCallout({
    label: "Highest Leverage Improvement",
    text: result.top_improvement || "No improvement provided.",
    tone: "danger",
  });

  if (result.deterministic || result.confidence) {
    writeSectionTitle("Deterministic + Confidence");
    if (result.deterministic) {
      drawCallout({
        label: "Deterministic Breakdown",
        text: `Weighted phase ${result.deterministic.weightedPhaseScore}. Penalties ${result.deterministic.penaltyPoints}. Unknown penalty ${result.deterministic.unknownPenalty}. Final score ${result.deterministic.overallScore}.`,
        tone: "accent",
      });
    }
    if (result.confidence) {
      drawCallout({
        label: "Confidence Signal",
        text: `Confidence ${result.confidence.score}/100. Evidence coverage ${percent(result.confidence.evidenceCoverage)}. Quote verification ${percent(result.confidence.quoteVerificationRate)}. Transcript quality ${percent(result.confidence.transcriptQuality)}.`,
        tone: "accent",
      });
    }
  }

  writeSectionTitle("Phase Breakdown (with evidence)");
  
  // Add visual score summary at top
  ensureSpace(phases.length * 16 + 20);
  writeWrapped("Score Summary:", { size: 9, style: "bold", color: COLORS.muted, after: 8 });
  phases.forEach((phase) => {
    const phaseResult = result.phases?.[phase.id];
    if (phaseResult) {
      drawScoreBar(phaseResult.score, `${phase.name} (${phase.weight}%)`);
    }
  });
  y += 8;
  
  // Detailed phase breakdown with evidence
  writeWrapped("Detailed Analysis:", { size: 9, style: "bold", color: COLORS.muted, after: 8 });
  phases.forEach((phase) => {
    const phaseResult = result.phases?.[phase.id];
    if (!phaseResult) return;
    ensureSpace(90);
    
    // Phase header with score badge
    doc.setFillColor(scoreColor(phaseResult.score));
    doc.roundedRect(margin, y, 28, 18, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor("#ffffff");
    doc.text(String(phaseResult.score), margin + 14, y + 12, { align: "center" });
    
    doc.setTextColor(COLORS.ink);
    doc.setFontSize(11);
    doc.text(`${phase.name} (${phase.weight}%)`, margin + 36, y + 12);
    y += 26;
    
    // Summary with more context
    writeWrapped(phaseResult.summary || "No phase summary provided.", { 
      size: 9.5, 
      color: COLORS.muted, 
      x: margin + 8, 
      width: contentWidth - 16, 
      after: 6 
    });
    
    // Evidence section
    writeWrapped("Evidence from transcript:", { 
      size: 8.5, 
      style: "bold", 
      color: COLORS.muted, 
      x: margin + 8, 
      after: 4 
    });
    writeEvidenceList(phaseResult.evidence);
    y += 8;
  });

  writeSectionTitle("Critical Behaviors (with evidence)");
  criticalBehaviors.forEach((behavior) => {
    const behaviorResult = result.critical_behaviors?.[behavior.id];
    if (!behaviorResult) return;
    const status = normalizeBehaviorStatus(behaviorResult);
    const statusText = status === "pass" ? "PASS" : status === "fail" ? "FAIL" : "UNKNOWN";
    const statusColor = status === "pass" ? COLORS.success : status === "fail" ? COLORS.danger : COLORS.muted;
    ensureSpace(64);
    writeWrapped(`${behavior.name}: ${statusText}`, { size: 10, style: "bold", color: statusColor, after: 4 });
    writeWrapped(behaviorResult.note || "No behavior note provided.", { size: 9.5, color: COLORS.muted, x: margin + 8, width: contentWidth - 16, after: 5 });
    writeEvidenceList(behaviorResult.evidence, "No direct behavior evidence quotes captured.");
    y += 4;
  });

  if (result.qualityGate) {
    writeSectionTitle("Quality Gate");
    writeWrapped(
      `Accepted: ${result.qualityGate.accepted ? "Yes" : "No"}`,
      { size: 10, style: "bold", color: result.qualityGate.accepted ? COLORS.success : COLORS.danger, after: 4 },
    );
    if (Array.isArray(result.qualityGate.reasons) && result.qualityGate.reasons.length) {
      result.qualityGate.reasons.forEach((reason) => {
        writeWrapped(`• ${reason}`, { size: 9.5, color: COLORS.muted, x: margin + 8, width: contentWidth - 8, after: 4 });
      });
      y += 2;
    }
  }

  // Add scoring methodology section for transparency
  writeSectionTitle("Scoring Methodology");
  writeWrapped(
    "This report uses a deterministic 7-phase framework with weighted scoring:",
    { size: 9.5, color: COLORS.muted, after: 6 }
  );
  
  const methodology = [
    ["Connection (10%)", "Rapport, agenda, tone"],
    ["Discovery (25%)", "Facts, Feelings, Future - emotional depth"],
    ["Gap Creation (20%)", "Cost of inaction, math exercise"],
    ["Temperature Check (10%)", "Readiness gauging"],
    ["Solution (15%)", "Personal story, calibration"],
    ["Close (15%)", "Ask, objections, discount discipline"],
    ["Follow-up (5%)", "Clean exit, next steps"],
  ];
  
  methodology.forEach(([phase, desc]) => {
    writeWrapped(`• ${phase}: ${desc}`, { 
      size: 8.5, 
      color: COLORS.muted, 
      x: margin + 8, 
      width: contentWidth - 16, 
      after: 3 
    });
  });
  
  y += 4;
  writeWrapped(
    "Score Ranges: 90-100 Exceptional | 70-89 Good | 50-69 Average | 30-49 Below Average | 0-29 Poor",
    { size: 8.5, style: "bold", color: COLORS.muted, after: 6 }
  );

  if (result.diagnostics) {
    writeSectionTitle("Diagnostics");
    writeWrapped(
      `Verified quotes: ${result.diagnostics.verifiedQuotes || 0} / ${result.diagnostics.totalQuotes || 0}`,
      { size: 9.5, color: COLORS.muted, after: 4 },
    );
    const badQuotes = Array.isArray(result.diagnostics.unverifiedQuotes) ? result.diagnostics.unverifiedQuotes.slice(0, 5) : [];
    if (badQuotes.length) {
      badQuotes.forEach((quote) => {
        writeWrapped(`• ${quote}`, { size: 9, color: COLORS.muted, x: margin + 8, width: contentWidth - 8, after: 4 });
      });
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let index = 1; index <= totalPages; index += 1) {
    doc.setPage(index);
    doc.setDrawColor(COLORS.border);
    doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.muted);
    doc.text("PT Biz Sales Grader - Deterministic Export", margin, pageHeight - 16);
    doc.text(`Page ${index} of ${totalPages}`, pageWidth - margin, pageHeight - 16, { align: "right" });
  }

  const dateSlug = meta.date ? meta.date.replace(/[^0-9-]/g, "") : new Date().toISOString().slice(0, 10);
  const prospectSlug = sanitizeFilenamePart(meta.prospectName || "Prospect");
  const filename = `Sales_Call_Report_${prospectSlug}_${dateSlug}.pdf`;
  doc.save(filename);
  return filename;
}
