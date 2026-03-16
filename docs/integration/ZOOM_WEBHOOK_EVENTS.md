# Zoom Webhook Events to Subscribe To

## Webhook Endpoint URL
```
https://ptbiztools-backend-production.up.railway.app/zoom/webhook
```

## Required Event Subscriptions

### 1. Endpoint Validation (REQUIRED)
- **Event:** `endpoint.url_validation`
- **Purpose:** Zoom verifies your webhook endpoint is valid
- **Backend Handler:** ✅ Implemented

### 2. Recording Completed (REQUIRED)
- **Event:** `recording.completed`
- **Purpose:** Notifies when a new cloud recording is available
- **Backend Handler:** ✅ Implemented - Creates recording record & queues ingest job

### 3. Transcript Completed (REQUIRED)
- **Event:** `recording.transcript_completed`
- **Purpose:** Notifies when transcript is ready for a recording
- **Backend Handler:** ✅ Implemented - Updates recording with transcript info

### 4. Recording Deleted (RECOMMENDED)
- **Event:** `recording.deleted`
- **Purpose:** Notifies when a recording is deleted from Zoom
- **Backend Handler:** ✅ Implemented - Marks recording as deleted in database

## How to Add in Zoom App

1. Go to **"Feature"** section in your Zoom app (left sidebar)
2. Toggle **ON** "Event Subscriptions"
3. Click **"Add Event Subscription"**
4. Fill in:
   - **Subscription Name:** `PT Biz Recording Events`
   - **Event Notification Endpoint URL:** `https://ptbiztools-backend-production.up.railway.app/zoom/webhook`
   - **Verification Token:** Leave empty (backend uses signature verification)
5. Click **"Add Events"** and select:
   - ✅ `recording.completed`
   - ✅ `recording.transcript_completed`
   - ✅ `recording.deleted`
6. Click **"Done"** then **"Save"**

## Webhook Secret

Your backend already has webhook signature verification implemented. Make sure this env var is set in Railway:

```bash
railway variables set ZOOM_WEBHOOK_SECRET="your_webhook_secret_from_zoom_app"
```

You can find the webhook secret in your Zoom app under:
**Feature → Event Subscriptions → Secret Token**

## Testing Webhooks

After activating your app, you can test webhooks by:
1. Starting a Zoom meeting
2. Recording to the cloud
3. Stopping the recording
4. Checking your database for new recording entries

Or use the Zoom webhook test feature in the app dashboard.
