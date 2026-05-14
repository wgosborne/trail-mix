import { db } from '@/lib/db';
import { users } from '@/schema/db';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getValidStravaToken } from '@/lib/strava';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  try {
    const stravaToken = await getValidStravaToken(userId);

    const weekParam = request.nextUrl.searchParams.get('week') || getCurrentWeekStart();
    const weekStart = new Date(weekParam);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const after = Math.floor(weekStart.getTime() / 1000);
    const before = Math.floor(weekEnd.getTime() / 1000);

    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=30`,
      {
        headers: { Authorization: `Bearer ${stravaToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Strava API error');
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

    // Helper function to estimate calories from Strava data
    function estimateCalories(activity: any): number {
      // If Strava provides explicit calories, use it
      if (activity.calories && activity.calories > 0) {
        return Math.round(activity.calories);
      }

      // Estimate from kilojoules (1 kilocalorie = 4.184 kilojoules)
      if (activity.kilojoules && activity.kilojoules > 0) {
        return Math.round(activity.kilojoules / 4.184);
      }

      // Estimate from power data and time
      if (activity.weighted_average_watts && activity.moving_time) {
        // Power (watts) * Time (seconds) / 1000 = kilojoules
        // Then convert to kcal: kilojoules / 4.184
        const kilojoules = (activity.weighted_average_watts * activity.moving_time) / 1000;
        return Math.round(kilojoules / 4.184);
      }

      // Fallback: rough estimation based on activity type and duration
      const minutes = activity.moving_time / 60;
      const activityType = activity.type?.toLowerCase() || '';

      let caloriesPerMinute = 0;
      if (activityType.includes('run')) {
        caloriesPerMinute = 12; // ~12 cal/min for running
      } else if (activityType.includes('ride')) {
        caloriesPerMinute = 8; // ~8 cal/min for cycling
      } else if (activityType.includes('swim')) {
        caloriesPerMinute = 10; // ~10 cal/min for swimming
      } else {
        caloriesPerMinute = 7; // ~7 cal/min for general activities
      }

      return Math.round(minutes * caloriesPerMinute);
    }

    const weekTotal = activities.reduce(
      (acc: any, activity: any) => ({
        caloriesBurned: (acc.caloriesBurned || 0) + estimateCalories(activity),
        distance: (acc.distance || 0) + (activity.distance || 0),
        movingTime: (acc.movingTime || 0) + (activity.moving_time || 0),
      }),
      { caloriesBurned: 0, distance: 0, movingTime: 0 }
    );

    return NextResponse.json({
      week: { start: weekParam, end: weekEnd.toISOString().split('T')[0] },
      activities: activities.map((a: any) => ({
        stravaId: a.id,
        date: a.start_date_local?.split('T')[0],
        type: a.type,
        name: a.name,
        durationMinutes: Math.round(a.moving_time / 60),
        caloriesBurned: estimateCalories(a),
      })),
      weekTotal,
    });
  } catch (error: any) {
    console.error('Strava activities error:', error);
    if (error.message?.includes('not connected')) {
      return NextResponse.json({ error: 'Strava not connected' }, { status: 401 });
    }
    if (error.message?.includes('expired') || error.message?.includes('refresh failed')) {
      return NextResponse.json({ error: 'Strava reconnect required' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 503 });
  }
}

function getCurrentWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysFromMonday);
  return monday.toISOString().split('T')[0];
}
