const API_BASE = import.meta.env.VITE_API_URL || 'https://ptbiz-backend-production.up.railway.app/api'

export interface ActionLogInput {
  actionType: string
  description: string
  metadata?: Record<string, unknown>
  sessionId?: string
}

export const logAction = async (input: ActionLogInput) => {
  try {
    await fetch(`${API_BASE}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })
  } catch (err) {
    console.error('Failed to log action:', err)
  }
}

export const fetchActions = async () => {
  const res = await fetch(`${API_BASE}/actions`)
  return res.json()
}

export { API_BASE }
