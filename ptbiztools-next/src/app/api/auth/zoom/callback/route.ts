import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACKEND_API_BASE = 'https://ptbiztools-backend-production.up.railway.app/api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const code = searchParams.get('code');

    if (error || !code) {
      const details = errorDescription || error || 'no_code_received';
      return NextResponse.redirect(
        `/dashboard?error=zoom_auth_failed&details=${encodeURIComponent(details)}`
      );
    }

    const backendApiBase = (
      process.env.PTBIZ_BACKEND_URL?.trim() ||
      process.env.NEXT_PUBLIC_API_URL?.trim() ||
      DEFAULT_BACKEND_API_BASE
    ).replace(/\/+$/, '');

    const callbackUrl = new URL(`${backendApiBase}/zoom/oauth/callback`);
    searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value);
    });

    return NextResponse.redirect(callbackUrl);

  } catch (error) {
    console.error('Unexpected error in Zoom OAuth callback:', error);
    return NextResponse.redirect(
      '/dashboard?error=zoom_callback_error&details=unexpected_error'
    );
  }
}
