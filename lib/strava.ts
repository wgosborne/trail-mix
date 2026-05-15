import { db } from './db';
import { users } from '@/schema/db';
import { eq } from 'drizzle-orm';

/**
 * Get a valid Strava OAuth token for the user, refreshing if necessary.
 * Uses a 5-minute buffer to prevent token expiration during use.
 * Throws an error if Strava is not connected or refresh fails.
 */
export async function getValidStravaToken(userId: string): Promise<string> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || !user.stravaToken) {
    throw new Error('Strava not connected');
  }

  const now = new Date();
  const bufferMs = 5 * 60 * 1000;
  const expiryWithBuffer = new Date((user.stravaTokenExpiresAt?.getTime() || 0) - bufferMs);

  if (expiryWithBuffer > now) {
    console.log(`[Strava] Token valid until ${user.stravaTokenExpiresAt}`);
    return user.stravaToken;
  }

  console.log(`[Strava] Token expired at ${user.stravaTokenExpiresAt}, attempting refresh...`);

  if (!user.stravaRefreshToken) {
    throw new Error('Strava token expired - please reconnect');
  }

  try {
    const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: user.stravaRefreshToken,
      }),
    });

    if (!refreshResponse.ok) {
      const errorBody = await refreshResponse.text();
      console.error(`[Strava] Refresh failed: ${refreshResponse.status}`, errorBody.substring(0, 500));
      throw new Error(`Strava refresh failed with status ${refreshResponse.status}`);
    }

    const newTokenData = await refreshResponse.json();
    if (!newTokenData.access_token || !newTokenData.refresh_token) {
      console.error('[Strava] Refresh response missing tokens:', newTokenData);
      throw new Error('Strava refresh response missing tokens');
    }

    console.log(`[Strava] Token refreshed successfully, expires at ${new Date(newTokenData.expires_at * 1000)}`);

    await db
      .update(users)
      .set({
        stravaToken: newTokenData.access_token,
        stravaRefreshToken: newTokenData.refresh_token,
        stravaTokenExpiresAt: new Date(newTokenData.expires_at * 1000),
      })
      .where(eq(users.id, userId));

    return newTokenData.access_token;
  } catch (error) {
    console.error('Strava token refresh error:', error);
    throw new Error('Strava token refresh failed');
  }
}
