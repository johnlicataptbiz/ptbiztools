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

type IntroStage = 'idle' | 'playing' | 'done'

export default function IntroVideo({ onComplete, onRevealChange }: IntroVideoProps) {
  const [stage, setStage] = useState<IntroStage>('idle')
  const [progress, setProgress] = useState(0)
  const [mediaReady, setMediaReady] = useState(false)
  const [revealedTools, setRevealedTools] = useState<RevealedTools>({ discovery: false, pl: false })
  const [videoUrl, setVideoUrl] = useState('/intro-video.mp4')

  const combinedRef = useRef<HTMLVideoElement>(null)
  const hasRevealedDiscoveryRef = useRef(false)
  const hasRevealedPLRef = useRef(false)

  const isPlaying = stage !== 'idle' && stage !== 'done'

  useEffect(() => {
    const fetchVideo = async () => {
      const objectUrls: string[] = []

      try {
        const response = await fetch(`${API_URL}/videos/intro-combined`)

        if (response.ok) {
          const blob = await response.blob()
          const objectUrl = URL.createObjectURL(blob)
          objectUrls.push(objectUrl)

          setVideoUrl((prev) => {
            if (prev.startsWith('blob:')) URL.revokeObjectURL(prev)
            return objectUrl
          })
        }

        setMediaReady(true)
      } catch {
        // Keep local fallback media.
        setMediaReady(true)
      }

      return () => {
        for (const url of objectUrls) {
          URL.revokeObjectURL(url)
        }
      }
    }

    let cleanup: (() => void) | undefined
    fetchVideo()
      .then((fn) => {
        cleanup = fn
      })
      .catch(() => {})

    return () => {
      cleanup?.()
    }
  }, [])

  useEffect(() => {
    if (stage === 'playing' && combinedRef.current) {
      setProgress(0)
      void combinedRef.current.play().catch(() => {
        // Browser autoplay policy may still block unmuted playback in some contexts.
      })
    }
  }, [stage])

  useEffect(() => {
    if (!mediaReady || stage !== 'idle') return
    hasRevealedDiscoveryRef.current = false
    hasRevealedPLRef.current = false
    setRevealedTools({ discovery: false, pl: false })
    onRevealChange?.({ discovery: false, pl: false })
    setStage('playing')
  }, [mediaReady, onRevealChange, stage])

  const handleCombinedTimeUpdate = () => {
    const video = combinedRef.current
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
    if (stage === 'playing') return 'Coach onboarding in progress'
    return mediaReady ? 'Starting welcome video...' : 'Syncing onboarding media'
  }, [stage, mediaReady])

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
                  <img className="intro-start-logo" src={SITE_LOGO_URL} alt="BizCoach Suite" />
                  <p>{mediaReady ? 'Starting welcome video...' : 'Pulling the combined intro video now.'}</p>
                </div>
              )}

              {stage === 'playing' && (
                <video
                  ref={combinedRef}
                  className="intro-video active"
                  autoPlay
                  onTimeUpdate={handleCombinedTimeUpdate}
                  onEnded={finishIntro}
                  playsInline
                  preload="auto"
                >
                  <source src={videoUrl} type="video/mp4" />
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
