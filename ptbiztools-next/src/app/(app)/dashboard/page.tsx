"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState, useMemo, type ComponentType, type CSSProperties } from "react";
import {
  Activity,
  BarChart3,
  ClipboardList,
  Clock,
  FileText,
  LogIn,
  Medal,
  ScrollText,
  Users,
} from "lucide-react";
import { ClinicIcon, type ClinicSvgName } from "@/components/clinic/ClinicIcon";
import { CLINIC_SVGS, ClinicIcon, type ClinicSvgName } from "@/constants/clinic-svgs";
import { useSession } from "@/lib/auth/session-context";
import { getEffectiveRole } from "@/lib/auth/roles";
import { TourAnchors } from "@/lib/tour/anchors";
import { TOOL_BADGES } from "@/constants/tool-badges";
import { ChangelogModal } from "@/components/changelog/ChangelogModal";
import { History } from "lucide-react";
import {
  getActionLogs,
  getActionStats,
  getAdminUsageSummary,
  getZoomIngestSummary,
  runZoomBackfill,
  runZoomQueuedJobs,
  getZoomAnalyses,
  type ActionStatsSummary,
  type AdminUsageSummary,
  type ZoomIngestSummary,
  type ZoomAnalysisRecord,
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

interface DailyChartPoint {
  date: string;
  graded: number;
  pdfs: number;
  logins: number;
}

interface ActionBreakdownEntry {
  actionType: string;
  count: number;
}

interface CoachStats {
  totalTranscripts: number;
  totalPdfs: number;
  totalGrades: number;
  actionBreakdown: ActionBreakdownEntry[];
  recentActivity: ActivityFeedItem[];
  chartData: DailyChartPoint[];
}

interface HomeAdminUsageData {
  adminUsage: AdminUsageSummary | null;
  actionStats: ActionStatsSummary | null;
}

interface ZoomControlState {
  runningQueue: boolean;
  runningBackfill: boolean;
  message: string | null;
}

interface ToolCard {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string; style?: CSSProperties }>;
  badgeUrl?: string;
  color: string;
  adminsAndAdvisorsOnly?: boolean;
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
const trackedLoginActions = new Set(["login_success", "LOGIN_SUCCESS"]);

const TOOL_CARDS: ToolCard[] = [
{
    title: "Discovery Call Grader",
    description: "Grade and analyze discovery call transcripts with immediate coaching feedback.",
    href: "/discovery-call-grader",
    icon: () => <ClinicIcon name="network" size={28} />,
    badgeUrl: TOOL_BADGES.discovery,
    color: "var(--accent)",
  },
  {
    title: "P&L Calculator",
    description: "Analyze clinic financial performance with benchmarks and action steps.",
    href: "/pl-calculator",
    icon: () => <ClinicIcon name="performance" size={28} />,
    badgeUrl: TOOL_BADGES.pl,
    color: "var(--success)",
  },
  {
    title: "Comp Calculator",
    description: "Model compensation structures and targets with PT Biz assumptions.",
    href: "/compensation-calculator",
    icon: () => <ClinicIcon name="kpiBarbell" size={28} />,
    badgeUrl: TOOL_BADGES.comp,
    color: "var(--warning)",
  },
  {
    title: "Sales Grader",
    description: "Run the deterministic sales discovery grading system for closer calls.",
    href: "/sales-discovery-grader",
    icon: () => <ClinicIcon name="growth" size={28} />,
    badgeUrl: TOOL_BADGES.sales,
    color: "#1f6f8b",
    adminsAndAdvisorsOnly: true,
  },
  {
    title: "Analyses",
    description: "Review saved grading records, P&L audits, and generated exports.",
    href: "/analyses",
    icon: ScrollText,
    color: "#5b7fa6",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const defaultStats: CoachStats = {
  totalTranscripts: 0,
  totalPdfs: 0,
  totalGrades: 0,
  actionBreakdown: [],
  recentActivity: [],
  chartData: [],
};

async function fetchCoachStats(): Promise<CoachStats> {
  const result = await getActionLogs(120);
  if (result.error) throw new Error(result.error);

  const logs = result.logs || [];

  const transcripts = logs.filter((log) => trackedTranscriptActions.has(log.actionType)).length;
  const pdfs = logs.filter((log) => trackedPdfActions.has(log.actionType)).length;
  const grades = logs.filter((log) => trackedGradeActions.has(log.actionType)).length;
  const actionBreakdown = Array.from(
    logs.reduce((acc, log) => {
      const key = (log.actionType || "activity").trim() || "activity";
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map<string, number>()),
  )
    .map(([actionType, count]) => ({ actionType, count }))
    .sort((a, b) => b.count - a.count);

  const chartData: DailyChartPoint[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0] || "";

    const dayLogs = logs.filter((log) => (log.createdAt || "").startsWith(dateStr));

    chartData.push({
      date: date.toLocaleDateString("en-US", { weekday: "short" }),
      graded: dayLogs.filter((log) => trackedGradeActions.has(log.actionType)).length,
      pdfs: dayLogs.filter((log) => trackedPdfActions.has(log.actionType)).length,
      logins: dayLogs.filter((log) => trackedLoginActions.has(log.actionType)).length,
    });
  }

  return {
    totalTranscripts: transcripts,
    totalPdfs: pdfs,
    totalGrades: grades,
    actionBreakdown,
    recentActivity: logs.slice(0, 20).map((log) => ({
      id: log.id,
      actionType: log.actionType,
      description: log.description,
      createdAt: log.createdAt,
      userName: log.user?.name || undefined,
      userImageUrl: log.user?.imageUrl ?? null,
    })),
    chartData,
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

function coerceCount(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric);
}

function getActionIcon(type: string) {
  if (type === "login_success") return <Users size={16} />;
  if (type === "coaching_analysis_saved") return <ClipboardList size={16} />;
  if (type === "pdf_export_saved") return <FileText size={16} />;
  if (type === "pl_report_generated") return <Calculator size={16} />;
  if (type === "pl_pdf_generated") return <FileText size={16} />;
  if (trackedTranscriptActions.has(type)) return <FileText size={16} />;
  if (trackedPdfActions.has(type)) return <ClipboardList size={16} />;
  if (trackedGradeActions.has(type)) return <ClipboardList size={16} />;
  return <Clock size={16} />;
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function DashboardPage() {
  const { user } = useSession();
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [zoomDetail, setZoomDetail] = useState<ZoomAnalysisRecord | null>(null);
  const [zoomControlState, setZoomControlState] = useState<ZoomControlState>({
    runningQueue: false,
    runningBackfill: false,
    message: null,
  });

  const role = getEffectiveRole(user);
  const isAdmin = role === "admin";
  const isAdvisor = role === "advisor";

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

  const zoomReportsQuery = useQuery({
    queryKey: ["home", "zoom-analyses", isAdmin ? "admin" : "advisor"],
    queryFn: async () => {
      const result = await getZoomAnalyses({ limit: 12 });
      if (result.error) throw new Error(result.error);
      return result.data ?? { analyses: [], total: 0 };
    },
    enabled: isAdmin || isAdvisor,
    staleTime: 60_000,
  });

  const zoomSummaryQuery = useQuery({
    queryKey: ["home", "zoom-ingest-summary"],
    queryFn: async () => {
      const result = await getZoomIngestSummary();
      if (result.error) throw new Error(result.error);
      return result.data ?? null;
    },
    enabled: isAdmin,
    staleTime: 20_000,
  });

  const coachStats = coachStatsQuery.data ?? defaultStats;
  const adminUsage = adminUsageQuery.data?.adminUsage ?? null;
  const actionStats = adminUsageQuery.data?.actionStats ?? null;
  const zoomSummary: ZoomIngestSummary | null = zoomSummaryQuery.data ?? null;
  const coachActionStats = coachStats.actionBreakdown;
  const zoomReports = zoomReportsQuery.data?.analyses ?? [];

  const greeting = useMemo(() => {
    const firstName = user?.name.split(" ")[0] || "Coach";
    return isAdmin ? `Welcome back, ${firstName}` : `Coach Dashboard, ${firstName}`;
  }, [isAdmin, user?.name]);

  const adminChartData = useMemo<DailyChartPoint[]>(() => {
    return (adminUsage?.byDay || []).map((day) => ({
      date: day.label,
      graded: day.analyses,
      pdfs: day.pdfs,
      logins: day.logins,
    }));
  }, [adminUsage?.byDay]);

  const toolCards = useMemo(() => {
    return TOOL_CARDS.filter((tool) => !tool.adminsAndAdvisorsOnly || isAdmin || isAdvisor);
  }, [isAdmin, isAdvisor]);

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
  const chartData = useMemo(() => {
    const raw = isAdmin ? adminChartData : coachStats.chartData;
    const maxPoints = isAdmin ? 10 : 7;
    return raw.slice(-maxPoints);
  }, [adminChartData, coachStats.chartData, isAdmin]);
  const isLoading = isAdmin ? adminUsageQuery.isLoading : coachStatsQuery.isLoading;

  const topActionTotal = useMemo(() => {
    if (isAdmin) {
      return (actionStats?.stats || []).slice(0, 8).reduce((sum, row) => sum + coerceCount(row?._count?.actionType), 0);
    }
    return coachActionStats.slice(0, 8).reduce((sum, row) => sum + coerceCount(row.count), 0);
  }, [actionStats?.stats, coachActionStats, isAdmin]);

  const chartMax = useMemo(() => {
    const values = chartData.flatMap((row) => [row.graded, row.pdfs, row.logins]);
    return Math.max(1, ...values);
  }, [chartData]);

  const queuedJobs = zoomSummary?.jobsByStatus.queued ?? 0;
  const processingJobs = zoomSummary?.jobsByStatus.processing ?? 0;
  const failedJobs = zoomSummary?.jobsByStatus.failed ?? 0;
  const completedJobs = zoomSummary?.jobsByStatus.completed ?? 0;
  const gradedRecordings = zoomSummary?.recordingsByStatus.graded ?? 0;
  const queuedRecordings = zoomSummary?.recordingsByStatus.queued ?? 0;

  async function handleRunZoomQueue() {
    setZoomControlState((prev) => ({ ...prev, runningQueue: true, message: null }));
    const result = await runZoomQueuedJobs({ limit: 10, includeFailed: true, deleteAfterIngest: false });
    if (result.error) {
      setZoomControlState((prev) => ({ ...prev, runningQueue: false, message: result.error || "Queue run failed" }));
      return;
    }

    setZoomControlState((prev) => ({
      ...prev,
      runningQueue: false,
      message: `Processed ${result.data?.processed || 0} jobs (${result.data?.succeeded || 0} succeeded, ${result.data?.failed || 0} failed).`,
    }));
    await zoomSummaryQuery.refetch();
  }

  async function handleBackfillRecent() {
    setZoomControlState((prev) => ({ ...prev, runningBackfill: true, message: null }));
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    const result = await runZoomBackfill({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      dryRun: false,
      maxMeetingsPerConnection: 250,
    });

    if (result.error) {
      setZoomControlState((prev) => ({ ...prev, runningBackfill: false, message: result.error || "Backfill failed" }));
      return;
    }

    setZoomControlState((prev) => ({
      ...prev,
      runningBackfill: false,
      message: `Backfill scanned ${result.data?.meetingsScanned || 0} meetings and queued ${result.data?.jobsQueued || 0} jobs.`,
    }));
    await zoomSummaryQuery.refetch();
  }

  return (
    <div className="home">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="dashboard">
<motion.section variants={itemVariants} className="dashboard-v2-hero dashboard-header clinic-pattern-overlay clinic-pattern-growth" style={{ position: 'relative' }}>
  <ClinicBackground pattern="growth" opacity={0.06} />
  <div className="dashboard-header-content" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: 'relative', zIndex: 1 }}>
    <h1 style={{ margin: 0, fontSize: "24px" }}>{greeting}</h1>
    <button 
      className="changelog-trigger-btn"
      onClick={() => setChangelogOpen(true)}
      title="View changelog"
      style={{ marginLeft: "auto" }}
    >
      <History size={18} />
    </button>
  </div>
</motion.section>

        <motion.section variants={itemVariants} className="stats-grid">
          <article className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(233, 69, 96, 0.15)" }}>
              <Medal size={22} style={{ color: "var(--accent)" }} />
            </div>
            <div className="stat-content">
              <span className="stat-value">
                {isLoading ? "..." : isAdmin ? (adminUsage?.totals.coachingAnalyses ?? 0) : coachStats.totalGrades}
              </span>
              <span className="stat-label">Coaching Analyses</span>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(45, 138, 78, 0.15)" }}>
              <FileText size={22} style={{ color: "var(--success)" }} />
            </div>
            <div className="stat-content">
              <span className="stat-value">
                {isLoading ? "..." : isAdmin ? (adminUsage?.totals.pdfExports ?? 0) : coachStats.totalPdfs}
              </span>
              <span className="stat-label">PDF Exports</span>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(15, 52, 96, 0.25)" }}>
              {isAdmin ? <LogIn size={22} style={{ color: "var(--info)" }} /> : <ClipboardList size={22} style={{ color: "var(--info)" }} />}
            </div>
            <div className="stat-content">
              <span className="stat-value">
                {isLoading ? "..." : isAdmin ? (adminUsage?.totals.successfulLogins ?? 0) : coachStats.totalTranscripts}
              </span>
              <span className="stat-label">{isAdmin ? "Successful Logins" : "Transcripts Uploaded"}</span>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(196, 127, 23, 0.15)" }}>
              <Users size={22} style={{ color: "var(--warning)" }} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{isLoading ? "..." : isAdmin ? (adminUsage?.totals.activeUsers ?? 0) : activityFeed.length}</span>
              <span className="stat-label">{isAdmin ? "Active Users" : "Recent Activities"}</span>
            </div>
          </article>
        </motion.section>

        <motion.section variants={itemVariants} className="chart-section">
          <div className="chart-card">
            <div className="chart-header">
                <div className="chart-title">
                  <BarChart3 size={20} />
                  <h3>Activity Overview</h3>
                </div>
                <span className="chart-window-label">{isAdmin ? "Last 10 days" : "Last 7 days"}</span>
                <div className="chart-legend">
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: "var(--accent)" }} />
                  Analyses
                </span>
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: "var(--success)" }} />
                  PDF Exports
                </span>
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: "var(--warning)" }} />
                  Logins
                </span>
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="activity-empty">
                <p>No chart data yet.</p>
              </div>
            ) : (
              <div className="overview-rows">
                {chartData.map((row) => (
                  <div key={row.date} className="overview-row">
                    <span className="overview-date">{row.date}</span>
                    <div className="overview-bars">
                      <div className="overview-bar overview-bar-analyses" style={{ width: `${(row.graded / chartMax) * 100}%` }} />
                      <div className="overview-bar overview-bar-pdfs" style={{ width: `${(row.pdfs / chartMax) * 100}%` }} />
                      <div className="overview-bar overview-bar-logins" style={{ width: `${(row.logins / chartMax) * 100}%` }} />
                    </div>
                    <span className="overview-total">{row.graded + row.pdfs + row.logins}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="tools-section" data-tour={TourAnchors.dashboard.tools}>

          <div className="tools-grid">
            {toolCards.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.href} href={tool.href} className="tool-card tool-card-live">
                  <div className="tool-icon">
                    {tool.badgeUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tool.badgeUrl}
                        alt={tool.title}
                        className="tool-badge"
                        onError={(event) => {
                          (event.currentTarget as HTMLImageElement).style.display = "none";
                          const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = "inline-flex";
                        }}
                      />
                    ) : null}
                    <span className="tool-icon-fallback" style={{ display: tool.badgeUrl ? "none" : "inline-flex" }}>
                      <Icon size={28} style={{ color: tool.color }} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.section>

        <div className="dashboard-v2-grid-2">
          {isAdmin && (
            <motion.section variants={itemVariants} className="chart-section">
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">
                    <PhoneCall size={20} />
                    <h3>Zoom Ingestion</h3>
                  </div>
                </div>
                <div className="zoom-ingest-grid">
                  <div className="zoom-pill"><span>Connections</span><strong>{zoomSummary?.connections ?? 0}</strong></div>
                  <div className="zoom-pill"><span>Jobs Queued</span><strong>{queuedJobs}</strong></div>
                  <div className="zoom-pill"><span>Processing</span><strong>{processingJobs}</strong></div>
                  <div className="zoom-pill"><span>Failed</span><strong>{failedJobs}</strong></div>
                  <div className="zoom-pill"><span>Completed</span><strong>{completedJobs}</strong></div>
                  <div className="zoom-pill"><span>Recordings Graded</span><strong>{gradedRecordings}</strong></div>
                  <div className="zoom-pill"><span>Recordings Queued</span><strong>{queuedRecordings}</strong></div>
                </div>

                <div className="zoom-controls">
                  <button
                    type="button"
                    className="zoom-action-btn"
                    onClick={() => void zoomSummaryQuery.refetch()}
                    disabled={zoomSummaryQuery.isLoading}
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    className="zoom-action-btn"
                    onClick={() => void handleRunZoomQueue()}
                    disabled={zoomControlState.runningQueue}
                  >
                    {zoomControlState.runningQueue ? "Running..." : "Run Queue"}
                  </button>
                  <button
                    type="button"
                    className="zoom-action-btn"
                    onClick={() => void handleBackfillRecent()}
                    disabled={zoomControlState.runningBackfill}
                  >
                    {zoomControlState.runningBackfill ? "Backfilling..." : "Backfill Last 30d"}
                  </button>
                </div>

                {zoomControlState.message ? <p className="zoom-message">{zoomControlState.message}</p> : null}

                {zoomSummary?.recentFailures && zoomSummary.recentFailures.length > 0 ? (
                  <div className="zoom-failure-list">
                    <strong>Recent Failures</strong>
                    {zoomSummary.recentFailures.slice(0, 4).map((failure) => (
                      <div key={failure.id} className="zoom-failure-row">
                        <span>{failure.topic || failure.meetingUuid}</span>
                        <small>{failure.lastError || "Unknown error"}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="activity-empty">
                    <p>No recent ingestion failures.</p>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {isAdmin && (
            <motion.section variants={itemVariants} className="chart-section">
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">
                    <Users size={20} />
                    <h3>Top User Activity</h3>
                  </div>
                </div>
                <div className="top-users-list">
                  {(adminUsage?.topUsers || []).slice(0, 8).map((entry) => (
                    <div key={entry.userId} className="top-user-row">
                      <div className="top-user-left">
                        <strong>{entry.name}</strong>
                        <span>{entry.title || "Team Member"}</span>
                      </div>
                      <div className="top-user-right">
                        <span>L {entry.logins}</span>
                        <span>A {entry.analyses}</span>
                        <span>P {entry.pdfs}</span>
                      </div>
                    </div>
                  ))}
                  {(!adminUsage?.topUsers || adminUsage.topUsers.length === 0) && (
                    <div className="activity-empty">
                      <p>No usage records yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          )}

          {isAdmin && (
            <motion.section variants={itemVariants} className="chart-section">
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">
                    <Activity size={20} />
                    <h3>Top Event Types</h3>
                  </div>
                </div>
                <div className="top-users-list">
                  {(actionStats?.stats || []).slice(0, 8).map((entry) => (
                    <div key={entry.actionType} className="top-user-row">
                      <div className="top-user-left">
                        <strong>{entry.actionType}</strong>
                        <span>Action log event type</span>
                      </div>
                      <div className="top-user-right">
                        <span>{coerceCount(entry._count.actionType)}</span>
                      </div>
                    </div>
                  ))}
                  {(!actionStats?.stats || actionStats.stats.length === 0) && (
                    <div className="activity-empty">
                      <p>No action stats found yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          )}
        </div>

        {!isAdmin && (
          <motion.section variants={itemVariants} className="chart-section">
            <div className="chart-card">
              <div className="chart-header">
                <div className="chart-title">
                  <Activity size={20} />
                  <h3>Top Action Types</h3>
                </div>
              </div>
              <div className="top-users-list">
                {coachActionStats.slice(0, 8).map((entry) => (
                  <div key={entry.actionType} className="top-user-row">
                    <div className="top-user-left">
                      <strong>{entry.actionType}</strong>
                      <span>Action log event type</span>
                    </div>
                    <div className="top-user-right">
                      <span>{coerceCount(entry.count)}</span>
                    </div>
                  </div>
                ))}
                {coachActionStats.length === 0 && (
                  <div className="activity-empty">
                    <p>No action stats found yet.</p>
                  </div>
                )}
              </div>
              <p className="top-action-total">Total {topActionTotal}</p>
            </div>
          </motion.section>
        )}

        {(isAdmin || isAdvisor) && (
          <motion.section variants={itemVariants} className="chart-section">
            <div className="chart-card zoom-report-card">
              <div className="chart-header">
                <div className="chart-title">
                  <ScrollText size={20} />
                  <h3>Zoom Graded Reports</h3>
                </div>
                <button
                  type="button"
                  className="zoom-action-btn"
                  onClick={() => zoomReportsQuery.refetch()}
                  disabled={zoomReportsQuery.isLoading}
                >
                  Refresh
                </button>
              </div>
              <div className="zoom-report-list">
                {zoomReportsQuery.isLoading ? (
                  <div className="activity-empty">
                    <p>Loading reports…</p>
                  </div>
                ) : zoomReports.length === 0 ? (
                  <div className="activity-empty">
                    <p>No Zoom grading records yet.</p>
                  </div>
                ) : (
                  zoomReports.map((report) => (
                    <div key={report.id} className="zoom-report-row">
                      <div>
                        <strong>{report.clientName || report.summary}</strong>
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="zoom-report-meta">
                        <span className="zoom-report-score">{report.score.toFixed(0)}</span>
                        <span>{report.outcome}</span>
                        {isAdmin && report.coachName && <span>Coach: {report.coachName}</span>}
                        <span>{report.zoomRecording?.topic || "Zoom"}</span>
                      </div>
                      <div className="zoom-report-actions">
                        <button type="button" className="zoom-action-btn" onClick={() => setZoomDetail(report)}>
                          View Transcript
                        </button>
                        {report.zoomRecording?.downloadUrl && (
                          <a
                            href={report.zoomRecording.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="zoom-action-btn"
                          >
                            Play Recording
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.section>
        )}

        <motion.section variants={itemVariants} className="activity-section" data-tour={TourAnchors.dashboard.activity}>
          <h2>{isAdmin ? "Recent App Activity" : "Your Team Activity Feed"}</h2>
          <div className="activity-list">
            {isLoading ? (
              <div className="activity-loading">Loading activity…</div>
            ) : activityFeed.length === 0 ? (
              <div className="activity-empty">
                <Activity size={40} strokeWidth={1} />
                <p>No activity yet.</p>
              </div>
            ) : (
              activityFeed.map((item) => {
                const initials = getInitials(item.userName);
                return (
                  <div key={item.id} className="activity-item">
                    <div className="activity-user-avatar">
                      {item.userImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.userImageUrl}
                          alt={item.userName || "User"}
                          className="activity-avatar-img"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                            const sibling = e.currentTarget.nextSibling as HTMLElement | null;
                            if (sibling) sibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div className="activity-avatar-fallback" style={{ display: item.userImageUrl ? "none" : "flex" }}>
                        {item.userName ? initials : getActionIcon(item.actionType)}
                      </div>
                    </div>
                    <div className="activity-content">
                      <span className="activity-desc">{item.description}</span>
                      <span className="activity-time">
                        <Clock size={12} />
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.section>
      </motion.div>
      {zoomDetail && (
        <div className="zoom-report-modal" role="dialog" aria-modal="true">
          <div className="zoom-report-modal-backdrop" onClick={() => setZoomDetail(null)} />
          <div className="zoom-report-modal-card">
            <header>
              <h3>Transcript for {zoomDetail.clientName || "Untitled"}</h3>
              <button type="button" onClick={() => setZoomDetail(null)}>
                Close
              </button>
            </header>
            <div className="zoom-report-modal-body">
              <p>
                <strong>Score:</strong> {zoomDetail.score.toFixed(0)} · <strong>Outcome:</strong> {zoomDetail.outcome}
              </p>
              <p>{zoomDetail.summary}</p>
              <div className="zoom-transcript-block">
                <pre>{zoomDetail.redactedTranscript || "Transcript unavailable."}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      <ChangelogModal isOpen={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </div>
  );
}
