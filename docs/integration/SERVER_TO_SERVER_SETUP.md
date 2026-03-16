# Zoom Server-to-Server OAuth Setup Guide

## Overview
You're creating a **Zoom Server-to-Server OAuth app** - this is the BEST approach! It allows:
- Single admin approval for entire organization
- Access to ALL users' cloud recordings
- No need for individual users to authorize
- Better security with short-lived tokens

## Current Status

### ✅ Backend Updated & Deployed
- Added server-to-server OAuth support in `src/integrations/zoom/client.ts`
- Added `ZoomServerTokenResponse` type in `src/integrations/zoom/types.ts`
- Created `run_server_backfill.ts` script for bulk recording import
- Successfully deployed to Railway

### ✅ Environment Variable Added
- `ZOOM_ACCOUNT_ID` placeholder set (needs your actual Account ID)

## Required Zoom App Scopes

Based on your screenshot, ensure these scopes are selected:

**Recording Scopes (REQUIRED):**
- ✅ `cloud_recording:read:list_user_recordings` - List all user recordings
- ✅ `cloud_recording:read:list_user_recordings:admin` - Admin access to all recordings
- ✅ `cloud_recording:read:recording` - Access recording files

**User Scopes (for metadata):**
- ✅ `user:read:user` - Read user info
- ✅ `user:read:user:admin` - Read all users (admin)

**Account Scopes (for server-to-server):**
- ✅ `account:read:account` - Read account info
- ✅ `account:read:account:admin` - Admin account access

## Next Steps

### 1. Complete Zoom App Setup
1. Go to https://marketplace.zoom.us/
2. Finish creating your Server-to-Server OAuth app
3. **Activate** the app (toggle in top-right)
4. Copy these values:
   - **Account ID** (from Account Profile page)
   - **Client ID** (from App Credentials)
   - **Client Secret** (from App Credentials)

### 2. Update Railway Environment Variables

```bash
cd ptbiztools-backend

# Set the real values (replace with your actual values)
railway variables set ZOOM_ACCOUNT_ID="your_actual_account_id"
railway variables set ZOOM_CLIENT_ID="your_server_app_client_id"
railway variables set ZOOM_CLIENT_SECRET="your_server_app_client_secret"

# Optional: Remove old user OAuth variables if no longer needed
# railway variables delete ZOOM_REDIRECT_URI
```

### 3. Run the Backfill

Once the app is activated and variables are set:

```bash
cd ptbiztools-backend
railway run -- npx tsx run_server_backfill.ts
```

This will:
- Fetch all cloud recordings from the past 90 days
- Create database records for each recording
- Queue ingest jobs for transcript processing

## Testing the Token

Quick test to verify server-to-server auth works:

```bash
curl -X POST https://zoom.us/oauth/token \
  -H "Authorization: Basic $(echo -n 'CLIENT_ID:CLIENT_SECRET' | base64)" \
  -d "grant_type=account_credentials" \
  -d "account_id=YOUR_ACCOUNT_ID"
```

## Files Created/Modified

| File | Purpose |
|------|---------|
| `src/integrations/zoom/client.ts` | Added `getServerToServerToken()` function |
| `src/integrations/zoom/types.ts` | Added `ZoomServerTokenResponse` interface |
| `run_server_backfill.ts` | Script to bulk import all recordings |
| `run_backfill.ts` | Original user-oauth backfill (kept for reference) |

## Troubleshooting

**Error: "Invalid client_id or client_secret"**
- Verify you're using the Server-to-Server app's credentials, not the old user OAuth app
- Ensure the app is **activated** in Zoom Marketplace

**Error: "Account does not exist"**
- Double-check your Account ID (found in Zoom Admin > Account Profile)

**Error: "Invalid scope"**
- Ensure all required scopes are selected in the Zoom app
- The app may need to be re-activated after scope changes

## Questions?

The server-to-server approach is much cleaner than individual user OAuth. Once set up, you'll automatically have access to all recordings across your organization without users needing to connect individually.
