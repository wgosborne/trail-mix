import { db } from '@/lib/db';
import { users } from '@/schema/db';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { userGoalsSchema, formatValidationError } from '@/lib/validation';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate with Zod (partial validation - only provided fields matter)
    const validationResult = userGoalsSchema.partial().safeParse(body);
    if (!validationResult.success) {
      const errorMessage = formatValidationError(validationResult.error);
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const {
      dailyCalGoal,
      dailyProteinG,
      dailyCarbsG,
      dailyFatG,
    } = validationResult.data;

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
