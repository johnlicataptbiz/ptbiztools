import type { GradeResult } from './grader';
import { DISCOVERY_PDF_LOGO_WHITE_URL } from '../constants/branding';

const COLORS = {
  dark: '#1a1a2e',
  accent: '#e94560',
  medium: '#0f3460',
  lightBg: '#f5f5f7',
  green: '#2d8a4e',
  amber: '#c47f17',
  red: '#c0392b',
  white: '#ffffff',
  lightGray: '#e0e0e0',
  textGray: '#4a4a4a',
  mutedGray: '#6b7280',
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

function getBehaviorStatusColor(status: string): string {
  if (status === 'pass') return COLORS.green;
  if (status === 'fail') return COLORS.red;
  return COLORS.mutedGray;
}

function getBehaviorStatusLabel(status: string): string {
  if (status === 'pass') return 'PASS';
  if (status === 'fail') return 'FAIL';
  return 'UNKNOWN';
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
    doc.rect(0, 0, pageWidth, 44, 'F');

    doc.setTextColor(COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(continuation ? 17 : 22);
    doc.text(continuation ? 'Discovery Call Audit (continued)' : 'Discovery Call Audit', margin, continuation ? 18 : 22);

    if (logoDataUrl) {
      const logoWidth = 46;
      const logoHeight = 11;
      const logoX = pageWidth - margin - logoWidth;
      const logoY = 13;
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight, undefined, 'FAST');
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('PT Biz', pageWidth - margin, 22, { align: 'right' });
    }

    y = 54;
    doc.setTextColor(COLORS.textGray);
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
      doc.setTextColor(COLORS.textGray);
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

  const drawQuote = (quote: string) => {
    const lines = doc.splitTextToSize(`"${quote}"`, contentWidth - 16);
    ensureSpace(lines.length * 4.5 + 4);
    doc.setTextColor(COLORS.mutedGray);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    for (const line of lines) {
      doc.text(line, margin + 8, y);
      y += 4.5;
    }
    y += 2;
  };

  drawHeader(false);

  const scoreColor = getScoreColor(grade.score);
  const scoreBoxHeight = 42;
  const phaseBoxHeight = Math.max(42, grade.phaseScores.length * 5 + 9);
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
  doc.setFillColor('#f7f9fc');
  doc.roundedRect(phaseX, y, phaseWidth, phaseBoxHeight, 2, 2, 'FD');
  doc.setTextColor(COLORS.medium);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Phase Breakdown', phaseX + 3, y + 6);

  let rowY = y + 11;
  for (const phase of grade.phaseScores) {
    doc.setTextColor(COLORS.textGray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(phase.name, phaseX + 3, rowY);
    doc.setTextColor(COLORS.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(`${phase.score}/${phase.maxScore}`, phaseX + phaseWidth - 3, rowY, { align: 'right' });
    rowY += 5;
  }

  y += topBoxHeight + 8;

  // Prospect Summary (if available)
  if (grade.prospectSummary) {
    drawSectionTitle('Prospect Summary', COLORS.medium);
    doc.setTextColor(COLORS.textGray);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(grade.prospectSummary, contentWidth);
    ensureSpace(summaryLines.length * 5 + 4);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5 + 3;
    doc.setDrawColor(COLORS.lightGray);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  }

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

  if (grade.redFlags && grade.redFlags.length > 0) {
    y += 4;
    drawSectionTitle('Red Flags', COLORS.red);
    drawBulletedList(grade.redFlags, COLORS.red, '');
  }

  // Critical Behaviors Section
  if (grade.criticalBehaviors && grade.criticalBehaviors.length > 0) {
    y += 8;
    drawSectionTitle('Critical Behaviors', COLORS.medium);
    
    for (const behavior of grade.criticalBehaviors) {
      ensureSpace(20);
      const statusColor = getBehaviorStatusColor(behavior.status);
      const statusLabel = getBehaviorStatusLabel(behavior.status);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(COLORS.dark);
      doc.text(behavior.name, margin, y);
      
      // Status badge
      const badgeX = pageWidth - margin - 25;
      doc.setFillColor(statusColor);
      doc.roundedRect(badgeX, y - 4, 22, 7, 1, 1, 'F');
      doc.setTextColor(COLORS.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(statusLabel, badgeX + 11, y + 0.5, { align: 'center' });
      
      y += 6;
      
      // Note
      if (behavior.note) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(COLORS.textGray);
        const noteLines = doc.splitTextToSize(behavior.note, contentWidth - 10);
        for (const line of noteLines) {
          ensureSpace(4);
          doc.text(line, margin + 4, y);
          y += 4;
        }
      }
      
      // Evidence quotes (max 2)
      if (behavior.evidence && behavior.evidence.length > 0) {
        const evidenceToShow = behavior.evidence.slice(0, 2);
        for (const quote of evidenceToShow) {
          drawQuote(quote);
        }
      }
      
      y += 4;
    }
  }

  // Confidence & Deterministic Breakdown
  if (grade.confidence || grade.deterministic) {
    y += 8;
    ensureSpace(35);
    
    doc.setDrawColor('#d8e0ec');
    doc.setFillColor('#f7f9fc');
    doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');
    
    let infoY = y + 8;
    doc.setTextColor(COLORS.medium);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Scoring Details', margin + 3, infoY);
    
    infoY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    if (grade.deterministic) {
      doc.setTextColor(COLORS.textGray);
      doc.text(`Weighted Phase Score: ${grade.deterministic.weightedPhaseScore}`, margin + 3, infoY);
      infoY += 5;
      doc.text(`Penalty Points: -${grade.deterministic.penaltyPoints}`, margin + 3, infoY);
      infoY += 5;
      doc.text(`Unknown Penalty: -${grade.deterministic.unknownPenalty}`, margin + 3, infoY);
      infoY += 5;
    }
    
    if (grade.confidence) {
      doc.setTextColor(COLORS.textGray);
      doc.text(`Confidence: ${grade.confidence.score}/100`, margin + contentWidth / 2, y + 8);
      const confY = y + 14;
      doc.text(`Evidence: ${Math.round(grade.confidence.evidenceCoverage * 100)}%`, margin + contentWidth / 2, confY);
      doc.text(`Quotes: ${Math.round(grade.confidence.quoteVerificationRate * 100)}%`, margin + contentWidth / 2, confY + 5);
    }
    
    y += 35;
  }

  // Phase Evidence (quotes from each phase)
  if (grade.phaseScores) {
    for (const phase of grade.phaseScores) {
      if (phase.evidence && phase.evidence.length > 0) {
        y += 4;
        drawSectionTitle(phase.name, COLORS.medium);
        
        if (phase.summary) {
          doc.setTextColor(COLORS.textGray);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(10);
          const summaryLines = doc.splitTextToSize(phase.summary, contentWidth);
          ensureSpace(summaryLines.length * 5 + 4);
          doc.text(summaryLines, margin, y);
          y += summaryLines.length * 5 + 4;
        }
        
        const evidenceToShow = phase.evidence.slice(0, 2);
        for (const quote of evidenceToShow) {
          drawQuote(quote);
        }
      }
    }
  }

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

