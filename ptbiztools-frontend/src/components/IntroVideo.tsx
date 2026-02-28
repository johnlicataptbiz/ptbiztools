import { useState, useEffect, useRef, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
  const [stage, setStage] = useState<'black' | 'logo' | 'logo-fade' | 'danny' | 'done'>('black')
  const logoRef = useRef<HTMLVideoElement>(null)
  const dannyRef = useRef<HTMLVideoElement>(null)
  
  const [revealed, setRevealed] = useState({
    discovery: false,
    pl: false
  })

  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('ptbiz_intro_seen')
    if (hasSeenIntro) {
      onComplete()
      return
    }

    // Start with black, then fade to logo
    const blackTimer = setTimeout(() => {
      setStage('logo')
    }, 600)

    return () => clearTimeout(blackTimer)
  }, [onComplete])

  useEffect(() => {
    if (stage === 'logo' && logoRef.current) {
      logoRef.current.play()
    }
    if (stage === 'danny' && dannyRef.current) {
      dannyRef.current.play()
    }
  }, [stage])

  const handleLogoEnd = () => {
    // Smooth fade transition between logo and danny
    setStage('logo-fade')
    setTimeout(() => {
      setStage('danny')
    }, 500)
  }

  const handleTimeUpdate = () => {
    if (!dannyRef.current) return
    const currentTime = dannyRef.current.currentTime
    
    // Reveal discovery call grader at 10 seconds
    if (currentTime > 10 && currentTime < 11 && !revealed.discovery) {
      setRevealed(prev => ({ ...prev, discovery: true }))
    }
    
    // Reveal P&L grader at 14 seconds
    if (currentTime > 14 && currentTime < 15 && !revealed.pl) {
      setRevealed(prev => ({ ...prev, pl: true }))
    }
  }

  const handleEnded = () => {
    localStorage.setItem('ptbiz_intro_seen', 'true')
    setStage('done')
    setTimeout(onComplete, 300)
  }

  const skipIntro = () => {
    localStorage.setItem('ptbiz_intro_seen', 'true')
    setStage('done')
    onComplete()
  }

  return (
    <IntroContext.Provider value={{ revealed }}>
      <AnimatePresence>
        {stage !== 'done' && (
          <motion.div
            className="intro-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <button className="intro-skip" onClick={skipIntro}>
              Skip Intro →
            </button>

            {/* Video container */}
            <div className={`intro-video-container ${stage === 'logo-fade' ? 'fade-out' : ''}`}>
              {/* Logo video */}
              <video
                ref={logoRef}
                className={`intro-video ${stage === 'logo' ? 'active' : ''}`}
                onEnded={handleLogoEnd}
                playsInline
                muted
              >
                <source src="/intro-logo.mp4" type="video/mp4" />
              </video>

              {/* Danny video */}
              <video
                ref={dannyRef}
                className={`intro-video ${stage === 'danny' ? 'active' : ''}`}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                playsInline
                muted
              >
                <source src="/intro-danny.mp4" type="video/mp4" />
              </video>
            </div>

            <div className={`intro-reveal discovery-reveal ${revealed.discovery ? 'revealed' : ''}`} />
            <div className={`intro-reveal pl-reveal ${revealed.pl ? 'revealed' : ''}`} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage === 'black' && (
          <motion.div
            className="intro-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
    </IntroContext.Provider>
  )
}
