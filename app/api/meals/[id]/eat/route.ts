import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { userMeals, mealIngredients, userGroceryInventory, users } from '@/schema/db';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { eatMealSchema, formatValidationError } from '@/lib/validation';

// POST /api/meals/[id]/eat - Consume a meal and update grocery consumption
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const mealId = (await params).id;
    const body = await req.json();

    // Validate with Zod
    const validationResult = eatMealSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = formatValidationError(validationResult.error);
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { dateConsumed } = validationResult.data;
    // If dateConsumed is provided as YYYY-MM-DD, use it directly as the weekStart
    // Otherwise, calculate it from the current date
    const consumedWeekStartFromParam = dateConsumed ? dateConsumed : null;
    const consumedDate = dateConsumed ? new Date(dateConsumed) : new Date();

    // Verify meal belongs to user and get its ingredients
    const meal = await db.query.userMeals.findFirst({
      where: and(eq(userMeals.id, mealId as any), eq(userMeals.userId, userId as any)),
      with: {
        ingredients: {
          with: {
            grocery: true,
          },
        },
      },
    });

    if (!meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    if (meal.ingredients.length === 0) {
      return NextResponse.json({ error: 'Meal has no ingredients' }, { status: 400 });
    }

    // Helper to get week start from a date
    function getWeekStart(date: Date = new Date()): string {
      const d = new Date(date);
      const dayOfWeek = d.getUTCDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - daysFromMonday);
      return monday.toISOString().split('T')[0];
    }

    // Use dateConsumed directly if provided, otherwise calculate from consumedDate
    const consumedWeekStart = consumedWeekStartFromParam || getWeekStart(consumedDate);

    // For each ingredient, calculate the amount consumed and update the grocery
    const updatedGroceries = [];

    for (const mealIng of meal.ingredients) {
      const grocery = mealIng.grocery;
      const quantityBought = parseFloat(grocery.quantityBought.toString());
      const currentConsumed = parseFloat((grocery.percentConsumed || '0').toString());

      // Calculate how much of this ingredient was used in the meal
      const quantityUsed = parseFloat(mealIng.quantityUsed.toString());

      // Calculate percentage of this grocery that was consumed
      const percentUsed = (quantityUsed / quantityBought) * 100;
      const newPercentConsumed = Math.min(100, currentConsumed + percentUsed);

      // Update consumedByWeek tracking for the specific week
      const consumedByWeek = (grocery.consumedByWeek as any) || {};
      const weekConsumption = parseFloat((consumedByWeek[consumedWeekStart] || '0').toString());
      consumedByWeek[consumedWeekStart] = weekConsumption + percentUsed;

      // Update the grocery - track consumption per week
      const updated = await db
        .update(userGroceryInventory)
        .set({
          percentConsumed: newPercentConsumed.toString() as any,
          consumedByWeek: consumedByWeek as any,
          updatedAt: consumedDate,
        })
        .where(eq(userGroceryInventory.id, grocery.id as any))
        .returning();

      if (updated.length > 0) {
        updatedGroceries.push(updated[0]);
      }
    }

    // Fetch user goals and calculate total consumed macros for response
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId as any),
    });

    // Get all groceries for that week to calculate totals
    const weekGroceries = await db.query.userGroceryInventory.findMany({
      where: and(
        eq(userGroceryInventory.userId, userId as any),
        eq(userGroceryInventory.weekStart, consumedWeekStart as any)
      ),
    });

    // Calculate consumed macros for the week
    const totals = weekGroceries.reduce(
      (acc, g) => {
        const consumed = (parseFloat((g.percentConsumed || '0').toString()) / 100) || 0;
        return {
          caloriesBought: acc.caloriesBought + (parseFloat((g.totalCalories || '0').toString()) || 0),
          caloriesConsumed: acc.caloriesConsumed + (parseFloat((g.totalCalories || '0').toString()) || 0) * consumed,
          proteinBought: acc.proteinBought + (parseFloat((g.proteinG || '0').toString()) || 0),
          proteinConsumed: acc.proteinConsumed + (parseFloat((g.proteinG || '0').toString()) || 0) * consumed,
          carbsBought: acc.carbsBought + (parseFloat((g.carbsG || '0').toString()) || 0),
          carbsConsumed: acc.carbsConsumed + (parseFloat((g.carbsG || '0').toString()) || 0) * consumed,
          fatBought: acc.fatBought + (parseFloat((g.fatG || '0').toString()) || 0),
          fatConsumed: acc.fatConsumed + (parseFloat((g.fatG || '0').toString()) || 0) * consumed,
        };
      },
      {
        caloriesBought: 0,
        caloriesConsumed: 0,
        proteinBought: 0,
        proteinConsumed: 0,
        carbsBought: 0,
        carbsConsumed: 0,
        fatBought: 0,
        fatConsumed: 0,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Meal "${meal.mealName}" consumed and groceries updated`,
      dateConsumed: consumedDate.toISOString().split('T')[0],
      updatedGroceries: updatedGroceries.map(g => ({
        id: g.id,
        foodName: g.foodName,
        percentConsumed: Number(g.percentConsumed),
        totalCalories: g.totalCalories ? Number(g.totalCalories) : null,
        proteinG: g.proteinG ? Number(g.proteinG) : null,
        carbsG: g.carbsG ? Number(g.carbsG) : null,
        fatG: g.fatG ? Number(g.fatG) : null,
      })),
      weekTotals: {
        week: { start: consumedWeekStart, end: getWeekEnd(consumedWeekStart) },
        totals,
        goals: {
          dailyCalories: parseInt(user?.dailyCalGoal || '2000'),
          dailyProtein: parseFloat(user?.dailyProteinG || '150'),
          dailyCarbs: parseFloat(user?.dailyCarbsG || '200'),
          dailyFat: parseFloat(user?.dailyFatG || '65'),
        },
      },
    });
  } catch (error) {
    console.error('Error consuming meal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - daysFromMonday);
  return monday.toISOString().split('T')[0];
}

function getWeekEnd(weekStart: string): string {
  const date = new Date(weekStart);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().split('T')[0];
}
