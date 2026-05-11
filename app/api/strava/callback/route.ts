import { db } from '@/lib/db';
import { users } from '@/schema/db';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/signin`);
  }

  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/groceries/settings?error=no_code`);
  }

  try {
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error('No access token');
    }

    // Store token in DB
    const userId = (session.user as any).id as string;
    await db
      .update(users)
      .set({
        stravaToken: tokenData.access_token,
        stravaRefreshToken: tokenData.refresh_token,
        stravaUserId: tokenData.athlete.id.toString(),
        stravaTokenExpiresAt: new Date(tokenData.expires_at * 1000),
      })
      .where(eq(users.id, userId));

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/groceries/settings?strava_connected=true`);
  } catch (error) {
    console.error('Strava callback error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/groceries/settings?error=strava_error`);
  }
}
