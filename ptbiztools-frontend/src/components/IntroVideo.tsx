import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Calculator, CheckCircle2, ClipboardList, Lock } from 'lucide-react'
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
  const [mediaReady, setMediaReady] = useState(false)
  const [revealedTools, setRevealedTools] = useState<RevealedTools>({ discovery: false, pl: false })
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
        setMediaReady(true)
      } catch {
        // Keep local fallback media
        setMediaReady(true)
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
    if (!mediaReady) return
    hasRevealedDiscoveryRef.current = false
    hasRevealedPLRef.current = false
    setRevealedTools({ discovery: false, pl: false })
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
      setRevealedTools((prev) => ({ ...prev, discovery: true }))
      onRevealChange?.({ discovery: true })
    }

    if (video.currentTime >= 14 && !hasRevealedPLRef.current) {
      hasRevealedPLRef.current = true
      setRevealedTools((prev) => ({ ...prev, pl: true }))
      onRevealChange?.({ pl: true })
    }
  }

  const finishIntro = () => {
    setRevealedTools({ discovery: true, pl: true })
    onRevealChange?.({ discovery: true, pl: true })
    setProgress(100)
    setStage('done')
    setTimeout(onComplete, 200)
  }

  const subtitle = useMemo(() => {
    if (stage === 'logo') return 'Queueing logo sequence'
    if (stage === 'audio') return 'Danny intro audio'
    if (stage === 'danny') return 'Coach onboarding in progress'
    return mediaReady ? 'Press play to begin your walkthrough' : 'Syncing onboarding media'
  }, [stage])

  const timeline = [
    {
      key: 'discovery',
      label: 'Discovery Call Grader',
      time: '10s',
      icon: ClipboardList,
      unlocked: revealedTools.discovery,
    },
    {
      key: 'pl',
      label: 'P&L Calculator',
      time: '14s',
      icon: Calculator,
      unlocked: revealedTools.pl,
    },
  ] as const

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
                <div className="intro-tool-timeline" aria-live="polite">
                  {timeline.map((item) => {
                    const ItemIcon = item.icon
                    return (
                      <div
                        key={item.key}
                        className={`intro-tool-chip ${item.unlocked ? 'unlocked' : ''}`}
                      >
                        <ItemIcon size={14} />
                        <span>{item.label}</span>
                        <em>{item.time}</em>
                        {item.unlocked ? <CheckCircle2 size={13} /> : <Lock size={13} />}
                      </div>
                    )
                  })}
                </div>
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
                  <button className="intro-play-btn" onClick={handleStart} disabled={!mediaReady}>
                    {mediaReady ? 'Play Intro' : 'Syncing Media...'}
                  </button>
                  <p>{mediaReady ? 'Audio starts only after you click play.' : 'Pulling logo, audio, and Danny video now.'}</p>
                </div>
              )}

              {stage === 'logo' && (
                <video
                  ref={logoRef}
                  className="intro-video active"
                  onEnded={handleLogoEnd}
                  playsInline
                  muted
                  preload="auto"
                >
                  <source src={videoUrls.logo} type="video/mp4" />
                </video>
              )}

              {stage === 'audio' && (
                <div className="intro-audio-stage">
                  <span>“Danny Matta here…”</span>
                  <audio ref={nameAudioRef} onEnded={handleNameAudioEnd} preload="auto">
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
                  preload="auto"
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
