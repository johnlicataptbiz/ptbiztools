export interface ZoomOAuthTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  scope?: string
  uid?: string
  account_id?: string
}

export interface ZoomUserProfile {
  id?: string
  account_id?: string
  email?: string
  first_name?: string
  last_name?: string
}

export interface ZoomWebhookEnvelope<T = unknown> {
  event: string
  event_ts?: number
  payload: T
}

export interface ZoomRecordingCompletedPayload {
  account_id?: string
  object?: {
    uuid?: string
    id?: string | number
    host_id?: string
    host_email?: string
    topic?: string
    start_time?: string
    duration?: number
    recording_files?: Array<{
      id?: string
      recording_type?: string
      file_type?: string
      file_extension?: string
      download_url?: string
      status?: string
    }>
  }
}

export interface ZoomEndpointValidationPayload {
  plainToken: string
}

export interface ZoomGradeInput {
  transcript: string
  closer: string
  prospectName: string
  outcome: string
  program: "Rainmaker" | "Mastermind"
  callDate: string
  callMeta?: {
    durationMinutes?: number
  }
}
