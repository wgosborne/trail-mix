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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      stravaUserId: user.stravaUserId || null,
      stravaToken: !!user.stravaToken,
      dailyCalGoal: parseInt(user.dailyCalGoal || '2000'),
      dailyProteinG: parseFloat(user.dailyProteinG || '150'),
      dailyCarbsG: parseFloat(user.dailyCarbsG || '200'),
      dailyFatG: parseFloat(user.dailyFatG || '65'),
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
