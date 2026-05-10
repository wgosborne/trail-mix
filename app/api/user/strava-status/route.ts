import { db } from '@/lib/db';
import { users } from '@/schema/db';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = (session.user as any).id as string;
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    return NextResponse.json({
      isConnected: !!user?.stravaToken,
      stravaUserId: user?.stravaUserId || null,
    });
  } catch (error) {
    console.error('Strava status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
