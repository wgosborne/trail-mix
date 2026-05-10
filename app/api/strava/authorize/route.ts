import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const state = Math.random().toString(36).substring(7);
  const scope = 'activity:read_all';
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/strava/callback`;

  const authUrl = new URL('https://www.strava.com/oauth/authorize');
  authUrl.searchParams.append('client_id', process.env.STRAVA_CLIENT_ID!);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', scope);
  authUrl.searchParams.append('state', state);

  return NextResponse.redirect(authUrl);
}
