import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, Calculator, Home, X, Menu } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Toaster } from 'sonner'
import './Layout.css'

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/discovery-call-grader', icon: ClipboardList, label: 'Call Grader' },
  { path: '/pl-calculator', icon: Calculator, label: 'P&L Calculator' },
]

export default function Layout() {
  const location = useLocation()
  const [showVideo, setShowVideo] = useState(false)
  const [videoEnded, setVideoEnded] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('ptbiz_has_seen_intro')
    if (!hasSeenIntro && location.pathname === '/') {
      const timer = setTimeout(() => setShowVideo(true), 500)
      return () => clearTimeout(timer)
    }
  }, [location.pathname])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const handleVideoEnd = () => {
    setVideoEnded(true)
    localStorage.setItem('ptbiz_has_seen_intro', 'true')
    setTimeout(() => setShowVideo(false), 400)
  }

  return (
    <div className="layout">
      <Toaster 
        position="top-right" 
        theme="dark"
        toastOptions={{
          style: {
            background: 'rgba(22, 22, 31, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
          }
        }}
      />
      
      {/* Mobile menu button */}
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
        <Menu size={24} />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            className="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <NavLink to="/" className="sidebar-logo" onClick={() => setSidebarOpen(false)}>
            <img src="/ptbiz-logo-white.png" alt="PT Biz" className="logo-img" />
          </NavLink>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">JL</div>
            <div className="user-info">
              <span className="user-name">Coach</span>
              <span className="user-role">PT Biz</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-wrapper">
        <main className="main-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="page-wrapper"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {showVideo && (
          <motion.div
            className="video-intro-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: videoEnded ? 0 : 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="video-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: videoEnded ? 0 : 1 }}
              transition={{ duration: 0.3 }}
            />
            <motion.div
              className="video-container"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: videoEnded ? 0.9 : 1, opacity: videoEnded ? 0 : 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <button className="video-close-btn" onClick={handleVideoEnd}>
                <X size={24} />
              </button>
              <video
                className="intro-video"
                autoPlay
                onEnded={handleVideoEnd}
                controls={false}
                playsInline
              >
                <source src="/intro-video.mp4" type="video/mp4" />
              </video>
              <div className="video-progress">
                <motion.div 
                  className="video-progress-bar"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 30, ease: 'linear' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
