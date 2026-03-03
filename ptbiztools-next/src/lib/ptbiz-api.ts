export const API_BASE = (() => {
  if (typeof window !== "undefined") {
    const runtimeHost = window.location.hostname;
    const isLocalRuntime = runtimeHost === "localhost" || runtimeHost === "127.0.0.1";
    const envApiBase = process.env.NEXT_PUBLIC_API_URL?.trim();
    return isLocalRuntime ? envApiBase || "http://localhost:3000/api" : "/api";
  }

  return process.env.NEXT_PUBLIC_API_URL?.trim() || "/api";
})();

export interface TeamMember {
  id: string;
  name: string;
  title?: string | null;
  teamSection?: string | null;
  imageUrl?: string | null;
  role?: string;
  hasPassword?: boolean;
  passwordHash?: string;
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
  imageUrl?: string | null;
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
  user?: {
    id: string;
    name: string;
    imageUrl?: string | null;
  } | null;
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

export interface ActionLog {
  id: string;
  actionType: string;
  description: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    imageUrl?: string | null;
  } | null;
}

export interface ActionLogInput {
  actionType: string;
  description: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
}

export interface GradeStoragePayload {
  score: number;
  outcome: string;
  summary: string;
  phaseScores: unknown;
  strengths: string[];
  improvements: string[];
  redFlags: string[];
  deidentifiedTranscript?: string;
  transcript?: string;
  gradingVersion?: string;
  deterministic?: unknown;
  criticalBehaviors?: unknown;
  confidence?: number;
  qualityGate?: unknown;
  evidence?: unknown;
  transcriptHash?: string;
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

export type SalesGradeProgramProfile = "Rainmaker" | "Mastermind";
export type SalesGradeBehaviorStatus = "pass" | "fail" | "unknown";

export interface SalesGradeV2Phase {
  score: number;
  summary: string;
  evidence: string[];
}

export interface SalesGradeV2Behavior {
  status: SalesGradeBehaviorStatus;
  note: string;
  evidence: string[];
}

export interface SalesGradeV2Response {
  version: "v2";
  programProfile: SalesGradeProgramProfile;
  phaseScores: {
    connection: SalesGradeV2Phase;
    discovery: SalesGradeV2Phase;
    gap_creation: SalesGradeV2Phase;
    temp_check: SalesGradeV2Phase;
    solution: SalesGradeV2Phase;
    close: SalesGradeV2Phase;
    followup: SalesGradeV2Phase;
  };
  criticalBehaviors: {
    free_consulting: SalesGradeV2Behavior;
    discount_discipline: SalesGradeV2Behavior;
    emotional_depth: SalesGradeV2Behavior;
    time_management: SalesGradeV2Behavior;
    personal_story: SalesGradeV2Behavior;
  };
  deterministic: {
    weightedPhaseScore: number;
    penaltyPoints: number;
    unknownPenalty: number;
    overallScore: number;
  };
  confidence: {
    score: number;
    evidenceCoverage: number;
    quoteVerificationRate: number;
    transcriptQuality: number;
  };
  qualityGate: {
    accepted: boolean;
    reasons: string[];
  };
  highlights: {
    topStrength: string;
    topImprovement: string;
    prospectSummary: string;
  };
  metadata: {
    closer: string;
    outcome?: string;
    model: string;
  };
  diagnostics?: {
    verifiedQuotes: number;
    totalQuotes: number;
    unverifiedQuotes: string[];
  };
  storage?: {
    redactedTranscript: string;
    transcriptHash: string;
  };
}

export const ActionTypes = {
  TRANSCRIPT_UPLOADED: "transcript_uploaded",
  TRANSCRIPT_PASTED: "transcript_pasted",
  GRADE_GENERATED: "grade_generated",
  PDF_GENERATED: "pdf_generated",
  SESSION_STARTED: "session_started",
  SESSION_ENDED: "session_ended",
} as const;

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${input}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });

  const data = (await response.json().catch(() => ({}))) as T & { error?: string; needsSetup?: boolean };

  if (!response.ok) {
    const message = data?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  try {
    const members = await requestJson<TeamMember[]>("/auth/team");
    return members.map((member) => ({
      ...member,
      hasPassword: member.hasPassword ?? Boolean(member.passwordHash),
    }));
  } catch (error) {
    console.error("Failed to get team members:", error);
    return [];
  }
}

export async function login(
  userId: string,
  password: string,
  rememberMe: boolean,
): Promise<{ user?: User; error?: string; needsSetup?: boolean }> {
  try {
    const sessionId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const data = await requestJson<{ user: User }>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, password, rememberMe, sessionId }),
    });

    return { user: data.user };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return { error: message };
  }
}

export async function logout(): Promise<boolean> {
  try {
    await requestJson<{ message: string }>("/auth/logout", { method: "POST" });
    return true;
  } catch (error) {
    console.error("Logout error:", error);
    return false;
  }
}

export async function getMe(): Promise<{ user?: User; error?: string }> {
  try {
    const data = await requestJson<{ user: User }>("/auth/me");
    return { user: data.user };
  } catch {
    return { error: "Not authenticated" };
  }
}

export async function setupPassword(
  userId: string,
  password: string,
): Promise<{ user?: User; error?: string }> {
  try {
    const data = await requestJson<{ user: User }>("/auth/setup-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, password }),
    });

    return { user: data.user };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Setup failed";
    return { error: message };
  }
}

export async function getActionLogs(
  limit = 50,
): Promise<{ logs?: ActionLog[]; total?: number; error?: string }> {
  try {
    const data = await requestJson<{ logs: ActionLog[]; total: number }>(`/actions?limit=${limit}`);
    return { logs: data.logs || [], total: data.total || 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return { error: message };
  }
}

export async function getAdminUsageSummary(
  days = 30,
): Promise<{ data?: AdminUsageSummary; error?: string }> {
  try {
    const data = await requestJson<AdminUsageSummary>(`/analytics/admin-summary?days=${days}`);
    return { data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return { error: message };
  }
}

export async function getActionStats(): Promise<{ data?: ActionStatsSummary; error?: string }> {
  try {
    const data = await requestJson<ActionStatsSummary>("/actions/stats");
    return { data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return { error: message };
  }
}

export async function logAction(input: ActionLogInput): Promise<void> {
  try {
    await fetch(`${API_BASE}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
  } catch (error) {
    console.error("Failed to log action:", error);
  }
}

export async function saveCoachingAnalysis(
  input: CoachingAnalysisSaveInput,
): Promise<{ analysisId?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/analytics/coaching-analyses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });

    const data = (await response.json()) as { analysis?: { id?: string }; error?: string };
    if (!response.ok) return { error: data.error || "Failed to save coaching analysis" };
    return { analysisId: data.analysis?.id };
  } catch (error) {
    console.error("Failed to save coaching analysis:", error);
    return { error: "Network error" };
  }
}

export async function savePdfExport(
  input: PdfExportSaveInput,
): Promise<{ pdfExportId?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/analytics/pdf-exports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });

    const data = (await response.json()) as { pdfExport?: { id?: string }; error?: string };
    if (!response.ok) return { error: data.error || "Failed to save PDF export" };
    return { pdfExportId: data.pdfExport?.id };
  } catch (error) {
    console.error("Failed to save pdf export:", error);
    return { error: "Network error" };
  }
}

export async function extractTranscriptFromFile(file: File): Promise<{
  text?: string;
  sourceType?: "pdf" | "text";
  filename?: string;
  wordCount?: number;
  charCount?: number;
  error?: string;
}> {
  try {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch(`${API_BASE}/transcripts/extract`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = (await response.json()) as {
      text?: string;
      sourceType?: "pdf" | "text";
      filename?: string;
      wordCount?: number;
      charCount?: number;
      error?: string;
    };

    if (!response.ok) {
      return { error: data.error || "Failed to extract transcript text" };
    }

    return {
      text: data.text,
      sourceType: data.sourceType,
      filename: data.filename,
      wordCount: data.wordCount,
      charCount: data.charCount,
    };
  } catch (error) {
    console.error("Failed to extract transcript file:", error);
    return { error: "Network error" };
  }
}

export async function gradeDannySalesCallV2(input: {
  transcript: string;
  closer: string;
  outcome?: "Won" | "Lost";
  program: SalesGradeProgramProfile;
  prospectName?: string;
  callMeta?: {
    durationMinutes?: number;
  };
}): Promise<{ data?: SalesGradeV2Response; error?: string; reasons?: string[] }> {
  try {
    const response = await fetch(`${API_BASE}/danny-tools/sales-grade-v2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });

    const data = (await response.json()) as SalesGradeV2Response & {
      error?: string;
      reasons?: string[];
    };
    if (!response.ok) {
      return {
        error: data.error || "Failed to grade sales call",
        reasons: Array.isArray(data.reasons) ? data.reasons : [],
      };
    }

    return {
      data: data as SalesGradeV2Response,
    };
  } catch (error) {
    console.error("Failed to grade Danny sales call v2:", error);
    return { error: "Network error", reasons: [] };
  }
}

export async function extractDannyPLFromPdf(file: File): Promise<{
  extracted?: Record<string, unknown>;
  model?: string;
  error?: string;
}> {
  try {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch(`${API_BASE}/danny-tools/pl-extract`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = (await response.json()) as {
      extracted?: Record<string, unknown>;
      model?: string;
      error?: string;
    };

    if (!response.ok) {
      return { error: data.error || "Failed to extract P&L fields from PDF" };
    }

    return {
      extracted: data.extracted,
      model: data.model,
    };
  } catch (error) {
    console.error("Failed to extract Danny P&L PDF:", error);
    return { error: "Network error" };
  }
}
