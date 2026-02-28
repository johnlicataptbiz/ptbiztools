import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ClipboardList, Calculator, FileText, Clock, TrendingUp, Users, BarChart3, Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { API_BASE } from '../utils/api'
import { useIntro } from '../components/IntroVideo'
import './Home.css'

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

const SkeletonCard = () => (
  <div className="stat-card">
    <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12 }} />
    <div className="stat-content">
      <div className="skeleton skeleton-text" style={{ width: 40, height: 28, marginBottom: 8 }} />
      <div className="skeleton skeleton-text-sm" style={{ width: 100 }} />
    </div>
  </div>
)

const SkeletonActivity = () => (
  <div className="activity-item">
    <div className="skeleton skeleton-avatar" />
    <div className="activity-content">
      <div className="skeleton skeleton-text" style={{ width: '70%' }} />
      <div className="skeleton skeleton-text-sm" style={{ width: '30%', marginTop: 8 }} />
    </div>
  </div>
)

export default function Home() {
  const navigate = useNavigate()
  const { revealed } = useIntro()
  const [stats, setStats] = useState<Stats>({
    totalTranscripts: 0,
    totalPdfs: 0,
    totalGrades: 0,
    recentActivity: [],
    chartData: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/actions`)
        const data = await res.json()
        
        const logs = data.logs || []
        const transcripts = logs.filter((l: any) => l.actionType === 'TRANSCRIPT_UPLOADED').length
        const pdfs = logs.filter((l: any) => l.actionType === 'PDF_GENERATED').length
        const grades = logs.filter((l: any) => l.actionType === 'TRANSCRIPT_GRADED').length
        
        // Generate chart data from last 7 days
        const chartData = []
        for (let i = 6; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]
          
          const dayLogs = logs.filter((l: any) => 
            l.createdAt?.startsWith(dateStr)
          )
          
          chartData.push({
            date: date.toLocaleDateString('en-US', { weekday: 'short' }),
            graded: dayLogs.filter((l: any) => l.actionType === 'TRANSCRIPT_GRADED').length,
            pdfs: dayLogs.filter((l: any) => l.actionType === 'PDF_GENERATED').length
          })
        }
        
        setStats({
          totalTranscripts: transcripts,
          totalPdfs: pdfs,
          totalGrades: grades,
          recentActivity: logs.slice(0, 10),
          chartData
        })
      } catch (err) {
        console.error('Failed to fetch stats:', err)
        // Use mock data on error
        setStats({
          totalTranscripts: 12,
          totalPdfs: 8,
          totalGrades: 15,
          recentActivity: [],
          chartData: [
            { date: 'Mon', graded: 2, pdfs: 1 },
            { date: 'Tue', graded: 3, pdfs: 2 },
            { date: 'Wed', graded: 1, pdfs: 1 },
            { date: 'Thu', graded: 4, pdfs: 2 },
            { date: 'Fri', graded: 3, pdfs: 1 },
            { date: 'Sat', graded: 1, pdfs: 1 },
            { date: 'Sun', graded: 1, pdfs: 0 },
          ]
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'TRANSCRIPT_UPLOADED': return <FileText size={16} />
      case 'PDF_GENERATED': return <ClipboardList size={16} />
      case 'TRANSCRIPT_GRADED': return <ClipboardList size={16} />
      default: return <Clock size={16} />
    }
  }

  const tools = [
    {
      title: 'Discovery Call Grader',
      description: 'Grade and analyze discovery call transcripts with AI-powered feedback',
      icon: ClipboardList,
      path: '/discovery-call-grader',
      color: 'var(--color-accent)',
      revealKey: 'discovery'
    },
    {
      title: 'P&L Calculator',
      description: 'Financial analysis and profit & loss tools for cash-based PT practices',
      icon: Calculator,
      path: '/pl-calculator',
      color: 'var(--color-success)',
      revealKey: 'pl'
    }
  ]

  // Check if we're in reveal mode (intro hasn't been shown yet)
  const isRevealMode = revealed !== undefined && (revealed.discovery === false || revealed.pl === false)

  return (
    <div className="home">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="dashboard"
      >
        <motion.div variants={itemVariants} className="dashboard-header">
          <h1>Welcome back</h1>
          <p>PT Biz Tools Dashboard</p>
        </motion.div>

        <motion.div variants={itemVariants} className="stats-grid">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(233, 69, 96, 0.15)' }}>
                  <ClipboardList size={22} style={{ color: 'var(--color-accent)' }} />
                </div>
                <div className="stat-content">
                  <span className="stat-value">{stats.totalGrades}</span>
                  <span className="stat-label">Calls Graded</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(45, 138, 78, 0.15)' }}>
                  <FileText size={22} style={{ color: 'var(--color-success)' }} />
                </div>
                <div className="stat-content">
                  <span className="stat-value">{stats.totalTranscripts}</span>
                  <span className="stat-label">Transcripts Processed</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(15, 52, 96, 0.25)' }}>
                  <TrendingUp size={22} style={{ color: 'var(--color-medium)' }} />
                </div>
                <div className="stat-content">
                  <span className="stat-value">{stats.totalPdfs}</span>
                  <span className="stat-label">Reports Generated</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(196, 127, 23, 0.15)' }}>
                  <Users size={22} style={{ color: 'var(--color-warning)' }} />
                </div>
                <div className="stat-content">
                  <span className="stat-value">1</span>
                  <span className="stat-label">Active Coaches</span>
                </div>
              </div>
            </>
          )}
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
                  Calls Graded
                </span>
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: 'var(--color-success)' }} />
                  PDFs Generated
                </span>
              </div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGraded" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e94560" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#e94560" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPdfs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#71717a" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#71717a" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#16161f', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                    }}
                    labelStyle={{ color: '#f4f4f5' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="graded" 
                    stroke="#e94560" 
                    fillOpacity={1} 
                    fill="url(#colorGraded)"
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pdfs" 
                    stroke="#22c55e" 
                    fillOpacity={1} 
                    fill="url(#colorPdfs)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="tools-section">
          <h2>Tools</h2>
          <div className="tools-grid">
            {tools.map((tool, index) => {
              const shouldShow = !isRevealMode || revealed[tool.revealKey as 'discovery' | 'pl']
              return (
                <motion.button
                  key={tool.path}
                  onClick={() => navigate(tool.path)}
                  className="tool-card"
                  whileHover={shouldShow ? { scale: 1.02, y: -4 } : {}}
                  whileTap={shouldShow ? { scale: 0.98 } : {}}
                  initial={{ opacity: 0, y: 20, filter: 'blur(10px)', scale: 0.9 }}
                  animate={{ 
                    opacity: shouldShow ? 1 : 0, 
                    y: shouldShow ? 0 : 20,
                    filter: shouldShow ? 'blur(0px)' : 'blur(10px)',
                    scale: shouldShow ? 1 : 0.9,
                    pointerEvents: shouldShow ? 'auto' : 'none'
                  }}
                  transition={{ delay: 0.1 + index * 0.15, duration: 0.6 }}
                >
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
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {loading ? (
              <>
                <SkeletonActivity />
                <SkeletonActivity />
                <SkeletonActivity />
              </>
            ) : stats.recentActivity.length === 0 ? (
              <div className="activity-empty">
                <Activity size={40} strokeWidth={1} />
                <p>No activity yet. Start by grading a call!</p>
              </div>
            ) : (
              stats.recentActivity.map((item) => (
                <div key={item.id} className="activity-item">
                  <div className="activity-icon">
                    {getActionIcon(item.actionType)}
                  </div>
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
