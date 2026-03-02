import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import IntroVideo, { IntroContext, type RevealedTools } from './components/IntroVideo'
import Home from './pages/Home'
import DiscoveryCallGrader from './pages/DiscoveryCallGrader'
import DannyFinancialAudit from './pages/danny/DannyFinancialAudit'
import DannyCloserCallGrader from './pages/danny/DannyCloserCallGrader'
import DannyCompensationCalculator from './pages/danny/DannyCompensationCalculator'
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

function forceIntroKey(userId: string) {
  return `ptbiz_force_intro_once:${userId}`
}

function App() {
  const [introReady, setIntroReady] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const [revealed, setRevealed] = useState<RevealedTools>(lockedRevealed)
  const [showOnboardingPrep, setShowOnboardingPrep] = useState(false)
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0)
  const queryClient = useQueryClient()

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getMe,
    staleTime: 60_000,
  })
  const user = meQuery.data?.user ?? null
  const loading = meQuery.isLoading
  const logoutMutation = useMutation({ mutationFn: logout })

  const role = useMemo(() => getEffectiveRole(user), [user])
  const isAdmin = useMemo(() => isAdminUser(user), [user])
  const canAccessSalesDiscovery = role === 'admin' || role === 'advisor'

  useEffect(() => {
    if (!user) return

    // Intro video has been retired; unlock tools immediately after login.
    localStorage.setItem(introSeenKey(user.id), 'true')
    localStorage.removeItem(forceIntroKey(user.id))
    setOnboardingStepIndex(0)
    setShowIntro(false)
    setShowOnboardingPrep(false)
    setRevealed(defaultRevealed)
    setIntroReady(true)
  }, [user])

  const handleAuthenticated = (nextUser: User) => {
    setShowOnboardingPrep(false)
    setOnboardingStepIndex(0)
    setIntroReady(false)
    queryClient.setQueryData<{ user?: User; error?: string }>(['auth', 'me'], { user: nextUser })
    queryClient.removeQueries({ queryKey: ['home'] })
  }

  const handleLogout = async () => {
    await logoutMutation.mutateAsync()
    queryClient.setQueryData<{ user?: User; error?: string }>(['auth', 'me'], { error: 'Not authenticated' })
    queryClient.removeQueries({ queryKey: ['home'] })
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
      localStorage.removeItem(forceIntroKey(user.id))
    }
    setRevealed(defaultRevealed)
    setShowIntro(false)
  }

  if (loading) {
    return (
      <div className="app-loader-screen">
        <img className="app-loader-logo" src={SITE_LOGO_URL} alt="BizCoach Suite" />
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
          <img className="app-loader-logo" src={SITE_LOGO_URL} alt="BizCoach Suite" />
          <div className="app-loader-copy">
            <h2>Preparing your onboarding</h2>
            <p>Lining up your welcome video and tool access so your walkthrough plays cleanly.</p>
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
        <img className="app-loader-logo" src={SITE_LOGO_URL} alt="BizCoach Suite" />
        <p>Preparing your dashboard…</p>
      </div>
    )
  }

  return (
      <IntroContext.Provider value={{ revealed }}>
      {showIntro && (
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
            <Route path="pl-calculator" element={<DannyFinancialAudit />} />
            <Route path="pl-calculator-advanced" element={<Navigate to="/pl-calculator" replace />} />
            <Route path="compensation-calculator" element={<DannyCompensationCalculator />} />
            <Route
              path="sales-discovery-grader"
              element={canAccessSalesDiscovery ? <DannyCloserCallGrader /> : <Navigate to="/" replace />}
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
