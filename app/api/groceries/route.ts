import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { userGroceryInventory } from '@/schema/db';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// Helper function to calculate week start from a date
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d.setUTCDate(diff));
  return monday.toISOString().split('T')[0];
}

// POST /api/groceries - Create new grocery
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();

    // Validate required fields
    const { foodName, quantityBought, unit, totalCalories, proteinG, carbsG, fatG, dateAdded } = body;

    if (!foodName || quantityBought === undefined || !unit) {
      return NextResponse.json(
        { error: 'Missing required fields: foodName, quantityBought, unit' },
        { status: 400 }
      );
    }

    // Validate numeric fields
    const qty = parseFloat(quantityBought);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'quantityBought must be a positive number' }, { status: 400 });
    }

    // Calculate week start
    const date = dateAdded ? new Date(dateAdded) : new Date();
    const weekStart = getWeekStart(date);
    const dateAddedStr = date.toISOString().split('T')[0];

    // Create grocery record
    const result = await db
      .insert(userGroceryInventory)
      .values({
        userId: userId as any,
        foodName: foodName.trim(),
        quantityBought: qty.toString() as any,
        unit: unit.trim(),
        percentConsumed: 0 as any,
        totalCalories: totalCalories ? parseFloat(totalCalories).toString() : null,
        proteinG: proteinG ? parseFloat(proteinG).toString() : null,
        carbsG: carbsG ? parseFloat(carbsG).toString() : null,
        fatG: fatG ? parseFloat(fatG).toString() : null,
        fiberG: body.fiberG ? parseFloat(body.fiberG).toString() : null,
        dateAdded: dateAddedStr as any,
        weekStart: weekStart as any,
      })
      .returning();

    const grocery = result[0];

    return NextResponse.json(
      {
        id: grocery.id,
        foodName: grocery.foodName,
        quantityBought: Number(grocery.quantityBought),
        unit: grocery.unit,
        percentConsumed: Number(grocery.percentConsumed),
        totalCalories: grocery.totalCalories ? Number(grocery.totalCalories) : null,
        proteinG: grocery.proteinG ? Number(grocery.proteinG) : null,
        carbsG: grocery.carbsG ? Number(grocery.carbsG) : null,
        fatG: grocery.fatG ? Number(grocery.fatG) : null,
        fiberG: grocery.fiberG ? Number(grocery.fiberG) : null,
        dateAdded: grocery.dateAdded,
        weekStart: grocery.weekStart,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating grocery:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/groceries - Fetch groceries for authenticated user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get weekStart query param or calculate current week
    const searchParams = req.nextUrl.searchParams;
    const weekStartParam = searchParams.get('weekStart');
    const weekStart = weekStartParam || getWeekStart();

    // Fetch groceries for the specified week
    const groceries = await db.query.userGroceryInventory.findMany({
      where: and(eq(userGroceryInventory.userId, userId), eq(userGroceryInventory.weekStart, weekStart as any)),
    });

    const formattedGroceries = groceries.map((g) => ({
      id: g.id,
      foodName: g.foodName,
      quantityBought: Number(g.quantityBought),
      unit: g.unit,
      percentConsumed: Number(g.percentConsumed),
      totalCalories: g.totalCalories ? Number(g.totalCalories) : null,
      proteinG: g.proteinG ? Number(g.proteinG) : null,
      carbsG: g.carbsG ? Number(g.carbsG) : null,
      fatG: g.fatG ? Number(g.fatG) : null,
      fiberG: g.fiberG ? Number(g.fiberG) : null,
      dateAdded: g.dateAdded,
      weekStart: g.weekStart,
    }));

    return NextResponse.json(formattedGroceries, { status: 200 });
  } catch (error) {
    console.error('Error fetching groceries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
