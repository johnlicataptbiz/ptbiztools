import type { GradeResult } from "@/utils/grader";
import { DISCOVERY_PDF_LOGO_WHITE_URL } from "@/constants/branding";

const COLORS = {
  dark: '#0b1220',
  accent: '#e94560',
  medium: '#2e86f5',
  lightBg: '#111827',
  green: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
  white: '#ffffff',
  lightGray: '#1f2937',
  textGray: '#cbd5f5',
  muted: '#94a3b8',
};

const LOGO_CACHE = new Map<string, string | null>();

function getScoreColor(score: number): string {
  if (score >= 80) return COLORS.green;
  if (score >= 60) return COLORS.amber;
  return COLORS.red;
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Exceptional';
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Decent';
  if (score >= 60) return 'Needs Work';
  return 'Significant Issues';
}

function sanitizeFilenamePart(value: string) {
  const normalized = value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48);
  return normalized || 'Report';
}

function formatReportDate(value: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read image blob'));
    reader.readAsDataURL(blob);
  });
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  if (LOGO_CACHE.has(url)) return LOGO_CACHE.get(url) || null;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Image request failed (${response.status})`);
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    LOGO_CACHE.set(url, dataUrl);
    return dataUrl;
  } catch (error) {
    console.warn('Unable to load PDF logo, falling back to text mark:', error);
    LOGO_CACHE.set(url, null);
    return null;
  }
}

export async function generatePDF(
  grade: GradeResult,
  coachName: string,
  clientName: string,
  callDate: string
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 20;
  const formattedCallDate = formatReportDate(callDate);
  const logoDataUrl = await loadImageDataUrl(DISCOVERY_PDF_LOGO_WHITE_URL);
  let y = 0;

  const drawHeader = (continuation = false) => {
    doc.setFillColor(COLORS.dark);
    doc.rect(0, 0, pageWidth, 46, 'F');

    doc.setTextColor(COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(continuation ? 16 : 21);
    doc.text(continuation ? 'Discovery Call Audit (continued)' : 'Discovery Call Audit', margin, continuation ? 18 : 22);

    if (logoDataUrl) {
      const logoWidth = 48;
      const logoHeight = 12;
      const logoX = pageWidth - margin - logoWidth;
      const logoY = 14;
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight, undefined, 'FAST');
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('PT Biz', pageWidth - margin, 22, { align: 'right' });
    }

    y = 54;
    doc.setTextColor(COLORS.muted);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const metaParts: string[] = [];
    if (clientName) metaParts.push(`Client: ${clientName}`);
    if (formattedCallDate) metaParts.push(`Call Date: ${formattedCallDate}`);
    if (coachName) metaParts.push(`Coach: ${coachName}`);
    doc.text(metaParts.join('  |  ') || 'PT Biz Discovery Call Report', margin, y);

    y += 7;
    doc.setDrawColor(COLORS.lightGray);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  };

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight <= bottomLimit) return;
    doc.addPage();
    drawHeader(true);
  };

  const drawSectionTitle = (title: string, color: string) => {
    ensureSpace(12);
    doc.setTextColor(color);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, margin, y);
    y += 7;
  };

  const drawBulletedList = (items: string[], bulletColor: string, emptyFallback: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    if (items.length === 0) {
      ensureSpace(7);
      doc.setTextColor(COLORS.muted);
      doc.text(emptyFallback, margin + 4, y);
      y += 6;
      return;
    }

    for (const item of items) {
      const lines = doc.splitTextToSize(item, contentWidth - 10);
      ensureSpace(lines.length * 4.8 + 4);
      doc.setTextColor(bulletColor);
      doc.text('•', margin + 1, y);
      doc.setTextColor(COLORS.textGray);
      doc.text(lines, margin + 5, y);
      y += lines.length * 4.8 + 2;
    }
  };

  const drawCard = (title: string, lines: string[], titleColor: string, bgColor = COLORS.lightBg) => {
    const content = lines.filter(Boolean);
    const lineHeight = 4.6;
    const height = 10 + content.length * lineHeight + 8;
    ensureSpace(height + 4);
    doc.setFillColor(bgColor);
    doc.setDrawColor(COLORS.lightGray);
    doc.roundedRect(margin, y, contentWidth, height, 3, 3, 'FD');
    doc.setTextColor(titleColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, margin + 6, y + 7);
    let cursorY = y + 12;
    doc.setTextColor(COLORS.textGray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    for (const line of content) {
      const parts = doc.splitTextToSize(line, contentWidth - 12);
      doc.text(parts, margin + 6, cursorY);
      cursorY += parts.length * lineHeight;
    }
    y += height + 6;
  };

  drawHeader(false);

  const scoreColor = getScoreColor(grade.score);
  const scoreBoxHeight = 44;
  const phaseBoxHeight = Math.max(44, grade.phaseScores.length * 5 + 11);
  const topBoxHeight = Math.max(scoreBoxHeight, phaseBoxHeight);

  ensureSpace(topBoxHeight + 10);

  doc.setFillColor(scoreColor);
  doc.roundedRect(margin, y, 52, scoreBoxHeight, 3, 3, 'F');

  doc.setTextColor(COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text(String(grade.score), margin + 26, y + 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text('/ 100', margin + 26, y + 29, { align: 'center' });
  doc.setFontSize(11);
  doc.text(getScoreLabel(grade.score), margin + 26, y + 37, { align: 'center' });

  const phaseX = margin + 58;
  const phaseWidth = pageWidth - margin - phaseX;
  doc.setDrawColor('#d8e0ec');
  doc.setFillColor('#0f172a');
  doc.roundedRect(phaseX, y, phaseWidth, phaseBoxHeight, 2, 2, 'FD');
  doc.setTextColor(COLORS.muted);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Phase Breakdown', phaseX + 3, y + 6);

  let rowY = y + 11;
  for (const phase of grade.phaseScores) {
    doc.setTextColor(COLORS.textGray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(phase.name, phaseX + 3, rowY);
    doc.setTextColor(COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.text(`${phase.score}/${phase.maxScore}`, phaseX + phaseWidth - 3, rowY, { align: 'right' });
    rowY += 5;
  }

  y += topBoxHeight + 8;
  drawSectionTitle('Executive Summary', COLORS.medium);
  doc.setTextColor(COLORS.textGray);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  const summaryLines = doc.splitTextToSize(grade.summary, contentWidth);
  ensureSpace(summaryLines.length * 5 + 4);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 3;

  doc.setDrawColor(COLORS.lightGray);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  drawSectionTitle("What's Working Well", COLORS.green);
  drawBulletedList(grade.strengths, COLORS.green, 'No strengths were detected from this transcript.');
  y += 4;

  drawSectionTitle('What Needs Work', COLORS.amber);
  drawBulletedList(grade.improvements, COLORS.amber, 'No focused improvements were detected.');

  if (grade.redFlags.length > 0) {
    y += 4;
    drawSectionTitle('Red Flags', COLORS.red);
    drawBulletedList(grade.redFlags, COLORS.red, '');
  }

  // Add Deterministic Breakdown if available
  if (grade.deterministic) {
    y += 8;
    drawSectionTitle('Deterministic Breakdown', COLORS.medium);
    doc.setTextColor(COLORS.textGray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const detLines = [
      `Weighted Phase Score: ${grade.deterministic.weightedPhaseScore}`,
      `Penalty Points: ${grade.deterministic.penaltyPoints}`,
      `Unknown Penalty: ${grade.deterministic.unknownPenalty}`,
      `Overall Score: ${grade.deterministic.overallScore}`,
    ];
    
    for (const line of detLines) {
      ensureSpace(6);
      doc.text(line, margin, y);
      y += 5;
    }
  }

  // Add Confidence Metrics if available
  if (grade.confidence) {
    y += 8;
    drawSectionTitle('Confidence Metrics', COLORS.medium);
    doc.setTextColor(COLORS.textGray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const confLines = [
      `Overall Confidence: ${grade.confidence.score}/100`,
      `Evidence Coverage: ${Math.round((grade.confidence.evidenceCoverage || 0) * 100)}%`,
      `Quote Verification: ${Math.round((grade.confidence.quoteVerificationRate || 0) * 100)}%`,
      `Transcript Quality: ${Math.round((grade.confidence.transcriptQuality || 0) * 100)}%`,
    ];
    
    for (const line of confLines) {
      ensureSpace(6);
      doc.text(line, margin, y);
      y += 5;
    }
  }

  // Add Critical Behaviors if available
  if (grade.criticalBehaviors && grade.criticalBehaviors.length > 0) {
    y += 8;
    drawSectionTitle('Critical Behaviors', COLORS.medium);
    
    for (const cb of grade.criticalBehaviors) {
      ensureSpace(15);
      
      const statusColor = cb.status === 'pass' ? COLORS.green : cb.status === 'fail' ? COLORS.red : '#64748b';
      const statusText = cb.status === 'pass' ? 'PASS' : cb.status === 'fail' ? 'FAIL' : 'UNKNOWN';
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(COLORS.white);
      doc.text(cb.name, margin, y);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(statusColor);
      doc.text(statusText, margin + 70, y);
      
      y += 5;
      
      // Add note
      if (cb.note) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(COLORS.textGray);
        const noteLines = doc.splitTextToSize(cb.note, contentWidth - 10);
        doc.text(noteLines, margin + 5, y);
        y += noteLines.length * 4 + 2;
      }
      
      // Add evidence quotes if available
      if (cb.evidence && cb.evidence.length > 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor('#9ca3af');
        for (const quote of cb.evidence.slice(0, 4)) {
          const quoteLines = doc.splitTextToSize(`"${quote}"`, contentWidth - 15);
          for (const ql of quoteLines) {
            ensureSpace(5);
            doc.text(ql, margin + 5, y);
            y += 4;
          }
        }
        y += 3;
      }
    }
  }

  // Add Phase Evidence + Coaching Scripts
  const phasesWithEvidence = grade.phaseScores.filter(p => p.evidence && p.evidence.length > 0);
  if (phasesWithEvidence.length > 0) {
    y += 8;
    drawSectionTitle('Phase Evidence + Coaching', COLORS.medium);
    
    for (const phase of phasesWithEvidence) {
      ensureSpace(15);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(COLORS.white);
      doc.text(`${phase.name}: ${phase.score}/${phase.maxScore}`, margin, y);
      y += 5;

      const phaseSummary = phase.summary || '';
      const coachingLines = phaseSummary
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
      drawCard('Phase Summary / Coaching', coachingLines, COLORS.medium);

      if (phase.evidence && phase.evidence.length > 0) {
        const evidenceLines = phase.evidence.slice(0, 6).map((quote) => `"${quote}"`);
        drawCard('Evidence Quotes', evidenceLines, COLORS.green);
      }
    }
  }

  // Add Action Plan
  y += 6;
  drawSectionTitle('Coach Action Plan (Next Call)', COLORS.medium);
  drawBulletedList(
    [
      'Open with a clear agenda and outcome: “By the end of this call, we’ll know if an eval makes sense.”',
      'Find the cost of inaction: “What’s this keeping you from doing right now?”',
      'Use a confident close: “Based on what you shared, the next step is to book your eval. Do mornings or afternoons work best?”',
    ],
    COLORS.medium,
    ''
  );

  const totalPages = doc.getNumberOfPages();
  const footerText = 'Generated by PT Biz Discovery Call Grader. Transcript content is de-identified.';
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setDrawColor(COLORS.lightGray);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setTextColor('#9ba6b8');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(footerText, margin, pageHeight - 7);
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  const dateSlug = callDate
    ? callDate.replace(/[^0-9-]/g, '')
    : new Date().toISOString().slice(0, 10);
  const clientSlug = sanitizeFilenamePart(clientName || 'Client');
  doc.save(`Discovery_Call_Audit_${clientSlug}_${dateSlug}.pdf`);
}
