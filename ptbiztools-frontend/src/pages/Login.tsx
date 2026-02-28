import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, LockKeyhole, UserRound } from 'lucide-react'
import {
  getTeamMembers,
  login,
  setupPassword,
  type TeamMember,
  type User,
} from '../services/api'
import { CorexButton, CorexInput } from '../components/corex/CorexComponents'
import { LOGIN_LOGO_URL } from '../constants/branding'
import './Login.css'

interface LoginProps {
  onAuthenticated: (user: User) => void
}

const rememberedUserKey = 'ptbiz_selected_user_id'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function TeamAvatar({
  name,
  imageUrl,
  className,
  fallbackClassName,
}: {
  name: string
  imageUrl?: string | null
  className: string
  fallbackClassName: string
}) {
  const [didError, setDidError] = useState(false)

  if (imageUrl && !didError) {
    return (
      <div className={`team-avatar-shell ${className}-shell`}>
        <img
          src={imageUrl}
          alt={name}
          className={className}
          loading="lazy"
          onError={() => setDidError(true)}
        />
        <span className="team-avatar-badge" aria-hidden="true">PT</span>
      </div>
    )
  }

  return (
    <div className={`team-avatar-shell ${className}-shell`}>
      <div className={`${className} ${fallbackClassName}`} aria-label={name}>
        {getInitials(name)}
      </div>
      <span className="team-avatar-badge" aria-hidden="true">PT</span>
    </div>
  )
}

export default function Login({ onAuthenticated }: LoginProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [identityConfirmed, setIdentityConfirmed] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const bootstrap = async () => {
      const members = await getTeamMembers()
      setTeamMembers(members)

      const remembered = localStorage.getItem(rememberedUserKey)
      if (remembered && members.some((member) => member.id === remembered)) {
        setSelectedUserId(remembered)
      }

      setLoading(false)
    }

    bootstrap()
  }, [])

  const selectedUser = useMemo(
    () => teamMembers.find((member) => member.id === selectedUserId) || null,
    [selectedUserId, teamMembers],
  )

  const needsFirstTimeSetup = selectedUser ? !selectedUser.hasPassword : false

  const resetInputs = () => {
    setPassword('')
    setConfirmPassword('')
    setIdentityConfirmed(false)
    setMessage('')
  }

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId)
    localStorage.setItem(rememberedUserKey, userId)
    resetInputs()
  }

  const handleBackToSelection = () => {
    setSelectedUserId(null)
    localStorage.removeItem(rememberedUserKey)
    resetInputs()
  }

  const handleSetupPassword = async (event: FormEvent) => {
    event.preventDefault()

    if (!selectedUser) return

    if (!identityConfirmed) {
      setMessage('Please confirm you are this person before creating a password.')
      return
    }

    if (password.length < 4) {
      setMessage('Password must be at least 4 characters.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setMessage('')

    const result = await setupPassword(selectedUser.id, password)

    if (result.error) {
      setMessage(result.error)
      setSubmitting(false)
      return
    }

    setTeamMembers((prev) => prev.map((member) => (
      member.id === selectedUser.id ? { ...member, hasPassword: true } : member
    )))

    setPassword('')
    setConfirmPassword('')
    setIdentityConfirmed(false)
    setMessage('Password saved. Sign in below to continue.')
    setSubmitting(false)
  }

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()

    if (!selectedUser) return
    if (!password) {
      setMessage('Enter your password to sign in.')
      return
    }

    setSubmitting(true)
    setMessage('')

    const result = await login(selectedUser.id, password, rememberMe)

    if (result.error || !result.user) {
      setMessage(result.error || 'Unable to sign in.')
      setSubmitting(false)
      return
    }

    localStorage.setItem(rememberedUserKey, selectedUser.id)
    setPassword('')
    onAuthenticated(result.user)
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <p>Loading team members...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-shell">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <header className="login-header">
          <div className="login-logo-hero">
            <img src={LOGIN_LOGO_URL} alt="BizCoach Suite" className="login-logo-image" />
          </div>
          <span className="login-header-kicker">Private Platform Access</span>
          <h1>PT Biz Team Login</h1>
          <p>Select your profile, then sign in with your password.</p>
        </header>

        {!selectedUser && (
          <section className="member-picker">
            <div className="member-picker-header">
              <h2>Choose your profile</h2>
              <span>{teamMembers.length} team members</span>
            </div>
            <div className="member-dropdown-list" role="listbox" aria-label="Team member profiles">
              {teamMembers.map((member) => (
                <motion.button
                  key={member.id}
                  className="member-row-card"
                  onClick={() => handleUserSelect(member.id)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.995 }}
                >
                  <TeamAvatar
                    name={member.name}
                    imageUrl={member.imageUrl}
                    className="member-list-photo"
                    fallbackClassName="member-list-photo-fallback"
                  />
                  <div className="member-row-meta">
                    <strong>{member.name}</strong>
                    <span>{member.title || 'Team Member'}</span>
                    <em>{member.teamSection || 'PT Biz Team'}</em>
                  </div>
                  <div className="member-row-action" aria-hidden="true">
                    Select
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {selectedUser && (
          <section className="selected-user-section">
            <button className="change-user-btn" onClick={handleBackToSelection}>
              <ArrowLeft size={14} />
              Choose a different person
            </button>

            <div className="selected-user-card">
              <TeamAvatar
                name={selectedUser.name}
                imageUrl={selectedUser.imageUrl}
                className="selected-user-photo"
                fallbackClassName="selected-user-photo-fallback"
              />
              <div>
                <h2>{selectedUser.name}</h2>
                <p>{selectedUser.title}</p>
                <span>{selectedUser.teamSection}</span>
              </div>
            </div>

            {needsFirstTimeSetup ? (
              <form className="auth-form" onSubmit={handleSetupPassword}>
                <h3>First-time setup</h3>
                <p>Create your password once, then you&apos;ll use your normal sign-in form daily.</p>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={identityConfirmed}
                    onChange={(event) => setIdentityConfirmed(event.target.checked)}
                  />
                  <span>I confirm I am {selectedUser.name}</span>
                </label>

                <CorexInput
                  label="New password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                />

                <CorexInput
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={submitting}
                />

                <CorexButton type="submit" className="login-primary-btn" loading={submitting}>
                  <CheckCircle2 size={16} />
                  Set Password
                </CorexButton>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleLogin}>
                <h3>Sign in</h3>
                <p>Use your saved profile and enter your password.</p>

                <CorexInput
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                />

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Keep me logged in</span>
                </label>

                <CorexButton type="submit" className="login-primary-btn" loading={submitting}>
                  <LockKeyhole size={16} />
                  Sign In
                </CorexButton>
              </form>
            )}
          </section>
        )}

        {message && (
          <div className="login-message">
            <UserRound size={14} />
            <span>{message}</span>
          </div>
        )}
      </motion.div>
    </div>
  )
}
