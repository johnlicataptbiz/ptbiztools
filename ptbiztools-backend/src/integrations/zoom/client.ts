import type { ZoomOAuthTokenResponse, ZoomUserProfile } from './types.js'

const ZOOM_API_BASE = 'https://api.zoom.us/v2'
const ZOOM_OAUTH_BASE = 'https://zoom.us/oauth'

function getZoomBasicAuth(): string {
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Missing Zoom client credentials')
  }

  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
}

export async function exchangeZoomCode(code: string, redirectUri: string): Promise<ZoomOAuthTokenResponse> {
  const url = `${ZOOM_OAUTH_BASE}/token?grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getZoomBasicAuth()}`,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Zoom token exchange failed: ${text}`)
  }

  return response.json() as Promise<ZoomOAuthTokenResponse>
}

export async function refreshZoomToken(refreshToken: string): Promise<ZoomOAuthTokenResponse> {
  const url = `${ZOOM_OAUTH_BASE}/token?grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getZoomBasicAuth()}`,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Zoom refresh failed: ${text}`)
  }

  return response.json() as Promise<ZoomOAuthTokenResponse>
}

export async function zoomGet<T>(accessToken: string, path: string): Promise<T> {
  const response = await fetch(`${ZOOM_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Zoom API failed: ${text}`)
  }

  return response.json() as Promise<T>
}

export async function zoomDelete(accessToken: string, path: string): Promise<void> {
  const response = await fetch(`${ZOOM_API_BASE}${path}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Zoom delete failed: ${text}`)
  }
}

export async function zoomGetCurrentUser(accessToken: string): Promise<ZoomUserProfile> {
  return zoomGet<ZoomUserProfile>(accessToken, '/users/me')
}
