"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSession } from "@/lib/auth/session-context";
import { getEffectiveRole } from "@/lib/auth/roles";
import {
  getActionLogs,
  getActionStats,
  getAdminUsageSummary,
  type ActionStatsSummary,
  type AdminUsageSummary,
} from "@/lib/ptbiz-api";

interface ActivityFeedItem {
  id: string;
  actionType: string;
  description: string;
  createdAt: string;
  userName?: string;
  userImageUrl?: string | null;
}

interface CoachStats {
  totalTranscripts: number;
  totalPdfs: number;
  totalGrades: number;
  recentActivity: ActivityFeedItem[];
}

interface HomeAdminUsageData {
  adminUsage: AdminUsageSummary | null;
  actionStats: ActionStatsSummary | null;
}

const trackedGradeActions = new Set([
  "grade_generated",
  "transcript_graded",
  "GRADE_GENERATED",
  "TRANSCRIPT_GRADED",
  "pl_report_generated",
]);
const trackedTranscriptActions = new Set([
  "transcript_uploaded",
  "transcript_pasted",
  "TRANSCRIPT_UPLOADED",
  "TRANSCRIPT_PASTED",
]);
const trackedPdfActions = new Set(["pdf_generated", "PDF_GENERATED", "pl_pdf_generated"]);

const defaultStats: CoachStats = {
  totalTranscripts: 0,
  totalPdfs: 0,
  totalGrades: 0,
  recentActivity: [],
};

async function fetchCoachStats(): Promise<CoachStats> {
  const result = await getActionLogs(120);
  if (result.error) throw new Error(result.error);

  const logs = result.logs || [];

  const transcripts = logs.filter((log) => trackedTranscriptActions.has(log.actionType)).length;
  const pdfs = logs.filter((log) => trackedPdfActions.has(log.actionType)).length;
  const grades = logs.filter((log) => trackedGradeActions.has(log.actionType)).length;

  return {
    totalTranscripts: transcripts,
    totalPdfs: pdfs,
    totalGrades: grades,
    recentActivity: logs.slice(0, 20).map((log) => ({
      id: log.id,
      actionType: log.actionType,
      description: log.description,
      createdAt: log.createdAt,
      userName: log.user?.name || undefined,
      userImageUrl: log.user?.imageUrl ?? null,
    })),
  };
}

async function fetchAdminUsageData(): Promise<HomeAdminUsageData> {
  const [usageResult, actionResult] = await Promise.all([getAdminUsageSummary(30), getActionStats()]);

  if (usageResult.error) {
    throw new Error(usageResult.error);
  }

  return {
    adminUsage: usageResult.data ?? null,
    actionStats: actionResult.data ?? null,
  };
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function DashboardPage() {
  const { user } = useSession();

  const role = getEffectiveRole(user);
  const isAdmin = role === "admin";

  const coachStatsQuery = useQuery({
    queryKey: ["home", "coach-stats"],
    queryFn: fetchCoachStats,
    enabled: !isAdmin,
    staleTime: 30_000,
  });

  const adminUsageQuery = useQuery({
    queryKey: ["home", "admin-usage"],
    queryFn: fetchAdminUsageData,
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const coachStats = coachStatsQuery.data ?? defaultStats;
  const adminUsage = adminUsageQuery.data?.adminUsage ?? null;
  const actionStats = adminUsageQuery.data?.actionStats ?? null;

  const greeting = useMemo(() => {
    const firstName = user?.name.split(" ")[0] || "Coach";
    return isAdmin ? `Welcome back, ${firstName}` : `Coach Dashboard, ${firstName}`;
  }, [isAdmin, user?.name]);

  const adminActivityFeed = useMemo<ActivityFeedItem[]>(() => {
    if (!adminUsage) return [];

    const loginEvents = adminUsage.recent.loginEvents.map((event) => ({
      id: `login-${event.id}`,
      actionType: "login_success",
      description: `${event.user?.name || "Unknown User"} logged in`,
      createdAt: event.createdAt,
      userName: event.user?.name || undefined,
      userImageUrl: event.user?.imageUrl ?? null,
    }));

    const coachingEvents = adminUsage.recent.analyses.map((analysis) => ({
      id: `analysis-${analysis.id}`,
      actionType: "coaching_analysis_saved",
      description: `${analysis.user?.name || "Unknown User"} saved coaching analysis (${analysis.score}/100)`,
      createdAt: analysis.createdAt,
      userName: analysis.user?.name || undefined,
      userImageUrl: analysis.user?.imageUrl ?? null,
    }));

    const pdfEvents = adminUsage.recent.pdfExports.map((pdfExport) => ({
      id: `pdf-${pdfExport.id}`,
      actionType: "pdf_export_saved",
      description: `${pdfExport.user?.name || "Unknown User"} exported a coaching PDF`,
      createdAt: pdfExport.createdAt,
      userName: pdfExport.user?.name || undefined,
      userImageUrl: pdfExport.user?.imageUrl ?? null,
    }));

    const actionEvents = adminUsage.recent.actions.map((action) => ({
      id: `action-${action.id}`,
      actionType: action.actionType || "activity",
      description: action.description || "Activity recorded",
      createdAt: action.createdAt,
      userName: action.user?.name || undefined,
      userImageUrl: action.user?.imageUrl ?? null,
    }));

    return [...loginEvents, ...coachingEvents, ...pdfEvents, ...actionEvents]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);
  }, [adminUsage]);

  const activityFeed = isAdmin ? adminActivityFeed : coachStats.recentActivity;
  const isLoading = isAdmin ? adminUsageQuery.isLoading : coachStatsQuery.isLoading;
  const isError = isAdmin ? adminUsageQuery.isError : coachStatsQuery.isError;

  return (
    <section className="space-y-6">
      <header className="rounded-(--radius-2xl) border border-border bg-surface p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold">{greeting}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Live usage data is now connected in the Next.js stack with role-aware access controls.
        </p>
      </header>

      {isError && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          Failed to load usage metrics. Confirm backend availability and refresh.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted-foreground">Logins (30d)</p>
          <p className="mt-1 text-2xl font-semibold">{adminUsage?.totals.successfulLogins ?? "-"}</p>
        </article>
        <article className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted-foreground">Coaching Analyses</p>
          <p className="mt-1 text-2xl font-semibold">
            {isAdmin ? (adminUsage?.totals.coachingAnalyses ?? "-") : coachStats.totalGrades}
          </p>
        </article>
        <article className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted-foreground">PDF Exports</p>
          <p className="mt-1 text-2xl font-semibold">
            {isAdmin ? (adminUsage?.totals.pdfExports ?? "-") : coachStats.totalPdfs}
          </p>
        </article>
        <article className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted-foreground">Active Users</p>
          <p className="mt-1 text-2xl font-semibold">
            {isAdmin ? (adminUsage?.totals.activeUsers ?? "-") : coachStats.totalTranscripts}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isAdmin ? "Users active in selected window" : "Transcripts uploaded by you"}
          </p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Activity</h2>
            {isLoading && <span className="text-xs text-muted-foreground">Refreshing...</span>}
          </div>
          <div className="space-y-2">
            {!activityFeed.length && !isLoading && (
              <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                No activity captured yet.
              </p>
            )}
            {activityFeed.map((item) => (
              <article key={item.id} className="rounded-lg border border-border bg-white px-3 py-2">
                <p className="text-sm">{item.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.userName ? `${item.userName} · ` : ""}
                  {formatDate(item.createdAt)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold">Top Action Types</h2>
          <div className="space-y-2">
            {(actionStats?.stats || []).slice(0, 8).map((item) => (
              <div key={item.actionType} className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2">
                <p className="text-sm">{item.actionType}</p>
                <p className="text-sm font-semibold">{item._count.actionType}</p>
              </div>
            ))}
            {!actionStats?.stats?.length && (
              <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                Action statistics will appear once tracked events are generated.
              </p>
            )}
          </div>

          {Boolean(adminUsage?.topUsers.length) && (
            <>
              <h3 className="mb-2 mt-6 text-sm font-semibold">Top Users</h3>
              <div className="space-y-2">
                {(adminUsage?.topUsers || []).slice(0, 5).map((userRow) => (
                  <div key={userRow.userId} className="rounded-lg border border-border bg-white px-3 py-2">
                    <p className="text-sm font-medium">{userRow.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {userRow.logins} logins · {userRow.analyses} analyses · {userRow.pdfs} PDFs
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
