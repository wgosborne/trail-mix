import { db } from '@/lib/db';
import { users } from '@/schema/db';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user?.stravaToken) {
    return NextResponse.json({ error: 'Strava not connected' }, { status: 401 });
  }

  try {
    const weekParam = request.nextUrl.searchParams.get('week') || getCurrentWeekStart();
    const weekStart = new Date(weekParam);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const after = Math.floor(weekStart.getTime() / 1000);
    const before = Math.floor(weekEnd.getTime() / 1000);

    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=30`,
      {
        headers: { Authorization: `Bearer ${user.stravaToken}` },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ error: 'Strava token expired' }, { status: 401 });
      }
      throw new Error('Strava API error');
    }

    const activities = await response.json();

    const weekTotal = activities.reduce(
      (acc: any, activity: any) => ({
        caloriesBurned: (acc.caloriesBurned || 0) + (activity.calories || 0),
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
        durationMinutes: Math.round(a.moving_time / 60),
        caloriesBurned: a.calories || 0,
      })),
      weekTotal,
    });
  } catch (error) {
    console.error('Strava activities error:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 503 });
  }
}

function getCurrentWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d.setUTCDate(diff));
  return monday.toISOString().split('T')[0];
}
