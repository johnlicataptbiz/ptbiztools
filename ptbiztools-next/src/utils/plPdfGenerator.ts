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
  blue: '#2E86F5',
};

function sanitizeFilenamePart(value: string) {
  const normalized = value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48);
  return normalized || 'Report';
}

function safeNum(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

const $ = (v: number) => 
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(safeNum(v));

const pf = (v: number | null) => 
  v === null || isNaN(v) ? "—" : safeNum(v).toFixed(1) + "%";

interface PLRow {
  label: string;
  amount: number;
  pct: number | null;
  target: string;
  bold?: boolean;
  indent?: boolean;
}

interface PLMetrics {
  facilityPct: number | null;
  peoplePct: number | null;
  ownerPct: number | null;
  mktPct: number | null;
  merchPct: number | null;
  swPct: number | null;
  duesPct: number | null;
  supPct: number | null;
  medPct: number | null;
  profPct: number | null;
  insPct: number | null;
  mealPct: number | null;
  travPct: number | null;
  intPct: number | null;
  netPct: number | null;
  odePct: number | null;
}

interface PLPlan {
  phases: Array<{
    days: string;
    title: string;
    actions: string[];
    impact: number;
  }>;
  total: number;
}

interface PLRec {
  p: "HIGH" | "MED" | "LOW" | "INFO";
  cat: string;
  icon: string;
  title: string;
  detail: string;
}

interface CashFlowItem {
  title: string;
  icon: string;
  text: string;
}

export async function generatePLPDF(
  clinicName: string,
  period: string,
  revenue: number,
  totalExp: number,
  netIncome: number,
  ode: number,
  metrics: PLMetrics,
  tRows: PLRow[],
  score: number,
  recs: PLRec[],
  plan: PLPlan | null,
  cashFlow: CashFlowItem[],
  clinicType: string,
  payerMix: string
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 20;
  let y = 0;

  const grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 50 ? "D" : "F";
  const gradeColor = score >= 80 ? "#047857" : score >= 60 ? "#B45309" : "#DC2626";

  const drawHeader = (continuation = false) => {
    doc.setFillColor(COLORS.dark);
    doc.rect(0, 0, pageWidth, 46, 'F');

    doc.setTextColor(COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(continuation ? 16 : 21);
    doc.text(continuation ? 'P&L Financial Audit (continued)' : 'P&L Financial Audit', margin, continuation ? 18 : 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PT Biz', pageWidth - margin, 22, { align: 'right' });

    y = 54;
    doc.setTextColor(COLORS.muted);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const metaParts: string[] = [];
    if (clinicName) metaParts.push(`Clinic: ${clinicName}`);
    if (period) metaParts.push(`Period: ${period}`);
    metaParts.push(`Type: ${clinicType === 'solo' ? 'Solo' : 'Multi-Clinician'}`);
    metaParts.push(`Mix: ${payerMix === 'cash' ? 'Cash' : 'Hybrid'}`);
    doc.text(metaParts.join('  |  ') || 'PT Biz P&L Report', margin, y);

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

  drawHeader(false);

  // Score Card
  const scoreBoxHeight = 44;
  ensureSpace(scoreBoxHeight + 10);

  doc.setFillColor(gradeColor);
  doc.roundedRect(margin, y, 52, scoreBoxHeight, 3, 3, 'F');

  doc.setTextColor(COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text(String(grade), margin + 26, y + 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text('/ 100', margin + 26, y + 29, { align: 'center' });
  doc.setFontSize(11);
  doc.text(String(score), margin + 26, y + 37, { align: 'center' });

  const infoX = margin + 58;
  
  doc.setTextColor(COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(clinicName || 'Clinic', infoX, y + 10);
  
  doc.setTextColor(COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(period || 'Annual Review', infoX, y + 18);
  
  // Financial summary
  doc.setTextColor(COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Revenue:', infoX, y + 30);
  doc.setFont('helvetica', 'normal');
  doc.text($(revenue), infoX + 35, y + 30);
  
  doc.setFont('helvetica', 'bold');
  doc.text('ODE:', infoX, y + 38);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(metrics.odePct && metrics.odePct >= 20 ? COLORS.green : COLORS.amber);
  doc.text($(ode) + ' (' + pf(metrics.odePct) + ')', infoX + 35, y + 38);

  y += scoreBoxHeight + 8;

  // Quick Analysis
  drawSectionTitle('Quick Analysis', COLORS.medium);
  
  const analysisItems = [
    { label: 'Net Profit', value: metrics.netPct, target: '≥15%', good: (v: number) => v >= 15 },
    { label: 'ODE', value: metrics.odePct, target: '20-35%', good: (v: number) => v >= 20 && v <= 35 },
    { label: 'Facility', value: metrics.facilityPct, target: '<10%', good: (v: number) => v < 10 },
    { label: 'People Cost', value: metrics.peoplePct, target: '<45%', good: (v: number) => v < 45 },
  ];

  for (const item of analysisItems) {
    ensureSpace(8);
    doc.setTextColor(COLORS.textGray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(item.label, margin, y);
    
    const val = item.value || 0;
    const isGood = item.good(val);
    doc.setTextColor(isGood ? COLORS.green : val > 0 ? COLORS.amber : COLORS.red);
    doc.setFont('helvetica', 'bold');
    doc.text(pf(item.value), margin + 50, y);
    
    doc.setTextColor(COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.text(`Target: ${item.target}`, margin + 80, y);
    
    y += 6;
  }

  y += 4;

  // P&L Breakdown Table
  drawSectionTitle('P&L Breakdown', COLORS.medium);
  
  // Table header
  ensureSpace(10);
  doc.setFillColor(COLORS.lightGray);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setTextColor(COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Category', margin + 2, y + 5.5);
  doc.text('Amount', margin + 80, y + 5.5, { align: 'right' });
  doc.text('% of Rev', margin + 110, y + 5.5, { align: 'right' });
  doc.text('Target', margin + contentWidth - 2, y + 5.5, { align: 'right' });
  y += 10;

  // Table rows
  for (const row of tRows) {
    ensureSpace(6);
    
    if (row.bold) {
      doc.setFillColor(COLORS.lightGray + '44');
      doc.rect(margin, y - 1, contentWidth, 6, 'F');
    }
    
    doc.setTextColor(row.bold ? COLORS.white : COLORS.textGray);
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.text(row.label, margin + (row.indent ? 6 : 2), y + 3.5);
    
    doc.setTextColor(COLORS.textGray);
    doc.setFont('helvetica', 'normal');
    doc.text($(row.amount), margin + 80, y + 3.5, { align: 'right' });
    
    const pctValue = row.pct !== null ? pf(row.pct) : '—';
    doc.text(pctValue, margin + 110, y + 3.5, { align: 'right' });
    
    doc.setTextColor(COLORS.muted);
    doc.text(row.target, margin + contentWidth - 2, y + 3.5, { align: 'right' });
    
    y += 6;
  }

  // Total Expenses row
  ensureSpace(8);
  doc.setFillColor(COLORS.lightGray);
  doc.rect(margin, y - 1, contentWidth, 7, 'F');
  doc.setTextColor(COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Total Expenses', margin + 2, y + 3.5);
  doc.text($(totalExp), margin + 80, y + 3.5, { align: 'right' });
  doc.text(pf(revenue > 0 ? (totalExp / revenue) * 100 : null), margin + 110, y + 3.5, { align: 'right' });
  y += 10;

  // Net Income row
  ensureSpace(8);
  const netColor = metrics.netPct && metrics.netPct >= 15 ? COLORS.green : metrics.netPct && metrics.netPct >= 10 ? COLORS.amber : COLORS.red;
  doc.setTextColor(netColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Net Income', margin + 2, y + 3.5);
  doc.text($(netIncome), margin + 80, y + 3.5, { align: 'right' });
  doc.text(pf(metrics.netPct), margin + 110, y + 3.5, { align: 'right' });
  y += 10;

  // ODE row
  ensureSpace(8);
  const odeColor = metrics.odePct && metrics.odePct >= 20 && metrics.odePct <= 35 ? COLORS.green : metrics.odePct && metrics.odePct >= 15 ? COLORS.amber : COLORS.red;
  doc.setFillColor(COLORS.blue + '15');
  doc.rect(margin, y - 1, contentWidth, 7, 'F');
  doc.setTextColor(COLORS.blue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("Owner's Discretionary Earnings", margin + 2, y + 3.5);
  doc.setTextColor(odeColor);
  doc.text($(ode), margin + 80, y + 3.5, { align: 'right' });
  doc.text(pf(metrics.odePct), margin + 110, y + 3.5, { align: 'right' });
  y += 12;

  // Recommendations
  if (recs.length > 0) {
    drawSectionTitle('Recommendations', COLORS.medium);
    
    const priorityColors: Record<string, string> = {
      HIGH: COLORS.red,
      MED: COLORS.amber,
      LOW: COLORS.muted,
      INFO: COLORS.green,
    };
    
    for (const rec of recs.slice(0, 6)) {
      ensureSpace(20);
      
      const priorityColor = priorityColors[rec.p] || COLORS.muted;
      
      // Priority badge
      doc.setFillColor(priorityColor + '22');
      doc.roundedRect(margin, y, 20, 5, 1, 1, 'F');
      doc.setTextColor(priorityColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(rec.p === 'MED' ? 'MEDIUM' : rec.p, margin + 2, y + 3.5);
      
      // Category
      doc.setTextColor(COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(rec.cat, margin + 24, y + 3.5);
      
      y += 7;
      
      // Title
      doc.setTextColor(COLORS.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(rec.title, margin + 2, y + 4);
      y += 6;
      
      // Detail (wrapped)
      doc.setTextColor(COLORS.textGray);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const splitDetail = doc.splitTextToSize(rec.detail, contentWidth - 4);
      doc.text(splitDetail, margin + 2, y + 3);
      y += splitDetail.length * 3.5 + 4;
    }
  }

  // 90-Day Plan
  if (plan && plan.phases.length > 0) {
    drawSectionTitle('90-Day Profit Improvement Plan', COLORS.medium);
    
    ensureSpace(12);
    doc.setFillColor(COLORS.blue + '15');
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
    doc.setTextColor(COLORS.blue);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Total Projected Profit Increase', margin + 4, y + 5);
    doc.setTextColor(COLORS.green);
    doc.setFontSize(14);
    doc.text($(plan.total), margin + contentWidth - 4, y + 7, { align: 'right' });
    y += 16;

    for (const phase of plan.phases) {
      ensureSpace(30);
      
      // Phase number circle
      doc.setFillColor(COLORS.blue);
      doc.circle(margin + 6, y + 5, 5, 'F');
      doc.setTextColor(COLORS.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(String(plan.phases.indexOf(phase) + 1), margin + 6, y + 6.5, { align: 'center' });
      
      // Days
      doc.setTextColor(COLORS.blue);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`Days ${phase.days}`, margin + 16, y + 3);
      
      // Title
      doc.setTextColor(COLORS.white);
      doc.setFontSize(10);
      doc.text(phase.title, margin + 16, y + 8);
      
      y += 12;
      
      // Actions
      doc.setTextColor(COLORS.textGray);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      for (const action of phase.actions) {
        const splitAction = doc.splitTextToSize(`• ${action}`, contentWidth - 20);
        doc.text(splitAction, margin + 16, y + 2.5);
        y += splitAction.length * 3 + 2;
      }
      
      // Impact
      ensureSpace(8);
      doc.setFillColor(COLORS.blue + '10');
      doc.roundedRect(margin + 16, y, 50, 6, 1, 1, 'F');
      doc.setTextColor(COLORS.blue);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`Impact: ${$(phase.impact)}`, margin + 18, y + 4);
      
      y += 10;
    }
  }

  // Cash Flow Analysis
  if (cashFlow.length > 0) {
    drawSectionTitle('Cash Flow Analysis', COLORS.medium);
    
    for (const item of cashFlow) {
      ensureSpace(25);
      
      // Icon and title
      doc.setTextColor(COLORS.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const titleText = item.title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
      doc.text(titleText, margin + 2, y + 5);
      
      y += 7;
      
      // Text
      doc.setTextColor(COLORS.textGray);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const splitText = doc.splitTextToSize(item.text, contentWidth - 4);
      doc.text(splitText, margin + 2, y + 3);
      y += splitText.length * 3.5 + 6;
    }
  }

  // Footer
  ensureSpace(15);
  doc.setDrawColor(COLORS.lightGray);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  
  doc.setTextColor(COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('This report is for educational purposes and does not constitute financial advice.', margin, y + 3);
  y += 5;
  doc.setTextColor(COLORS.blue);
  doc.setFont('helvetica', 'bold');
  doc.text('ptbiz.com', pageWidth - margin, y + 3, { align: 'right' });

  // Save the PDF
  const filename = `${sanitizeFilenamePart(clinicName || 'Clinic')}_PL_Audit_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
