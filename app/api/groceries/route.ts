import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { userGroceryInventory } from '@/schema/db';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { grocerySchema, formatValidationError } from '@/lib/validation';
import { z } from 'zod';
import { upsertLookup } from '@/lib/grocery-lookup';

// Helper function to calculate week start from a date
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d.setUTCDate(diff));
  return monday.toISOString().split('T')[0];
}

// Helper function to get the previous week's Monday
function getPreviousWeekStart(weekStart: string): string {
  const date = new Date(weekStart);
  date.setUTCDate(date.getUTCDate() - 7);
  return date.toISOString().split('T')[0];
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

    // Validate with Zod
    const validationResult = grocerySchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = formatValidationError(validationResult.error);
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { foodName, quantityBought, unit, totalCalories, proteinG, carbsG, fatG, dateAdded } = validationResult.data;

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
        quantityBought: quantityBought.toString() as any,
        unit: unit.trim(),
        percentConsumed: 0 as any,
        totalCalories: totalCalories ? totalCalories.toString() : null,
        proteinG: proteinG ? proteinG.toString() : null,
        carbsG: carbsG ? carbsG.toString() : null,
        fatG: fatG ? fatG.toString() : null,
        fiberG: body.fiberG ? parseFloat(body.fiberG).toString() : null,
        dateAdded: dateAddedStr as any,
        weekStart: weekStart as any,
      })
      .returning();

    const grocery = result[0];

    // Cache nutrition data in the lookup table for future lookups
    await upsertLookup(
      foodName,
      unit,
      {
        calories: totalCalories !== null && totalCalories !== undefined ? Number(totalCalories) : null,
        proteinG: proteinG !== null && proteinG !== undefined ? Number(proteinG) : null,
        carbsG: carbsG !== null && carbsG !== undefined ? Number(carbsG) : null,
        fatG: fatG !== null && fatG !== undefined ? Number(fatG) : null,
        fiberG: body.fiberG !== null && body.fiberG !== undefined ? parseFloat(body.fiberG) : null,
      },
      'user'
    );

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

    // Fetch unconsumed items from the previous week to carry over
    const previousWeekStart = getPreviousWeekStart(weekStart);
    const unconsumedFromPrevious = await db.query.userGroceryInventory.findMany({
      where: and(
        eq(userGroceryInventory.userId, userId),
        eq(userGroceryInventory.weekStart, previousWeekStart as any)
      ),
    });

    // Filter to only unconsumed items (percentConsumed < 100)
    const carriedOverItems = unconsumedFromPrevious
      .filter((item) => Number(item.percentConsumed) < 100)
      .map((item) => ({
        ...item,
        percentConsumed: 0 as any, // Reset consumption for the new week
      }));

    // Combine current week items with carried-over items
    const allGroceries = [...groceries, ...carriedOverItems];

    const formattedGroceries = allGroceries.map((g) => ({
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
