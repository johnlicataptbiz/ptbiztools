import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import DiscoveryCallGrader from './pages/DiscoveryCallGrader'
import PLCalculator from './pages/PLCalculator'
import Login from './pages/Login'

import IntroVideo from './components/IntroVideo'
import './index.css'
import './components/IntroVideo.css'

function App() {
  const [showIntro, setShowIntro] = useState<boolean | null>(null)

  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('ptbiz_intro_seen')
    setShowIntro(!hasSeenIntro)
  }, [])

  if (showIntro === null) {
    return null
  }

  return (
    <>
      {showIntro && <IntroVideo onComplete={() => setShowIntro(false)} />}
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="discovery-call-grader" element={<DiscoveryCallGrader />} />
            <Route path="pl-calculator" element={<PLCalculator />} />
            <Route path="login" element={<Login />} />

          </Route>
        </Routes>
      </Router>
    </>
  )
}

export default App
