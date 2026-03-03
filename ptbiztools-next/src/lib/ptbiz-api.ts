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
