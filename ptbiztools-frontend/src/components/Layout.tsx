import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { BarChart3, ClipboardList, Calculator, Film, BookOpenText, ScrollText, LogOut, Menu, PhoneCall, X } from 'lucide-react'
import type { User } from '../services/api'
import { SITE_LOGO_URL } from '../constants/branding'
import { getEffectiveRole, getRoleLabel } from '../utils/roles'
import './Layout.css'

interface LayoutProps {
  user: User
  isAdmin: boolean
  onLogout: () => Promise<void> | void
}

export default function Layout({ user, isAdmin, onLogout }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const role = getEffectiveRole(user)
  const isAdvisor = role === 'advisor'

  const navItems = useMemo(() => {
    if (isAdmin) {
      return [
        { to: '/', label: 'Dashboard', icon: BarChart3 },
        { to: '/discovery-call-grader', label: 'Call Grader', icon: ClipboardList },
        { to: '/pl-calculator', label: 'P&L Calculator', icon: Calculator },
        { to: '/compensation-calculator', label: 'Comp Calculator', icon: Calculator },
        { to: '/sales-discovery-grader', label: 'Sales Grader', icon: PhoneCall },
        { to: '/analyses', label: 'Analyses', icon: ScrollText },
        { to: '/knowledge', label: 'Knowledge', icon: BookOpenText },
        { to: '/media', label: 'Media', icon: Film },
      ]
    }

    if (isAdvisor) {
      return [
        { to: '/', label: 'Dashboard', icon: BarChart3 },
        { to: '/discovery-call-grader', label: 'Call Grader', icon: ClipboardList },
        { to: '/pl-calculator', label: 'P&L Calculator', icon: Calculator },
        { to: '/compensation-calculator', label: 'Comp Calculator', icon: Calculator },
        { to: '/sales-discovery-grader', label: 'Sales Grader', icon: PhoneCall },
        { to: '/analyses', label: 'My Analyses', icon: ScrollText },
        { to: '/knowledge', label: 'Knowledge', icon: BookOpenText },
      ]
    }

    return [
      { to: '/', label: 'Dashboard', icon: BarChart3 },
      { to: '/discovery-call-grader', label: 'Call Grader', icon: ClipboardList },
      { to: '/pl-calculator', label: 'P&L Calculator', icon: Calculator },
      { to: '/compensation-calculator', label: 'Comp Calculator', icon: Calculator },
      { to: '/analyses', label: 'My Analyses', icon: ScrollText },
      { to: '/knowledge', label: 'Knowledge', icon: BookOpenText },
    ]
  }, [isAdmin, isAdvisor])

  // Keep routes available but hide the last two low-priority sidebar links.
  const featuredNavItems = useMemo(() => navItems.slice(0, Math.max(navItems.length - 2, 0)), [navItems])

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const [avatarDidError, setAvatarDidError] = useState(false)

  return (
    <div className="layout">
      <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
        <Menu size={20} />
      </button>

      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo" onClick={() => setMenuOpen(false)}>
            <img className="logo-img" src={SITE_LOGO_URL} alt="BizCoach Suite" />
          </Link>

          <button className="sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {featuredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar-shell">
              {user.imageUrl && !avatarDidError ? (
                <img
                  className="user-avatar user-avatar-image"
                  src={user.imageUrl}
                  alt={user.name}
                  loading="lazy"
                  onError={() => setAvatarDidError(true)}
                />
              ) : (
                <div className="user-avatar user-avatar-fallback">{initials}</div>
              )}
              <span className="user-avatar-badge" aria-hidden="true">PT</span>
            </div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{getRoleLabel(user)}</span>
            </div>
          </div>

          <button className="logout-btn" onClick={onLogout}>
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </aside>

      <div className="main-wrapper">
        <main className="main-content">
          <div className="page-wrapper">
            <Outlet />
          </div>
        </main>

        <footer className="footer">
          <div className="footer-container">
            <p>PT Biz Tools</p>
            <p className="footer-tagline">Built for coaching execution</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
