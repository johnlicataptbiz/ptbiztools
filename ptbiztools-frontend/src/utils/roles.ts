import type { User } from '../services/api'

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false
  if (user.role === 'admin') return true

  const title = (user.title || '').toLowerCase()
  const section = user.teamSection || ''

  if (section === 'Partners' || section === 'Advisors' || section === 'Board') return true
  if (title.includes('ceo') || title.includes('cfo') || title.includes('advisor')) return true
  if (user.name === 'John Licata') return true

  return false
}
