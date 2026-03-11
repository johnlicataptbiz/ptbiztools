import { PTBIZ_LOGO_DARK_BG_URL } from "@/constants/branding";

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

const LOGO_CACHE = new Map<string, string | null>();

function sanitizeFilenamePart(value: string) {
  const normalized = value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48);
  return normalized || 'Report';
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

const $ = (v: number) => 
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

const pf = (v: number | null) => 
  v === null || isNaN(v) ? "—" : v.toFixed(1) + "%";

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
  payerMix: string,
  bizPhase: string
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 20;
  const logoDataUrl = await loadImageDataUrl(PTBIZ_LOGO_DARK_BG_URL);
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
  const infoWidth = pageWidth - margin - infoX;
  
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

