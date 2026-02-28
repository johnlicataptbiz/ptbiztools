import { jsPDF } from 'jspdf';
import type { GradeResult } from './grader';

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
};

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

export async function generatePDF(
  grade: GradeResult,
  coachName: string,
  clientName: string,
  callDate: string
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  doc.setFillColor(COLORS.dark);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(COLORS.white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Discovery Call Audit', margin, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('PT Biz', pageWidth - margin, 25, { align: 'right' });

  y = 55;
  doc.setTextColor(COLORS.textGray);
  doc.setFontSize(9);
  
  const metaParts = [];
  if (clientName) metaParts.push(`Client: ${clientName}`);
  if (callDate) metaParts.push(`Call Date: ${callDate}`);
  if (coachName) metaParts.push(`Coach: ${coachName}`);
  doc.text(metaParts.join('  |  '), margin, y);
  
  y += 8;
  doc.setDrawColor(COLORS.lightGray);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const scoreColor = getScoreColor(grade.score);
  doc.setFillColor(scoreColor);
  doc.roundedRect(margin, y, 50, 40, 3, 3, 'F');
  
  doc.setTextColor(COLORS.white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(String(grade.score), margin + 25, y + 22, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text('/ 100', margin + 25, y + 32, { align: 'center' });
  
  doc.setFontSize(11);
  doc.text(getScoreLabel(grade.score), margin + 25, y + 38, { align: 'center' });

  const phaseX = margin + 60;
  doc.setTextColor(COLORS.textGray);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  for (let i = 0; i < grade.phaseScores.length; i++) {
    const ps = grade.phaseScores[i];
    doc.setTextColor(COLORS.textGray);
    doc.text(ps.name, phaseX, y + 8 + i * 5);
    doc.setTextColor(COLORS.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(`${ps.score}/${ps.maxScore}`, pageWidth - margin - 5, y + 8 + i * 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
  }

  y += 45;
  doc.setTextColor(COLORS.textGray);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  const summaryLines = doc.splitTextToSize(`"${grade.summary}"`, contentWidth);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 5;
  
  doc.setDrawColor(COLORS.lightGray);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setTextColor(COLORS.green);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("What's Working Well", margin, y);
  y += 8;
  
  doc.setTextColor(COLORS.textGray);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  for (const strength of grade.strengths) {
    const lines = doc.splitTextToSize(`• ${strength}`, contentWidth - 5);
    doc.text(lines, margin + 5, y);
    y += lines.length * 5 + 2;
  }
  
  y += 5;
  doc.setTextColor(COLORS.amber);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("What Needs Work", margin, y);
  y += 8;
  
  doc.setTextColor(COLORS.textGray);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  for (const imp of grade.improvements) {
    const lines = doc.splitTextToSize(`• ${imp}`, contentWidth - 5);
    doc.text(lines, margin + 5, y);
    y += lines.length * 5 + 2;
  }

  if (grade.redFlags.length > 0) {
    y += 5;
    doc.setTextColor(COLORS.red);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Red Flags", margin, y);
    y += 8;
    
    doc.setTextColor(COLORS.red);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    for (const flag of grade.redFlags) {
      const lines = doc.splitTextToSize(`• ${flag}`, contentWidth - 5);
      doc.text(lines, margin + 5, y);
      y += lines.length * 5 + 2;
    }
  }

  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  
  y = 275;
  doc.setDrawColor(COLORS.lightGray);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  
  doc.setTextColor(COLORS.lightGray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'This report was generated as part of your PT Biz coaching program. All patient information has been removed for privacy compliance.',
    pageWidth / 2,
    y,
    { align: 'center' }
  );

  doc.save(`Discovery_Call_Grade_${clientName || 'Report'}_${callDate || ''}.pdf`.replace(/ /g, '_'));
}
