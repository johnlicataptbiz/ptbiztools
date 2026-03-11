import { NextRequest, NextResponse } from 'next/server';

// Zoom OAuth token endpoint
const ZOOM_TOKEN_URL = 'https://zoom.us/oauth/token';
const ZOOM_API_BASE = 'https://api.zoom.us/v2';

// Get environment variables
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID || '';
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET || '';
const ZOOM_REDIRECT_URI = process.env.ZOOM_REDIRECT_URI || 'https://ptbizcoach.com/api/auth/zoom/callback';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('Zoom OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `/dashboard?error=zoom_auth_failed&details=${encodeURIComponent(errorDescription || error)}`
      );
    }

    // Validate authorization code
    if (!code) {
      console.error('No authorization code received from Zoom');
      return NextResponse.redirect(
        '/dashboard?error=zoom_auth_failed&details=no_code_received'
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch(ZOOM_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: ZOOM_REDIRECT_URI,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Failed to exchange code for token:', errorData);
      return NextResponse.redirect(
        '/dashboard?error=zoom_token_failed&details=token_exchange_failed'
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokenData;

    // Get user info from Zoom
    const userResponse = await fetch(`${ZOOM_API_BASE}/users/me`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch Zoom user info');
      return NextResponse.redirect(
        '/dashboard?error=zoom_user_failed&details=user_info_failed'
      );
    }

    const userData = await userResponse.json();
    const { id: zoomUserId, email, first_name, last_name } = userData;

    // Store tokens in your backend
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/zoom/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include auth token for your API if needed
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        zoomUserId,
        email,
        firstName: first_name,
        lastName: last_name,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        scope,
        connectedAt: new Date().toISOString(),
      }),
    });

    if (!backendResponse.ok) {
      console.error('Failed to store Zoom credentials in backend');
      return NextResponse.redirect(
        '/dashboard?error=zoom_storage_failed&details=backend_storage_failed'
      );
    }

    // Success - redirect to dashboard with success message
    return NextResponse.redirect(
      `/dashboard?success=zoom_connected&email=${encodeURIComponent(email || '')}`
    );

  } catch (error) {
    console.error('Unexpected error in Zoom OAuth callback:', error);
    return NextResponse.redirect(
      '/dashboard?error=zoom_callback_error&details=unexpected_error'
    );
  }
}
