"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, ChartNoAxesColumn, FileText, LogIn, Medal, Users } from "lucide-react";
import { useSession } from "@/lib/auth/session-context";
import { getEffectiveRole } from "@/lib/auth/roles";
import {
  getActionLogs,
  getActionStats,
  getAdminUsageSummary,
  type ActionStatsSummary,
  type AdminUsageSummary,
} from "@/lib/ptbiz-api";
import "@/styles/dashboard.css";

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

function statTone(value: number | null | undefined) {
  if (value === null || value === undefined) return "neutral";
  if (value >= 80) return "strong";
  if (value >= 40) return "steady";
  return "watch";
}

function coerceCount(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric);
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

  const topActionTotal = useMemo(
    () => (actionStats?.stats || []).slice(0, 8).reduce((sum, row) => sum + coerceCount(row?._count?.actionType), 0),
    [actionStats?.stats],
  );

  return (
    <section className="dashboard-v2 space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="dashboard-v2-hero rounded-(--radius-2xl) border border-border bg-surface p-6 shadow-sm"
      >
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{greeting}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Live usage data is now connected in the Next.js stack with role-aware access controls.
        </p>
      </motion.header>

      {isError && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger shadow-sm">
          Failed to load usage metrics. Confirm backend availability and refresh.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Logins (30d)",
            value: isAdmin ? adminUsage?.totals.successfulLogins ?? null : null,
            icon: LogIn,
            helper: isAdmin ? "Successful authenticated entries" : "Admin metric",
          },
          {
            label: "Coaching Analyses",
            value: isAdmin ? adminUsage?.totals.coachingAnalyses ?? null : coachStats.totalGrades,
            icon: Medal,
            helper: "Saved grading outputs",
          },
          {
            label: "PDF Exports",
            value: isAdmin ? adminUsage?.totals.pdfExports ?? null : coachStats.totalPdfs,
            icon: FileText,
            helper: "Generated downloadable reports",
          },
          {
            label: "Active Users",
            value: isAdmin ? adminUsage?.totals.activeUsers ?? null : coachStats.totalTranscripts,
            icon: Users,
            helper: isAdmin ? "Users active in selected window" : "Transcripts uploaded by you",
          },
        ].map((card, index) => {
          const tone = statTone(card.value);
          const Icon = card.icon;
          return (
            <motion.article
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.03 * index }}
              className={`dashboard-v2-stat dashboard-v2-stat-${tone} rounded-xl border border-border bg-surface p-4`}
            >
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <Icon size={16} className="dashboard-v2-stat-icon" />
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{card.value ?? "-"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.helper}</p>
            </motion.article>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="dashboard-v2-panel rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Activity size={15} />
              Recent Activity
            </h2>
            {isLoading && <span className="text-xs text-muted-foreground">Refreshing...</span>}
          </div>
          <div className="space-y-2">
            {!activityFeed.length && !isLoading && (
              <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                No activity captured yet.
              </p>
            )}
            {activityFeed.map((item) => (
              <article key={item.id} className="dashboard-v2-activity-item rounded-lg border border-border bg-white px-3 py-2">
                <div className="flex items-start gap-3">
                  {item.userImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="mt-0.5 h-7 w-7 rounded-full object-cover" src={item.userImageUrl} alt={item.userName || "User"} />
                  ) : (
                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-background text-[10px] font-semibold text-muted-foreground">
                      {(item.userName || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{item.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.userName ? `${item.userName} · ` : ""}
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-v2-panel rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ChartNoAxesColumn size={15} />
              Top Action Types
            </h2>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
              Total {topActionTotal}
            </span>
          </div>
          <div className="space-y-2">
            {(actionStats?.stats || []).slice(0, 8).map((item) => {
              const itemCount = coerceCount(item?._count?.actionType);
              return (
                <div key={item.actionType} className="rounded-lg border border-border bg-white px-3 py-2">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="truncate pr-3 text-sm">{item.actionType}</p>
                    <p className="text-sm font-semibold">{itemCount}</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-background">
                    <div
                      className="h-1.5 rounded-full bg-accent transition-all"
                      style={{
                        width: `${topActionTotal > 0 ? Math.max((itemCount / topActionTotal) * 100, 6) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {!actionStats?.stats?.length && (
              <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                Action statistics will appear once tracked events are generated.
              </p>
            )}
          </div>

          {Boolean(adminUsage?.topUsers.length) && (
            <>
              <h3 className="mb-2 mt-6 flex items-center gap-2 text-sm font-semibold">
                <Users size={14} />
                Top Users
              </h3>
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
