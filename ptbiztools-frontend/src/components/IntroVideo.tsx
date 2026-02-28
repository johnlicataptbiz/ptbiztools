import { useState, useEffect, useRef, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL || 'https://ptbiz-backend-production.up.railway.app/api'

interface IntroContextType {
  revealed: {
    discovery: boolean
    pl: boolean
  }
}

export const IntroContext = createContext<IntroContextType>({ revealed: { discovery: false, pl: false } })

export const useIntro = () => useContext(IntroContext)

interface IntroVideoProps {
  onComplete: () => void
}

export default function IntroVideo({ onComplete }: IntroVideoProps) {
  const [stage, setStage] = useState<'start' | 'black' | 'logo' | 'logo-fade' | 'audio' | 'danny' | 'done'>('start')
  const [progress, setProgress] = useState(0)
  const logoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const dannyRef = useRef<HTMLVideoElement>(null)
  
  const [videoUrls, setVideoUrls] = useState<{ logo: string; danny: string }>({
    logo: '/intro-logo.mp4',
    danny: '/intro-danny.mp4'
  })
  
  const [revealed, setRevealed] = useState({
    discovery: false,
    pl: false
  })

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch(`${API_URL}/videos/intro-logo`)
        if (response.ok) {
          const logoBlob = await response.blob()
          const logoUrl = URL.createObjectURL(logoBlob)
          
          const dannyResponse = await fetch(`${API_URL}/videos/intro-danny`)
          if (dannyResponse.ok) {
            const dannyBlob = await dannyResponse.blob()
            const dannyUrl = URL.createObjectURL(dannyBlob)
            setVideoUrls({ logo: logoUrl, danny: dannyUrl })
          }
        }
      } catch (e) {
        console.log('Using local videos')
      }
    }
    fetchVideos()
  }, [])

  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('ptbiz_intro_seen')
    if (hasSeenIntro) {
      onComplete()
      return
    }
  }, [onComplete])

  const startIntro = () => {
    setStage('black')
    setTimeout(() => {
      setStage('logo')
    }, 800)
  }

  useEffect(() => {
    if (stage === 'logo' && logoRef.current) {
      logoRef.current.play()
    }
    if (stage === 'audio' && audioRef.current) {
      audioRef.current.play()
    }
    if (stage === 'audio' && audioRef.current) {
      audioRef.current.play()
    }
    if (stage === 'danny' && dannyRef.current) {
      dannyRef.current.play()
    }
  }, [stage])

  useEffect(() => {
    if (stage !== 'danny' || !dannyRef.current) return
    const video = dannyRef.current
    const updateProgress = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100)
      }
    }
    
    video.addEventListener('timeupdate', updateProgress)
    return () => video.removeEventListener('timeupdate', updateProgress)
  }, [stage])

  const handleLogoEnd = () => {
    setStage('logo-fade')
    setTimeout(() => {
      setStage('audio')
    }, 600)
  }

  const handleAudioEnd = () => {
    setStage('danny')
  }
  const handleTimeUpdate = () => {
    if (!dannyRef.current) return
    const currentTime = dannyRef.current.currentTime
    
    if (currentTime > 10 && currentTime < 11 && !revealed.discovery) {
      setRevealed(prev => ({ ...prev, discovery: true }))
    }
    
    if (currentTime > 14 && currentTime < 15 && !revealed.pl) {
      setRevealed(prev => ({ ...prev, pl: true }))
    }
  }

  const handleEnded = () => {
    localStorage.setItem('ptbiz_intro_seen', 'true')
    setStage('done')
    setTimeout(onComplete, 500)
  }

  const skipIntro = () => {
    localStorage.setItem('ptbiz_intro_seen', 'true')
    setStage('done')
    onComplete()
  }

  return (
    <IntroContext.Provider value={{ revealed }}>
      <AnimatePresence>
        {stage !== 'done' && stage !== 'start' && (
          <motion.div
            className="intro-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
          >
            <button className="intro-skip" onClick={skipIntro}>
              Skip <span className="skip-arrow">→</span>
            </button>

            {stage === 'danny' && (
              <div className="intro-progress">
                <motion.div 
                  className="intro-progress-bar"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <div className={`intro-video-container ${stage === 'logo-fade' ? 'fade-out' : ''}`}>
              <video
                ref={logoRef}
                className={`intro-video ${stage === 'logo' ? 'active' : ''}`}
                onEnded={handleLogoEnd}
                playsInline
                autoPlay
                muted
              >
                <source src={videoUrls.logo} type="video/mp4" />
              </video>
              <audio ref={audioRef} onEnded={handleAudioEnd}>
                <source src="/danny-intro.mp3" type="audio/mpeg" />
              </audio>



              <video
                ref={dannyRef}
                className={`intro-video ${stage === 'danny' ? 'active' : ''}`}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                playsInline
              >
                <source src={videoUrls.danny} type="video/mp4" />
              </video>

            <div className={`intro-reveal discovery-reveal ${revealed.discovery ? 'revealed' : ''}`}>
            </div>
              <div className="reveal-card">
                <span className="reveal-label">Discovery Call Grader</span>
                <span className="reveal-status">Unlocked</span>
              </div>
            </div>
            <div className={`intro-reveal pl-reveal ${revealed.pl ? 'revealed' : ''}`}>
              <div className="reveal-card">
                <span className="reveal-label">P&L Calculator</span>
                <span className="reveal-status">Unlocked</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage === 'start' && (
          <motion.div
            className="intro-start-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999
            }}
          >
            <motion.img 
              src="/ptbiz-logo-blue.png"
              alt="PT Biz"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{ width: 200, marginBottom: 40 }}
            />
            <motion.button
              onClick={startIntro}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{
                background: '#e94560',
                border: 'none',
                padding: '16px 48px',
                fontSize: 18,
                fontWeight: 600,
                color: 'white',
                borderRadius: 8,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(233, 69, 96, 0.4)'
              }}
            >
              ▶ Play Intro
            </motion.button>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.6 }}
              style={{ color: 'white', marginTop: 20, fontSize: 14 }}
            >
              Sound on for best experience
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage === 'black' && (
          <motion.div
            className="intro-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
          />
        )}
      </AnimatePresence>
    </IntroContext.Provider>
  )
}
