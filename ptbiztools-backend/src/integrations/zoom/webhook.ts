import crypto from 'node:crypto'

export function verifyZoomWebhookSignature(rawBody: string, timestamp: string, signature: string): boolean {
  const secret = process.env.ZOOM_WEBHOOK_SECRET
  if (!secret) throw new Error('Missing ZOOM_WEBHOOK_SECRET')

  const message = `v0:${timestamp}:${rawBody}`
  const hash = crypto.createHmac('sha256', secret).update(message).digest('hex')
  const expected = `v0=${hash}`

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export function buildZoomEndpointValidationResponse(plainToken: string) {
  const secret = process.env.ZOOM_WEBHOOK_SECRET
  if (!secret) throw new Error('Missing ZOOM_WEBHOOK_SECRET')

  const encryptedToken = crypto.createHmac('sha256', secret).update(plainToken).digest('hex')

  return {
    plainToken,
    encryptedToken,
  }
}
