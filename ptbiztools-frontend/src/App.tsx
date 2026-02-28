import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import IntroVideo, { IntroContext, type RevealedTools } from './components/IntroVideo'
import Home from './pages/Home'
import DiscoveryCallGrader from './pages/DiscoveryCallGrader'
import PLCalculator from './pages/PLCalculator'
import SalesDiscoveryGrader from './pages/SalesDiscoveryGrader'
import Login from './pages/Login'
import AnalysisHistory from './pages/AnalysisHistory'
import KnowledgeCenter from './pages/KnowledgeCenter'
import MediaManager from './pages/MediaManager'
import { getMe, logout, type User } from './services/api'
import { getEffectiveRole, isAdminUser } from './utils/roles'
import { SITE_LOGO_URL } from './constants/branding'
import './index.css'
import './components/IntroVideo.css'

const defaultRevealed: RevealedTools = { discovery: true, pl: true }
const lockedRevealed: RevealedTools = { discovery: false, pl: false }
const onboardingSteps = [
  'Building your coaching suite...',
  'Adding tools to your workspace...',
  'Verifying your access level...',
]

function introSeenKey(userId: string) {
  return `ptbiz_intro_seen:${userId}`
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [introReady, setIntroReady] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const [revealed, setRevealed] = useState<RevealedTools>(lockedRevealed)
  const [showOnboardingPrep, setShowOnboardingPrep] = useState(false)
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0)

  const role = useMemo(() => getEffectiveRole(user), [user])
  const isAdmin = useMemo(() => isAdminUser(user), [user])
  const canAccessSalesDiscovery = role === 'admin' || role === 'advisor'

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

    let stepTimer: ReturnType<typeof setInterval> | undefined
    let completeTimer: ReturnType<typeof setTimeout> | undefined

    if (isAdminUser(user)) {
      setShowOnboardingPrep(false)
      setShowIntro(false)
      setRevealed(defaultRevealed)
      setIntroReady(true)
      return
    }

    const hasSeenIntro = localStorage.getItem(introSeenKey(user.id))
    if (hasSeenIntro) {
      setShowOnboardingPrep(false)
      setShowIntro(false)
      setRevealed(defaultRevealed)
      setIntroReady(true)
      return
    }

    setShowOnboardingPrep(true)
    setOnboardingStepIndex(0)
    setShowIntro(false)
    setRevealed(lockedRevealed)
    setIntroReady(false)

    stepTimer = setInterval(() => {
      setOnboardingStepIndex((prev) => Math.min(prev + 1, onboardingSteps.length - 1))
    }, 780)

    completeTimer = setTimeout(() => {
      setShowOnboardingPrep(false)
      setShowIntro(true)
      setIntroReady(true)
    }, 2350)

    return () => {
      if (stepTimer) clearInterval(stepTimer)
      if (completeTimer) clearTimeout(completeTimer)
    }
  }, [user])

  const handleAuthenticated = (nextUser: User) => {
    setShowOnboardingPrep(false)
    setOnboardingStepIndex(0)
    setIntroReady(false)
    setUser(nextUser)
  }

  const handleLogout = async () => {
    await logout()
    setUser(null)
    setIntroReady(false)
    setShowOnboardingPrep(false)
    setOnboardingStepIndex(0)
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
    if (showOnboardingPrep && !isAdmin) {
      const progress = ((onboardingStepIndex + 1) / onboardingSteps.length) * 100

      return (
        <div className="app-loader-screen app-loader-screen-staging">
          <img src={SITE_LOGO_URL} alt="PT Biz" className="app-loader-logo" />
          <div className="app-loader-copy">
            <h2>Preparing your onboarding</h2>
            <p>Lining up video, audio, and tool access so your walkthrough plays cleanly.</p>
          </div>
          <div className="app-loader-step-list" aria-live="polite">
            {onboardingSteps.map((step, index) => {
              const state = index < onboardingStepIndex ? 'done' : index === onboardingStepIndex ? 'active' : 'pending'
              return (
                <div key={step} className={`app-loader-step app-loader-step-${state}`}>
                  <span>{step}</span>
                </div>
              )
            })}
          </div>
          <div className="app-loader-progress-track" aria-hidden="true">
            <span className="app-loader-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )
    }

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
            <Route path="discovery-call-grader" element={<DiscoveryCallGrader />} />
            <Route path="pl-calculator" element={<PLCalculator />} />
            <Route
              path="sales-discovery-grader"
              element={canAccessSalesDiscovery ? <SalesDiscoveryGrader /> : <Navigate to="/" replace />}
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
