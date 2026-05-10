import { db } from '@/lib/db';
import { users } from '@/schema/db';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      dailyCalGoal,
      dailyProteinG,
      dailyCarbsG,
      dailyFatG,
    } = body;

    // Validation
    if (dailyCalGoal !== undefined && (dailyCalGoal < 1000 || dailyCalGoal > 5000)) {
      return NextResponse.json(
        { error: 'Daily calorie goal must be between 1000 and 5000' },
        { status: 400 }
      );
    }

    if (dailyProteinG !== undefined && (dailyProteinG < 20 || dailyProteinG > 500)) {
      return NextResponse.json(
        { error: 'Daily protein goal must be between 20g and 500g' },
        { status: 400 }
      );
    }

    if (dailyCarbsG !== undefined && (dailyCarbsG < 50 || dailyCarbsG > 800)) {
      return NextResponse.json(
        { error: 'Daily carbs goal must be between 50g and 800g' },
        { status: 400 }
      );
    }

    if (dailyFatG !== undefined && (dailyFatG < 10 || dailyFatG > 200)) {
      return NextResponse.json(
        { error: 'Daily fat goal must be between 10g and 200g' },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id as string;

    // Build update object - only include provided fields
    const updateData: any = {};
    if (dailyCalGoal !== undefined) updateData.dailyCalGoal = dailyCalGoal.toString();
    if (dailyProteinG !== undefined) updateData.dailyProteinG = dailyProteinG.toString();
    if (dailyCarbsG !== undefined) updateData.dailyCarbsG = dailyCarbsG.toString();
    if (dailyFatG !== undefined) updateData.dailyFatG = dailyFatG.toString();
    updateData.updatedAt = new Date();

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      dailyCalGoal: parseInt(updatedUser.dailyCalGoal || '2000'),
      dailyProteinG: parseFloat(updatedUser.dailyProteinG || '150'),
      dailyCarbsG: parseFloat(updatedUser.dailyCarbsG || '200'),
      dailyFatG: parseFloat(updatedUser.dailyFatG || '65'),
    });
  } catch (error) {
    console.error('Goals update error:', error);
    return NextResponse.json(
      { error: 'Failed to update goals' },
      { status: 500 }
    );
  }
}
