import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SITE_LOGO_URL } from '../constants/branding'

const API_URL = import.meta.env.VITE_API_URL || 'https://ptbiz-backend-production.up.railway.app/api'

export interface RevealedTools {
  discovery: boolean
  pl: boolean
}

interface IntroContextType {
  revealed: RevealedTools
}

export const IntroContext = createContext<IntroContextType>({
  revealed: { discovery: true, pl: true },
})

export const useIntro = () => useContext(IntroContext)

interface IntroVideoProps {
  onComplete: () => void
  onRevealChange?: (next: Partial<RevealedTools>) => void
}

type IntroStage = 'idle' | 'logo' | 'audio' | 'danny' | 'done'

export default function IntroVideo({ onComplete, onRevealChange }: IntroVideoProps) {
  const [stage, setStage] = useState<IntroStage>('idle')
  const [progress, setProgress] = useState(0)
  const [videoUrls, setVideoUrls] = useState({
    logo: '/intro-logo.mp4',
    nameAudio: '/danny-intro.mp3',
    danny: '/intro-danny.mp4',
  })

  const logoRef = useRef<HTMLVideoElement>(null)
  const nameAudioRef = useRef<HTMLAudioElement>(null)
  const dannyRef = useRef<HTMLVideoElement>(null)
  const hasRevealedDiscoveryRef = useRef(false)
  const hasRevealedPLRef = useRef(false)

  const isPlaying = stage !== 'idle' && stage !== 'done'

  useEffect(() => {
    const fetchVideos = async () => {
      const objectUrls: string[] = []

      try {
        const [logoResponse, nameAudioResponse, dannyResponse] = await Promise.all([
          fetch(`${API_URL}/videos/intro-logo`),
          fetch(`${API_URL}/videos/intro-danny-name`),
          fetch(`${API_URL}/videos/intro-danny`),
        ])

        const nextUrls = {
          logo: '/intro-logo.mp4',
          nameAudio: '/danny-intro.mp3',
          danny: '/intro-danny.mp4',
        }

        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob()
          const logoObjectUrl = URL.createObjectURL(logoBlob)
          objectUrls.push(logoObjectUrl)
          nextUrls.logo = logoObjectUrl
        }

        if (nameAudioResponse.ok) {
          const audioBlob = await nameAudioResponse.blob()
          const audioObjectUrl = URL.createObjectURL(audioBlob)
          objectUrls.push(audioObjectUrl)
          nextUrls.nameAudio = audioObjectUrl
        }

        if (dannyResponse.ok) {
          const dannyBlob = await dannyResponse.blob()
          const dannyObjectUrl = URL.createObjectURL(dannyBlob)
          objectUrls.push(dannyObjectUrl)
          nextUrls.danny = dannyObjectUrl
        }

        setVideoUrls((prev) => {
          if (prev.logo.startsWith('blob:')) URL.revokeObjectURL(prev.logo)
          if (prev.nameAudio.startsWith('blob:')) URL.revokeObjectURL(prev.nameAudio)
          if (prev.danny.startsWith('blob:')) URL.revokeObjectURL(prev.danny)
          return nextUrls
        })
      } catch {
        // Keep local fallback media
      }

      return () => {
        for (const url of objectUrls) {
          URL.revokeObjectURL(url)
        }
      }
    }

    let cleanup: (() => void) | undefined
    fetchVideos().then((fn) => {
      cleanup = fn
    }).catch(() => {})

    return () => {
      cleanup?.()
    }
  }, [])

  useEffect(() => {
    if (stage === 'logo' && logoRef.current) {
      setProgress(0)
      void logoRef.current.play()
    }

    if (stage === 'audio' && nameAudioRef.current) {
      nameAudioRef.current.currentTime = 0
      void nameAudioRef.current.play().catch(() => {
        setTimeout(() => {
          setStage('danny')
        }, 900)
      })
    }

    if (stage === 'danny' && dannyRef.current) {
      setProgress(0)
      void dannyRef.current.play()
    }
  }, [stage])

  const handleStart = () => {
    hasRevealedDiscoveryRef.current = false
    hasRevealedPLRef.current = false
    onRevealChange?.({ discovery: false, pl: false })
    setStage('logo')
  }

  const handleLogoEnd = () => {
    setStage('audio')
  }

  const handleNameAudioEnd = () => {
    setStage('danny')
  }

  const handleDannyTimeUpdate = () => {
    const video = dannyRef.current
    if (!video || !video.duration) return

    setProgress((video.currentTime / video.duration) * 100)

    if (video.currentTime >= 10 && !hasRevealedDiscoveryRef.current) {
      hasRevealedDiscoveryRef.current = true
      onRevealChange?.({ discovery: true })
    }

    if (video.currentTime >= 14 && !hasRevealedPLRef.current) {
      hasRevealedPLRef.current = true
      onRevealChange?.({ pl: true })
    }
  }

  const finishIntro = () => {
    onRevealChange?.({ discovery: true, pl: true })
    setProgress(100)
    setStage('done')
    setTimeout(onComplete, 200)
  }

  const subtitle = useMemo(() => {
    if (stage === 'logo') return 'Booting PT Biz Tools'
    if (stage === 'audio') return 'Intro from Danny'
    if (stage === 'danny') return 'Coach onboarding'
    return 'Press play to begin your walkthrough'
  }, [stage])

  return (
    <AnimatePresence>
      {stage !== 'done' && (
        <motion.div
          className="intro-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="intro-modal"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.24 }}
          >
            <div className="intro-modal-header">
              <div>
                <h2>PT Biz Team Welcome</h2>
                <p>{subtitle}</p>
              </div>
              {isPlaying && (
                <button className="intro-skip" onClick={finishIntro}>
                  Skip
                </button>
              )}
            </div>

            <div className="intro-player-frame">
              {stage === 'idle' && (
                <div className="intro-start-card">
                  <img src={SITE_LOGO_URL} alt="PT Biz" />
                  <button className="intro-play-btn" onClick={handleStart}>
                    Play Intro
                  </button>
                  <p>Audio starts only after you click play.</p>
                </div>
              )}

              {stage === 'logo' && (
                <video
                  ref={logoRef}
                  className="intro-video active"
                  onEnded={handleLogoEnd}
                  playsInline
                  muted
                >
                  <source src={videoUrls.logo} type="video/mp4" />
                </video>
              )}

              {stage === 'audio' && (
                <div className="intro-audio-stage">
                  <span>“Danny Matta here…”</span>
                  <audio ref={nameAudioRef} onEnded={handleNameAudioEnd}>
                    <source src={videoUrls.nameAudio} type="audio/mpeg" />
                  </audio>
                </div>
              )}

              {stage === 'danny' && (
                <video
                  ref={dannyRef}
                  className="intro-video active"
                  onTimeUpdate={handleDannyTimeUpdate}
                  onEnded={finishIntro}
                  playsInline
                >
                  <source src={videoUrls.danny} type="video/mp4" />
                </video>
              )}
            </div>

            {isPlaying && (
              <div className="intro-progress">
                <motion.div className="intro-progress-bar" style={{ width: `${progress}%` }} />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
