import { db } from '@/lib/db';
import { userGroceryInventory, users } from '@/schema/db';
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
    return NextResponse.json({ error: 'week required' }, { status: 400 });
  }

  const userId = (session.user as any).id as string;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  // Fetch groceries for the current week
  const weekGroceries = await db.query.userGroceryInventory.findMany({
    where: and(
      eq(userGroceryInventory.userId, userId),
      eq(userGroceryInventory.weekStart, weekStart)
    ),
  });

  // Include current week groceries + unconsumed items from previous week (carryover)
  const previousWeekStart = getPreviousWeekStart(weekStart);
  const previousWeekGroceries = await db.query.userGroceryInventory.findMany({
    where: and(
      eq(userGroceryInventory.userId, userId),
      eq(userGroceryInventory.weekStart, previousWeekStart)
    ),
  });

  const carriedOverItems = previousWeekGroceries.filter(
    (item) => Number(item.percentConsumed) < 100
  );

  // Combine current week + carryover items
  const groceries = [...weekGroceries, ...carriedOverItems];

  // Calculate consumed macros based on THIS WEEK'S consumption only
  const totals = groceries.reduce(
    (acc, g) => {
      const consumedByWeek = (g.consumedByWeek as any) || {};
      // Only count consumption that happened in this specific week
      const weekConsumption = parseFloat((consumedByWeek[weekStart] || '0').toString()) || 0;
      const weekConsumedPercent = weekConsumption / 100;

      // For carryover items, also count what was available (not consumed in previous week)
      let itemConsumedPercent = weekConsumedPercent;
      if (g.weekStart !== weekStart) {
        // This is a carryover item from a previous week
        // Count total consumption so far, which tells us availability
        const totalConsumed = parseFloat((g.percentConsumed || '0').toString()) / 100;
        // But we only count NEW consumption in this week (from consumedByWeek)
        itemConsumedPercent = weekConsumedPercent;
      }

      return {
        caloriesBought: acc.caloriesBought + (parseFloat((g.totalCalories || '0').toString()) || 0),
        caloriesConsumed: acc.caloriesConsumed + (parseFloat((g.totalCalories || '0').toString()) || 0) * itemConsumedPercent,
        proteinBought: acc.proteinBought + (parseFloat((g.proteinG || '0').toString()) || 0),
        proteinConsumed: acc.proteinConsumed + (parseFloat((g.proteinG || '0').toString()) || 0) * itemConsumedPercent,
        carbsBought: acc.carbsBought + (parseFloat((g.carbsG || '0').toString()) || 0),
        carbsConsumed: acc.carbsConsumed + (parseFloat((g.carbsG || '0').toString()) || 0) * itemConsumedPercent,
        fatBought: acc.fatBought + (parseFloat((g.fatG || '0').toString()) || 0),
        fatConsumed: acc.fatConsumed + (parseFloat((g.fatG || '0').toString()) || 0) * itemConsumedPercent,
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
    week: { start: weekStart, end: getWeekEnd(weekStart) },
    totals,
    goals: {
      dailyCalories: parseInt(user?.dailyCalGoal || '2000'),
      dailyProtein: parseFloat(user?.dailyProteinG || '150'),
      dailyCarbs: parseFloat(user?.dailyCarbsG || '200'),
      dailyFat: parseFloat(user?.dailyFatG || '65'),
    },
  });
}

function getPreviousWeekStart(weekStart: string): string {
  const date = new Date(weekStart);
  date.setUTCDate(date.getUTCDate() - 7);
  return date.toISOString().split('T')[0];
}

function getWeekEnd(weekStart: string): string {
  const date = new Date(weekStart);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().split('T')[0];
}
