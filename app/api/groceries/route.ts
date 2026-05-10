import { db } from '@/lib/db';
import { userGroceryInventory } from '@/schema/db';
import { eq, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const weekStart = request.nextUrl.searchParams.get('week');
  if (!weekStart) {
    return NextResponse.json({ error: 'week parameter required' }, { status: 400 });
  }

  const groceries = await db.query.userGroceryInventory.findMany({
    where: and(
      eq(userGroceryInventory.userId, session.user.id as string),
      eq(userGroceryInventory.weekStart, weekStart)
    ),
  });

  return NextResponse.json({ groceries });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { foodName, quantityBought, unit, nutrition, dateAdded, weekStart } = body;

  if (!foodName || !quantityBought || !nutrition) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const totalCalories = parseFloat(nutrition.calories) * parseFloat(quantityBought);

  const result = await db
    .insert(userGroceryInventory)
    .values({
      userId: session.user.id as string,
      foodName,
      quantityBought: quantityBought.toString(),
      unit,
      proteinG: nutrition.protein?.toString(),
      carbsG: nutrition.carbs?.toString(),
      fatG: nutrition.fat?.toString(),
      caloriesPerUnit: nutrition.calories?.toString(),
      totalCalories: totalCalories.toString(),
      dateAdded,
      weekStart,
      percentConsumed: '0',
    })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}
