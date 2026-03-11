import crypto from 'node:crypto'

export function getZoomRedirectUri(): string {
  const redirectUri = process.env.ZOOM_REDIRECT_URI
  if (!redirectUri) throw new Error('Missing ZOOM_REDIRECT_URI')
  return redirectUri
}

export function buildZoomAuthorizeUrl(state: string): string {
  const clientId = process.env.ZOOM_CLIENT_ID
  if (!clientId) throw new Error('Missing ZOOM_CLIENT_ID')

  const redirectUri = getZoomRedirectUri()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  })

  // Required scopes for reading cloud recordings
  const scopes = [
    'cloud_recording:read:list_user_recordings',
    'cloud_recording:read:list_user_recordings:admin',
    'user:read:user',
    'user:read:user:admin',
  ]
  params.append('scope', scopes.join(' '))

  return `https://zoom.us/oauth/authorize?${params.toString()}`
}

export function signZoomState(input: string): string {
  const secret = process.env.APP_STATE_SECRET
  if (!secret) throw new Error('Missing APP_STATE_SECRET')
  return crypto.createHmac('sha256', secret).update(input).digest('hex')
}

export function makeZoomState(userId?: string): string {
  const nonce = crypto.randomUUID()
  const raw = JSON.stringify({ nonce, userId: userId ?? null, ts: Date.now() })
  const sig = signZoomState(raw)
  return Buffer.from(JSON.stringify({ raw, sig })).toString('base64url')
}

export function verifyZoomState(state: string): { userId?: string } {
  const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as { raw: string; sig: string }
  const expected = signZoomState(decoded.raw)
  if (expected !== decoded.sig) throw new Error('Invalid Zoom OAuth state')
  const parsed = JSON.parse(decoded.raw) as { userId?: string | null }
  return { userId: parsed.userId ?? undefined }
}
