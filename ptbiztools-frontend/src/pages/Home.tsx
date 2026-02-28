import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  BarChart3,
  Calculator,
  ClipboardList,
  Clock,
  FileText,
  Lock,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { API_BASE, getActionStats, getAdminUsageSummary, type ActionStatsSummary, type AdminUsageSummary } from '../services/api'
import { useIntro } from '../components/IntroVideo'
import type { User } from '../services/api'
import './Home.css'

interface HomeProps {
  user: User
  isAdmin: boolean
}

interface Stats {
  totalTranscripts: number
  totalPdfs: number
  totalGrades: number
  recentActivity: Array<{
    id: string
    actionType: string
    description: string
    createdAt: string
  }>
  chartData: Array<{
    date: string
    graded: number
    pdfs: number
  }>
}

interface ActivityFeedItem {
  id: string
  actionType: string
  description: string
  createdAt: string
}

interface ToolItem {
  title: string
  description: string
  icon: typeof ClipboardList
  path: string
  color: string
  revealKey: 'discovery' | 'pl'
  unlockTime: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const tools: ToolItem[] = [
  {
    title: 'Discovery Call Grader',
    description: 'Grade and analyze discovery call transcripts with immediate coaching feedback.',
    icon: ClipboardList,
    path: '/discovery-call-grader',
    color: 'var(--color-accent)',
    revealKey: 'discovery',
    unlockTime: '10s',
  },
  {
    title: 'P&L Calculator',
    description: 'Analyze clinic financial performance with benchmarks and action steps.',
    icon: Calculator,
    path: '/pl-calculator',
    color: 'var(--color-success)',
    revealKey: 'pl',
    unlockTime: '14s',
  },
]

const trackedGradeActions = new Set([
  'grade_generated',
  'transcript_graded',
  'GRADE_GENERATED',
  'TRANSCRIPT_GRADED',
  'pl_report_generated',
])
const trackedTranscriptActions = new Set(['transcript_uploaded', 'transcript_pasted', 'TRANSCRIPT_UPLOADED', 'TRANSCRIPT_PASTED'])
const trackedPdfActions = new Set(['pdf_generated', 'PDF_GENERATED', 'pl_pdf_generated'])

export default function Home({ user, isAdmin }: HomeProps) {
  const navigate = useNavigate()
  const { revealed } = useIntro()

  const [stats, setStats] = useState<Stats>({
    totalTranscripts: 0,
    totalPdfs: 0,
    totalGrades: 0,
    recentActivity: [],
    chartData: [],
  })
  const [loading, setLoading] = useState(true)
  const [adminUsage, setAdminUsage] = useState<AdminUsageSummary | null>(null)
  const [actionStats, setActionStats] = useState<ActionStatsSummary | null>(null)
  const [adminUsageLoading, setAdminUsageLoading] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/actions`)
        const data = await response.json()
        const logs = data.logs || []

        const transcripts = logs.filter((log: { actionType: string }) => trackedTranscriptActions.has(log.actionType)).length
        const pdfs = logs.filter((log: { actionType: string }) => trackedPdfActions.has(log.actionType)).length
        const grades = logs.filter((log: { actionType: string }) => trackedGradeActions.has(log.actionType)).length

        const chartData = []
        for (let i = 6; i >= 0; i -= 1) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]

          const dayLogs = logs.filter((log: { createdAt?: string }) => log.createdAt?.startsWith(dateStr))

          chartData.push({
            date: date.toLocaleDateString('en-US', { weekday: 'short' }),
            graded: dayLogs.filter((log: { actionType: string }) => trackedGradeActions.has(log.actionType)).length,
            pdfs: dayLogs.filter((log: { actionType: string }) => trackedPdfActions.has(log.actionType)).length,
          })
        }

        setStats({
          totalTranscripts: transcripts,
          totalPdfs: pdfs,
          totalGrades: grades,
          recentActivity: logs.slice(0, 10),
          chartData,
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  useEffect(() => {
    if (!isAdmin) return

    const fetchAdminUsage = async () => {
      setAdminUsageLoading(true)
      const [usageResult, actionResult] = await Promise.all([
        getAdminUsageSummary(30),
        getActionStats(),
      ])
      if (usageResult.data) setAdminUsage(usageResult.data)
      if (actionResult.data) setActionStats(actionResult.data)
      setAdminUsageLoading(false)
    }

    fetchAdminUsage()
  }, [isAdmin])

  const greeting = useMemo(() => {
    if (isAdmin) return `Welcome back, ${user.name.split(' ')[0]}`
    return `Coach Dashboard, ${user.name.split(' ')[0]}`
  }, [isAdmin, user.name])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const diff = Date.now() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getActionIcon = (type: string) => {
    if (type === 'login_success') return <Users size={16} />
    if (type === 'coaching_analysis_saved') return <ClipboardList size={16} />
    if (type === 'pdf_export_saved') return <FileText size={16} />
    if (type === 'pl_report_generated') return <Calculator size={16} />
    if (type === 'pl_pdf_generated') return <FileText size={16} />
    if (trackedTranscriptActions.has(type)) return <FileText size={16} />
    if (trackedPdfActions.has(type)) return <ClipboardList size={16} />
    if (trackedGradeActions.has(type)) return <ClipboardList size={16} />
    return <Clock size={16} />
  }

  const isToolUnlocked = (tool: ToolItem) => isAdmin || revealed[tool.revealKey]
  const adminChartData = adminUsage?.byDay.map((day) => ({
    date: day.label,
    analyses: day.analyses,
    pdfs: day.pdfs,
    logins: day.logins,
  })) || []

  const adminActivityFeed = useMemo<ActivityFeedItem[]>(() => {
    if (!adminUsage) return []

    const loginEvents = adminUsage.recent.loginEvents.map((event) => ({
      id: `login-${event.id}`,
      actionType: 'login_success',
      description: `${event.user?.name || 'Unknown User'} logged in`,
      createdAt: event.createdAt,
    }))

    const coachingEvents = adminUsage.recent.analyses.map((analysis) => ({
      id: `analysis-${analysis.id}`,
      actionType: 'coaching_analysis_saved',
      description: `${analysis.user?.name || 'Unknown User'} saved coaching analysis (${analysis.score}/100)`,
      createdAt: analysis.createdAt,
    }))

    const pdfEvents = adminUsage.recent.pdfExports.map((pdfExport) => ({
      id: `pdf-${pdfExport.id}`,
      actionType: 'pdf_export_saved',
      description: `${pdfExport.user?.name || 'Unknown User'} exported a coaching PDF`,
      createdAt: pdfExport.createdAt,
    }))

    const actionEvents = adminUsage.recent.actions.map((action) => ({
      id: `action-${action.id}`,
      actionType: action.actionType || 'activity',
      description: action.description || 'Activity recorded',
      createdAt: action.createdAt,
    }))

    return [...loginEvents, ...coachingEvents, ...pdfEvents, ...actionEvents]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)
  }, [adminUsage])

  const activityFeed = isAdmin ? adminActivityFeed : stats.recentActivity
  const isActivityLoading = isAdmin ? (loading || adminUsageLoading) : loading

  return (
    <div className="home">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="dashboard">
        <motion.div variants={itemVariants} className="dashboard-header">
          <h1>{greeting}</h1>
          <p>{isAdmin ? 'Admin usage dashboard' : 'Your coaching tools unlock during onboarding'}</p>
        </motion.div>

        {isAdmin && (
          <>
            <motion.div variants={itemVariants} className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(233, 69, 96, 0.15)' }}>
                  <ClipboardList size={22} style={{ color: 'var(--color-accent)' }} />
                </div>
                <div className="stat-content">
                  <span className="stat-value">{adminUsageLoading ? '...' : adminUsage?.totals.coachingAnalyses ?? 0}</span>
                  <span className="stat-label">Coaching Analyses</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(45, 138, 78, 0.15)' }}>
                  <FileText size={22} style={{ color: 'var(--color-success)' }} />
                </div>
                <div className="stat-content">
                  <span className="stat-value">{adminUsageLoading ? '...' : adminUsage?.totals.pdfExports ?? 0}</span>
                  <span className="stat-label">PDF Exports</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(15, 52, 96, 0.25)' }}>
                  <TrendingUp size={22} style={{ color: 'var(--color-medium)' }} />
                </div>
                <div className="stat-content">
                  <span className="stat-value">{adminUsageLoading ? '...' : adminUsage?.totals.successfulLogins ?? 0}</span>
                  <span className="stat-label">Successful Logins</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(196, 127, 23, 0.15)' }}>
                  <Users size={22} style={{ color: 'var(--color-warning)' }} />
                </div>
                <div className="stat-content">
                  <span className="stat-value">{adminUsageLoading ? '...' : adminUsage?.totals.activeUsers ?? 0}</span>
                  <span className="stat-label">Active Users</span>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="chart-section">
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">
                    <BarChart3 size={20} />
                    <h3>Activity Overview</h3>
                  </div>
                  <div className="chart-legend">
                    <span className="legend-item">
                      <span className="legend-dot" style={{ background: 'var(--color-accent)' }} />
                      Analyses
                    </span>
                    <span className="legend-item">
                      <span className="legend-dot" style={{ background: 'var(--color-success)' }} />
                      PDF Exports
                    </span>
                    <span className="legend-item">
                      <span className="legend-dot" style={{ background: 'var(--color-warning)' }} />
                      Logins
                    </span>
                  </div>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={adminChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGraded" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e94560" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#e94560" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPdfs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: '#16161f',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8,
                        }}
                      />
                      <Area type="monotone" dataKey="analyses" stroke="#e94560" fillOpacity={1} fill="url(#colorGraded)" strokeWidth={2} />
                      <Area type="monotone" dataKey="pdfs" stroke="#22c55e" fillOpacity={1} fill="url(#colorPdfs)" strokeWidth={2} />
                      <Area type="monotone" dataKey="logins" stroke="#f59e0b" fillOpacity={1} fill="url(#colorLogins)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="chart-section">
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
                        <span>{entry.title || 'Team Member'}</span>
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
                      <p>No SQL usage records yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="chart-section">
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
                        <span>{entry._count.actionType}</span>
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
            </motion.div>
          </>
        )}

        <motion.div variants={itemVariants} className="tools-section">
          <h2>{isAdmin ? 'Coach Tools (Preview)' : 'Your Coaching Tools'}</h2>
          {!isAdmin && (
            <p className="coach-tools-subhead">
              These unlock at specific moments in Danny&apos;s onboarding video.
            </p>
          )}

          <div className="tools-grid">
            {tools.map((tool) => {
              const unlocked = isToolUnlocked(tool)

              return (
                <motion.button
                  key={tool.path}
                  onClick={() => unlocked && navigate(tool.path)}
                  className={`tool-card ${unlocked ? '' : 'tool-card-locked'}`}
                  whileHover={unlocked ? { scale: 1.02, y: -4 } : {}}
                  whileTap={unlocked ? { scale: 0.98 } : {}}
                >
                  {!unlocked && !isAdmin && (
                    <div className="tool-locked-overlay">
                      <Lock size={15} />
                      <span>Unlocks at {tool.unlockTime}</span>
                    </div>
                  )}

                  <div className="tool-icon" style={{ background: `${tool.color}20` }}>
                    <tool.icon size={24} style={{ color: tool.color }} />
                  </div>
                  <div className="tool-content">
                    <h3>{tool.title}</h3>
                    <p>{tool.description}</p>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="activity-section">
          <h2>{isAdmin ? 'Recent App Activity' : 'Your Team Activity Feed'}</h2>
          <div className="activity-list">
            {isActivityLoading ? (
              <div className="activity-loading">Loading activity…</div>
            ) : activityFeed.length === 0 ? (
              <div className="activity-empty">
                <Activity size={40} strokeWidth={1} />
                <p>No activity yet.</p>
              </div>
            ) : (
              activityFeed.map((item) => (
                <div key={item.id} className="activity-item">
                  <div className="activity-icon">{getActionIcon(item.actionType)}</div>
                  <div className="activity-content">
                    <span className="activity-desc">{item.description}</span>
                    <span className="activity-time">
                      <Clock size={12} />
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
