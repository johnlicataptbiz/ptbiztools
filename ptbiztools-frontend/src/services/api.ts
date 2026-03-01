import type { PLInput } from '../utils/plTypes';

export type PLImportNumericField = Exclude<keyof PLInput, 'clinicSize' | 'clinicModel' | 'businessStage'>;

export const API_BASE = import.meta.env.VITE_API_URL || 'https://ptbiz-backend-production.up.railway.app/api';

// Authentication & Team Types
export interface TeamMember {
  id: string;
  name: string;
  title?: string | null;
  teamSection?: string | null;
  imageUrl?: string | null;
  role?: string;
  hasPassword?: boolean;
  passwordHash?: string; // Backward compatibility if backend still returns raw hash
}

export interface User {
  id: string;
  name: string;
  title?: string | null;
  teamSection?: string | null;
  imageUrl?: string | null;
  role?: string;
}

export interface UsageUserLite {
  id: string;
  name: string;
  title: string | null;
  teamSection: string | null;
}

export interface AdminRecentLoginEvent {
  id: string;
  userId: string | null;
  success: boolean;
  createdAt: string;
  user?: UsageUserLite | null;
}

export interface AdminRecentCoachingAnalysis {
  id: string;
  userId: string | null;
  score: number;
  outcome: string;
  createdAt: string;
  user?: UsageUserLite | null;
}

export interface AdminRecentPdfExport {
  id: string;
  userId: string | null;
  score: number | null;
  createdAt: string;
  user?: UsageUserLite | null;
}

export interface AdminRecentAction {
  id: string;
  actionType: string;
  description: string;
  createdAt: string;
}

export interface KnowledgeDoc {
  id: string;
  slug?: string | null;
  title: string;
  content: string;
  category: string;
  source?: string | null;
  version?: string;
  checksum?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ActionTypeStat {
  actionType: string;
  _count: {
    actionType: number;
  };
}

export interface ActionStatsSummary {
  stats: ActionTypeStat[];
  recent: Array<{
    id: string;
    actionType: string;
    description: string;
    createdAt: string;
  }>;
}

export interface CoachingAnalysisRecord {
  id: string;
  userId: string | null;
  sessionId: string | null;
  coachName: string | null;
  clientName: string | null;
  callDate: string | null;
  score: number;
  outcome: string;
  summary: string;
  createdAt: string;
  user?: UsageUserLite | null;
}

export interface PdfExportRecord {
  id: string;
  userId: string | null;
  coachingAnalysisId: string | null;
  sessionId: string | null;
  coachName: string | null;
  clientName: string | null;
  callDate: string | null;
  score: number | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: UsageUserLite | null;
}

export interface PLAuditRecord {
  id: string;
  userId: string | null;
  sessionId: string | null;
  actionType: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: UsageUserLite | null;
}

export type PLImportStatus =
  | 'uploaded'
  | 'parsing'
  | 'parsed'
  | 'mapping'
  | 'ready_for_review'
  | 'approved'
  | 'failed';

export interface PLImportSessionDto {
  id: string;
  status: PLImportStatus;
  sourceType: 'csv' | 'xlsx' | 'pdf' | 'image';
  sourceLabel?: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  parserVersion?: string | null;
  mappingVersion?: string | null;
  overallConfidence: number;
  requiredFieldsComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PLImportParseArtifactDto {
  id: string;
  importSessionId: string;
  rawExtraction: Record<string, unknown>;
  qualitySignals: {
    parser?: string;
    parserVersion?: string;
    rowCount?: number;
    columnCount?: number;
    pageCount?: number;
    extractedChars?: number;
    numericTokenCount?: number;
    labelCoverageScore?: number;
    usedOCR?: boolean;
    warnings?: string[];
  };
  createdAt: string;
}

export interface PLImportFieldMapping {
  field: string;
  candidateId: string | null;
  label: string | null;
  value: number | null;
  confidence: number;
  reasoning: string;
}

export interface PLImportMappingDto {
  id: string;
  importSessionId: string;
  autoMap: Record<string, PLImportFieldMapping>;
  finalMap: Record<string, PLImportFieldMapping>;
  mappedInput: Partial<Record<PLImportNumericField, number>>;
  fieldConfidence: Record<string, number>;
  manualOverrides: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PLImportDetailDto {
  import: PLImportSessionDto;
  parseArtifact?: PLImportParseArtifactDto | null;
  mapping?: PLImportMappingDto | null;
  warnings: string[];
}

export interface PLImportApprovalDto {
  importId: string;
  status: PLImportStatus;
  overallConfidence: number;
  requiredFieldsComplete: boolean;
  mappedInput: Partial<Record<PLImportNumericField, number>>;
  warnings: string[];
  fieldConfidence: Record<string, number>;
}

export type PLImportBatchStatus = 'draft' | 'approved' | 'failed';

export interface PLImportBatchSummaryDto {
  id: string;
  name: string | null;
  programType: string;
  status: PLImportBatchStatus;
  overallConfidence: number;
  approvedAt: string | null;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PLImportBatchItemDto {
  id: string;
  periodLabel: string;
  periodOrder: number;
  createdAt: string;
  updatedAt: string;
  import: {
    id: string;
    status: PLImportStatus;
    sourceType: 'csv' | 'xlsx' | 'pdf' | 'image';
    sourceLabel: string | null;
    filename: string;
    overallConfidence: number;
    requiredFieldsComplete: boolean;
    mappedInput: Partial<Record<PLImportNumericField, number>> | null;
    fieldConfidence: Record<string, number> | null;
    warnings: string[];
  };
}

export interface PLImportBatchDetailDto {
  batch: {
    id: string;
    name: string | null;
    programType: string;
    status: PLImportBatchStatus;
    overallConfidence: number;
    timelinePayload: unknown;
    warningSummary: unknown;
    approvedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  items: PLImportBatchItemDto[];
}

export interface PLImportBatchTimelinePeriodDto {
  itemId: string;
  importSessionId: string;
  periodLabel: string;
  periodOrder: number;
  sourceType: 'csv' | 'xlsx' | 'pdf' | 'image';
  sourceLabel: string | null;
  filename: string;
  overallConfidence: number;
  mappedInput: Partial<Record<PLImportNumericField, number>>;
  fieldConfidence: Record<string, number>;
  warnings: string[];
}

export interface PLImportBatchApprovalDto {
  batch: {
    id: string;
    name: string | null;
    programType: string;
    status: PLImportBatchStatus;
    overallConfidence: number;
    approvedAt: string | null;
  };
  timeline: PLImportBatchTimelinePeriodDto[];
  warningSummary: Array<{ periodLabel: string; warnings: string[] }>;
}

export interface GradeStoragePayload {
  score: number;
  outcome: string;
  summary: string;
  phaseScores: unknown;
  strengths: string[];
  improvements: string[];
  redFlags: string[];
  deidentifiedTranscript: string;
}

export interface CoachingAnalysisSaveInput {
  sessionId?: string;
  coachName?: string;
  clientName?: string;
  callDate?: string;
  grade: GradeStoragePayload;
}

export interface PdfExportSaveInput {
  sessionId?: string;
  coachingAnalysisId?: string;
  coachName?: string;
  clientName?: string;
  callDate?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface AdminUsageSummary {
  window: { days: number; since: string };
  totals: {
    successfulLogins: number;
    coachingAnalyses: number;
    pdfExports: number;
    activeUsers: number;
  };
  byDay: Array<{
    date: string;
    label: string;
    logins: number;
    analyses: number;
    pdfs: number;
  }>;
  topUsers: Array<{
    userId: string;
    name: string;
    title: string | null;
    teamSection: string | null;
    logins: number;
    analyses: number;
    pdfs: number;
  }>;
  recent: {
    loginEvents: AdminRecentLoginEvent[];
    analyses: AdminRecentCoachingAnalysis[];
    pdfExports: AdminRecentPdfExport[];
    actions: AdminRecentAction[];
  };
}

// Auth API functions
export async function getTeamMembers(): Promise<TeamMember[]> {
  try {
    const response = await fetch(`${API_BASE}/auth/team`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch team');
    const members = await response.json();
    return members.map((member: TeamMember) => ({
      ...member,
      hasPassword: member.hasPassword ?? Boolean(member.passwordHash),
    }));
  } catch (error) {
    console.error('Failed to get team members:', error);
    return [];
  }
}

export async function login(userId: string, password: string, rememberMe: boolean): Promise<{ user?: User, error?: string, needsSetup?: boolean }> {
  try {
    const sessionId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, password, rememberMe, sessionId }),
    });
    const data = await response.json();
    if (!response.ok) return { error: data.error, needsSetup: data.needsSetup };
    return { user: data.user };
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Network error' };
  }
}

export async function logout(): Promise<boolean> {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}

export async function getMe(): Promise<{ user?: User, error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    if (!response.ok) return { error: 'Not authenticated' };
    const data = await response.json();
    return { user: data.user };
  } catch (error) {
    console.error('Get me error:', error);
    return { error: 'Network error' };
  }
}

export async function setupPassword(userId: string, password: string): Promise<{ user?: User, error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/auth/setup-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, password }),
    });
    if (!response.ok) return { error: 'Setup failed' };
    const data = await response.json();
    return { user: data.user };
  } catch (error) {
    console.error('Setup password error:', error);
    return { error: 'Network error' };
  }
}


export interface ActionLogInput {
  actionType: string;
  description: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
}

export async function logAction(input: ActionLogInput): Promise<void> {
  try {
    await fetch(`${API_BASE}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
}

export async function saveCoachingAnalysis(input: CoachingAnalysisSaveInput): Promise<{ analysisId?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/analytics/coaching-analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to save coaching analysis' };
    return { analysisId: data.analysis?.id };
  } catch (error) {
    console.error('Failed to save coaching analysis:', error);
    return { error: 'Network error' };
  }
}

export async function savePdfExport(input: PdfExportSaveInput): Promise<{ pdfExportId?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/analytics/pdf-exports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to save PDF export' };
    return { pdfExportId: data.pdfExport?.id };
  } catch (error) {
    console.error('Failed to save pdf export:', error);
    return { error: 'Network error' };
  }
}

export async function getAdminUsageSummary(days = 30): Promise<{ data?: AdminUsageSummary; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/analytics/admin-summary?days=${days}`, {
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to fetch admin usage summary' };
    return { data };
  } catch (error) {
    console.error('Failed to fetch admin usage summary:', error);
    return { error: 'Network error' };
  }
}

export async function getActionStats(): Promise<{ data?: ActionStatsSummary; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/actions/stats`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to fetch action stats' };
    return { data };
  } catch (error) {
    console.error('Failed to fetch action stats:', error);
    return { error: 'Network error' };
  }
}

export async function getCoachingAnalyses(limit = 100): Promise<{ analyses?: CoachingAnalysisRecord[]; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/analytics/coaching-analyses?limit=${limit}`, {
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to fetch coaching analyses' };
    return { analyses: data.analyses || [] };
  } catch (error) {
    console.error('Failed to fetch coaching analyses:', error);
    return { error: 'Network error' };
  }
}

export async function getPdfExports(limit = 100): Promise<{ pdfExports?: PdfExportRecord[]; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/analytics/pdf-exports?limit=${limit}`, {
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to fetch PDF exports' };
    return { pdfExports: data.pdfExports || [] };
  } catch (error) {
    console.error('Failed to fetch PDF exports:', error);
    return { error: 'Network error' };
  }
}

export async function getPLAudits(limit = 100): Promise<{ audits?: PLAuditRecord[]; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/analytics/pl-audits?limit=${limit}`, {
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to fetch P&L audits' };
    return { audits: data.audits || [] };
  } catch (error) {
    console.error('Failed to fetch P&L audits:', error);
    return { error: 'Network error' };
  }
}

export async function getKnowledgeDocs(): Promise<{ docs?: KnowledgeDoc[]; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/knowledge`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to fetch knowledge docs' };
    return { docs: data.docs || [] };
  } catch (error) {
    console.error('Failed to fetch knowledge docs:', error);
    return { error: 'Network error' };
  }
}

export async function seedKnowledgeDocs(): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/knowledge/seed`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) return { ok: false, error: data.error || 'Failed to seed knowledge docs' };
    return { ok: true };
  } catch (error) {
    console.error('Failed to seed knowledge docs:', error);
    return { ok: false, error: 'Network error' };
  }
}

export async function uploadVideoAsset(
  name: string,
  base64Data: string,
  mimeType = 'video/mp4',
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/videos/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, data: base64Data, mimeType }),
    });
    const data = await response.json();
    if (!response.ok) return { ok: false, error: data.error || 'Failed to upload video' };
    return { ok: true };
  } catch (error) {
    console.error('Failed to upload video asset:', error);
    return { ok: false, error: 'Network error' };
  }
}

export async function getVideoAssetStatus(name: string): Promise<{ exists: boolean; status: number }> {
  try {
    const response = await fetch(`${API_BASE}/videos/${name}`, { credentials: 'include' });
    return { exists: response.ok, status: response.status };
  } catch {
    return { exists: false, status: 0 };
  }
}

export async function createPLImport(formData: FormData): Promise<{
  importId?: string;
  status?: PLImportStatus;
  overallConfidence?: number;
  requiredFieldsComplete?: boolean;
  warnings?: string[];
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/pl-imports`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to create import session' };
    return {
      importId: data.importId,
      status: data.status,
      overallConfidence: data.overallConfidence,
      requiredFieldsComplete: data.requiredFieldsComplete,
      warnings: data.warnings || [],
    };
  } catch (error) {
    console.error('Failed to create P&L import:', error);
    return { error: 'Network error' };
  }
}

export async function listPLImports(): Promise<{ imports?: PLImportSessionDto[]; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/pl-imports`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to list imports' };
    return { imports: data.imports || [] };
  } catch (error) {
    console.error('Failed to list P&L imports:', error);
    return { error: 'Network error' };
  }
}

export async function getPLImport(id: string): Promise<{ detail?: PLImportDetailDto; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/pl-imports/${id}`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to fetch import' };
    return { detail: data };
  } catch (error) {
    console.error('Failed to fetch P&L import detail:', error);
    return { error: 'Network error' };
  }
}

export async function updatePLImportMapping(
  id: string,
  patch: {
    values?: Partial<Record<PLImportNumericField, number | null>>;
    useCandidate?: Record<string, string | null>;
  },
): Promise<{ mapping?: PLImportMappingDto; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/pl-imports/${id}/remap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to update mapping' };
    return { mapping: data.mapping as PLImportMappingDto };
  } catch (error) {
    console.error('Failed to update P&L mapping:', error);
    return { error: 'Network error' };
  }
}

export async function approvePLImport(id: string, reviewConfirmed = false): Promise<{ approval?: PLImportApprovalDto; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/pl-imports/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reviewConfirmed }),
    });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to approve import' };
    return { approval: data as PLImportApprovalDto };
  } catch (error) {
    console.error('Failed to approve P&L import:', error);
    return { error: 'Network error' };
  }
}

export async function createPLImportBatch(input?: {
  name?: string;
  programType?: string;
}): Promise<{ batch?: PLImportBatchSummaryDto; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/pl-imports/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: input?.name || undefined,
        programType: input?.programType || 'mastermind',
      }),
    });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to create import batch' };
    return { batch: data.batch as PLImportBatchSummaryDto };
  } catch (error) {
    console.error('Failed to create import batch:', error);
    return { error: 'Network error' };
  }
}

export async function listPLImportBatches(): Promise<{ batches?: PLImportBatchSummaryDto[]; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/pl-imports/batches`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to list import batches' };
    return { batches: data.batches as PLImportBatchSummaryDto[] };
  } catch (error) {
    console.error('Failed to list import batches:', error);
    return { error: 'Network error' };
  }
}

export async function getPLImportBatch(id: string): Promise<{ detail?: PLImportBatchDetailDto; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/pl-imports/batches/${id}`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to fetch import batch' };
    return { detail: data as PLImportBatchDetailDto };
  } catch (error) {
    console.error('Failed to fetch import batch:', error);
    return { error: 'Network error' };
  }
}

export async function addPLImportBatchItem(
  batchId: string,
  input: {
    importSessionId: string;
    periodLabel: string;
    periodOrder?: number;
  },
): Promise<{
  item?: {
    id: string;
    batchId: string;
    importSessionId: string;
    periodLabel: string;
    periodOrder: number;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/pl-imports/batches/${batchId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to add period to import batch' };
    return { item: data.item };
  } catch (error) {
    console.error('Failed to add import batch item:', error);
    return { error: 'Network error' };
  }
}

export async function removePLImportBatchItem(batchId: string, itemId: string): Promise<{ ok?: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/pl-imports/batches/${batchId}/items/${itemId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to remove period from import batch' };
    return { ok: Boolean(data.ok) };
  } catch (error) {
    console.error('Failed to remove import batch item:', error);
    return { error: 'Network error' };
  }
}

export async function approvePLImportBatch(batchId: string): Promise<{ approval?: PLImportBatchApprovalDto; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/pl-imports/batches/${batchId}/approve`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to approve import batch' };
    return { approval: data as PLImportBatchApprovalDto };
  } catch (error) {
    console.error('Failed to approve import batch:', error);
    return { error: 'Network error' };
  }
}

export const ActionTypes = {
  TRANSCRIPT_UPLOADED: 'transcript_uploaded',
  TRANSCRIPT_PASTED: 'transcript_pasted',
  GRADE_GENERATED: 'grade_generated',
  PDF_GENERATED: 'pdf_generated',
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',
} as const;
