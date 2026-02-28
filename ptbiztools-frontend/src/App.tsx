import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import IntroVideo, { IntroContext, type RevealedTools } from './components/IntroVideo'
import Home from './pages/Home'
import DiscoveryCallGrader from './pages/DiscoveryCallGrader'
import PLCalculator from './pages/PLCalculator'
import Login from './pages/Login'
import AnalysisHistory from './pages/AnalysisHistory'
import KnowledgeCenter from './pages/KnowledgeCenter'
import MediaManager from './pages/MediaManager'
import { getMe, logout, type User } from './services/api'
import { isAdminUser } from './utils/roles'
import { SITE_LOGO_URL } from './constants/branding'
import './index.css'
import './components/IntroVideo.css'

const defaultRevealed: RevealedTools = { discovery: true, pl: true }
const lockedRevealed: RevealedTools = { discovery: false, pl: false }

function introSeenKey(userId: string) {
  return `ptbiz_intro_seen:${userId}`
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [introReady, setIntroReady] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const [revealed, setRevealed] = useState<RevealedTools>(lockedRevealed)

  const isAdmin = useMemo(() => isAdminUser(user), [user])

  useEffect(() => {
    const bootstrap = async () => {
      const { user: me } = await getMe()
      setUser(me || null)
      setLoading(false)
    }

    bootstrap()
  }, [])

  useEffect(() => {
    if (!user) return

    if (isAdminUser(user)) {
      setShowIntro(false)
      setRevealed(defaultRevealed)
      setIntroReady(true)
      return
    }

    const hasSeenIntro = localStorage.getItem(introSeenKey(user.id))
    if (hasSeenIntro) {
      setShowIntro(false)
      setRevealed(defaultRevealed)
      setIntroReady(true)
      return
    }

    setShowIntro(true)
    setRevealed(lockedRevealed)
    setIntroReady(true)
  }, [user])

  const handleAuthenticated = (nextUser: User) => {
    setIntroReady(false)
    setUser(nextUser)
  }

  const handleLogout = async () => {
    await logout()
    setUser(null)
    setIntroReady(false)
    setShowIntro(false)
    setRevealed(lockedRevealed)
  }

  const handleRevealChange = (partial: Partial<RevealedTools>) => {
    setRevealed((prev) => ({ ...prev, ...partial }))
  }

  const handleIntroComplete = () => {
    if (user) {
      localStorage.setItem(introSeenKey(user.id), 'true')
    }
    setRevealed(defaultRevealed)
    setShowIntro(false)
  }

  if (loading) {
    return (
      <div className="app-loader-screen">
        <img src={SITE_LOGO_URL} alt="PT Biz" className="app-loader-logo" />
        <p>Loading PT Biz Tools...</p>
      </div>
    )
  }

  if (!user) {
    return <Login onAuthenticated={handleAuthenticated} />
  }

  if (!introReady) {
    return (
      <div className="app-loader-screen">
        <img src={SITE_LOGO_URL} alt="PT Biz" className="app-loader-logo" />
        <p>Preparing your dashboard…</p>
      </div>
    )
  }

  return (
    <IntroContext.Provider value={{ revealed }}>
      {showIntro && !isAdmin && (
        <IntroVideo
          onComplete={handleIntroComplete}
          onRevealChange={handleRevealChange}
        />
      )}

      <Router>
        <Routes>
          <Route
            path="/"
            element={<Layout user={user} isAdmin={isAdmin} onLogout={handleLogout} />}
          >
            <Route index element={<Home user={user} isAdmin={isAdmin} />} />
            <Route
              path="discovery-call-grader"
              element={isAdmin ? <Navigate to="/" replace /> : <DiscoveryCallGrader />}
            />
            <Route
              path="pl-calculator"
              element={isAdmin ? <Navigate to="/" replace /> : <PLCalculator />}
            />
            <Route path="analyses" element={<AnalysisHistory isAdmin={isAdmin} />} />
            <Route path="knowledge" element={<KnowledgeCenter isAdmin={isAdmin} />} />
            <Route
              path="media"
              element={isAdmin ? <MediaManager /> : <Navigate to="/" replace />}
            />
            <Route path="login" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </IntroContext.Provider>
  )
}

export default App
