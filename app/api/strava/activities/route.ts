import { db } from '@/lib/db';
import { users, stravaActivitiesCache } from '@/schema/db';
import { eq, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getValidStravaToken } from '@/lib/strava';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({
      week: { start: getCurrentWeekStart(), end: '' },
      activities: [],
      weekTotal: { caloriesBurned: 0, distance: 0, movingTime: 0 }
    });
  }

  const userId = (session.user as any).id as string;
  const weekParam = request.nextUrl.searchParams.get('week') || getCurrentWeekStart();
  const forceSync = request.nextUrl.searchParams.get('sync') === 'true';

  try {
    // Check cache first (unless forced sync)
    if (!forceSync) {
      const cached = await db.query.stravaActivitiesCache.findFirst({
        where: and(
          eq(stravaActivitiesCache.userId, userId),
          eq(stravaActivitiesCache.weekStart, weekParam)
        )
      });

      if (cached) {
        return NextResponse.json({
          week: { start: weekParam, end: '' },
          activities: cached.activities,
          weekTotal: cached.weekTotal,
          fromCache: true
        });
      }
    }

    // No cache or forced sync - fetch from Strava
    const stravaToken = await getValidStravaToken(userId);
    const weekStart = new Date(weekParam);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const after = Math.floor(weekStart.getTime() / 1000);
    const before = Math.floor(weekEnd.getTime() / 1000);

    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=30`,
      {
        headers: { Authorization: `Bearer ${stravaToken}` },
      }
    );

    if (!response.ok) {
      const responseBody = await response.text();
      console.error(
        `Strava API error: ${response.status} ${response.statusText}`,
        responseBody.substring(0, 500)
      );

      return NextResponse.json({
        week: { start: weekParam, end: weekEnd.toISOString().split('T')[0] },
        activities: [],
        weekTotal: { caloriesBurned: 0, distance: 0, movingTime: 0 }
      });
    }

    let activities = await response.json();

    // Fetch detailed data for each activity (includes calories)
    // Only fetch details for current week to avoid rate limiting on past weeks
    if (weekParam === getCurrentWeekStart()) {
      activities = await Promise.all(
        activities.map(async (activity: any) => {
          const detailResponse = await fetch(`https://www.strava.com/api/v3/activities/${activity.id}`, {
            headers: { Authorization: `Bearer ${stravaToken}` },
          });
          if (detailResponse.ok) {
            return await detailResponse.json();
          }
          return activity;
        })
      );
    }

    function estimateCalories(activity: any): number {
      if (activity.calories && activity.calories > 0) {
        return Math.round(activity.calories);
      }

      if (activity.kilojoules && activity.kilojoules > 0) {
        return Math.round(activity.kilojoules / 4.184);
      }

      if (activity.weighted_average_watts && activity.moving_time) {
        const kilojoules = (activity.weighted_average_watts * activity.moving_time) / 1000;
        return Math.round(kilojoules / 4.184);
      }

      const minutes = activity.moving_time / 60;
      const activityType = activity.type?.toLowerCase() || '';

      let caloriesPerMinute = 0;
      if (activityType.includes('run')) {
        caloriesPerMinute = 12;
      } else if (activityType.includes('ride')) {
        caloriesPerMinute = 8;
      } else if (activityType.includes('swim')) {
        caloriesPerMinute = 10;
      } else {
        caloriesPerMinute = 7;
      }

      return Math.round(minutes * caloriesPerMinute);
    }

    const mappedActivities = activities.map((a: any) => ({
      stravaId: a.id,
      date: a.start_date_local?.split('T')[0],
      type: a.type,
      name: a.name,
      durationMinutes: Math.round(a.moving_time / 60),
      caloriesBurned: estimateCalories(a),
    }));

    const weekTotal = activities.reduce(
      (acc: any, activity: any) => ({
        caloriesBurned: (acc.caloriesBurned || 0) + estimateCalories(activity),
        distance: (acc.distance || 0) + (activity.distance || 0),
        movingTime: (acc.movingTime || 0) + (activity.moving_time || 0),
      }),
      { caloriesBurned: 0, distance: 0, movingTime: 0 }
    );

    // Cache the result
    await db
      .insert(stravaActivitiesCache)
      .values({
        userId,
        weekStart: weekParam,
        activities: mappedActivities,
        weekTotal,
      })
      .onConflictDoUpdate({
        target: [stravaActivitiesCache.userId, stravaActivitiesCache.weekStart],
        set: {
          activities: mappedActivities,
          weekTotal,
          cachedAt: new Date(),
        },
      });

    return NextResponse.json({
      week: { start: weekParam, end: weekEnd.toISOString().split('T')[0] },
      activities: mappedActivities,
      weekTotal,
    });
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    console.error('Strava activities error:', errorMessage, error);

    if (errorMessage.includes('not connected')) {
      return NextResponse.json({ error: 'Strava not connected', details: errorMessage }, { status: 401 });
    }
    if (errorMessage.includes('expired') || errorMessage.includes('refresh failed')) {
      return NextResponse.json({ error: 'Strava reconnect required', details: errorMessage }, { status: 401 });
    }

    return NextResponse.json({
      week: { start: getCurrentWeekStart(), end: '' },
      activities: [],
      weekTotal: { caloriesBurned: 0, distance: 0, movingTime: 0 },
      error: errorMessage
    });
  }
}

function getCurrentWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - daysFromMonday);
  return monday.toISOString().split('T')[0];
}
