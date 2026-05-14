import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { userMeals, mealIngredients, userGroceryInventory } from '@/schema/db';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { updateMealSchema, formatValidationError } from '@/lib/validation';

// GET /api/meals/[id] - Get single meal
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const mealId = (await params).id;

    // Fetch the meal
    const meal = await db.query.userMeals.findFirst({
      where: and(eq(userMeals.id, mealId as any), eq(userMeals.userId, userId as any)),
      with: {
        ingredients: true,
      },
    });

    if (!meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    // Fetch groceries
    const groceries = await db.query.userGroceryInventory.findMany({
      where: eq(userGroceryInventory.userId, userId as any),
    });
    const groceryMap = new Map(groceries.map(g => [g.id, g]));

    // Format ingredients
    const ingredients = ((meal as any).ingredients || []).map((ing: any) => {
      const grocery = groceryMap.get(ing.groceryId as any);
      return {
        id: ing.id,
        groceryId: ing.groceryId,
        quantityUsed: Number(ing.quantityUsed),
        grocery: grocery ? {
          foodName: grocery.foodName,
          unit: grocery.unit,
          quantityBought: Number(grocery.quantityBought),
          totalCalories: grocery.totalCalories ? Number(grocery.totalCalories) : null,
          proteinG: grocery.proteinG ? Number(grocery.proteinG) : null,
          carbsG: grocery.carbsG ? Number(grocery.carbsG) : null,
          fatG: grocery.fatG ? Number(grocery.fatG) : null,
        } : null,
      };
    });

    // Calculate nutrition totals - account for quantityBought
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    ingredients.forEach((ing: any) => {
      if (ing.grocery) {
        const quantityBought = ing.grocery.quantityBought || 1;
        const caloriesPerUnit = (ing.grocery.totalCalories || 0) / quantityBought;
        const proteinPerUnit = (ing.grocery.proteinG || 0) / quantityBought;
        const carbsPerUnit = (ing.grocery.carbsG || 0) / quantityBought;
        const fatPerUnit = (ing.grocery.fatG || 0) / quantityBought;

        totalCalories += caloriesPerUnit * Number(ing.quantityUsed);
        totalProtein += proteinPerUnit * Number(ing.quantityUsed);
        totalCarbs += carbsPerUnit * Number(ing.quantityUsed);
        totalFat += fatPerUnit * Number(ing.quantityUsed);
      }
    });

    return NextResponse.json(
      {
        id: meal.id,
        mealName: meal.mealName,
        description: meal.description,
        ingredients,
        nutrition: {
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
        },
        createdAt: meal.createdAt,
        updatedAt: meal.updatedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching meal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/meals/[id] - Update meal
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const mealId = (await params).id;
    const body = await req.json();

    // Validate with Zod
    const validationResult = updateMealSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = formatValidationError(validationResult.error);
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Verify meal belongs to user
    const meal = await db.query.userMeals.findFirst({
      where: and(eq(userMeals.id, mealId as any), eq(userMeals.userId, userId as any)),
    });

    if (!meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    const { mealName, description, ingredients } = validationResult.data;

    // Update meal basic info
    const updates: any = {};
    if (mealName !== undefined) updates.mealName = mealName.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db
        .update(userMeals)
        .set(updates)
        .where(eq(userMeals.id, mealId as any));
    }

    // Update ingredients if provided
    if (ingredients !== undefined) {
      // Verify all groceries belong to this user
      const groceryIds = ingredients.map(i => i.groceryId);
      const groceries = await db.query.userGroceryInventory.findMany({
        where: eq(userGroceryInventory.userId, userId as any),
      });
      const userGroceryIds = groceries.map(g => g.id);

      const hasUnauthorizedGrocery = groceryIds.some(id => !userGroceryIds.includes(id));
      if (hasUnauthorizedGrocery) {
        return NextResponse.json({ error: 'One or more groceries not found' }, { status: 404 });
      }

      // Delete existing ingredients
      await db.delete(mealIngredients).where(eq(mealIngredients.mealId, mealId as any));

      // Insert new ingredients
      await db
        .insert(mealIngredients)
        .values(
          ingredients.map(ing => ({
            mealId: mealId as any,
            groceryId: ing.groceryId as any,
            quantityUsed: ing.quantityUsed.toString() as any,
          }))
        );
    }

    // Fetch updated meal with ingredients
    const updatedMeal = await db.query.userMeals.findFirst({
      where: eq(userMeals.id, mealId as any),
      with: {
        ingredients: {
          with: {
            grocery: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: updatedMeal!.id,
      mealName: updatedMeal!.mealName,
      description: updatedMeal!.description,
      ingredients: updatedMeal!.ingredients.map(ing => ({
        id: ing.id,
        groceryId: ing.groceryId,
        quantityUsed: Number(ing.quantityUsed),
        grocery: {
          id: ing.grocery.id,
          foodName: ing.grocery.foodName,
          unit: ing.grocery.unit,
          totalCalories: ing.grocery.totalCalories ? Number(ing.grocery.totalCalories) : null,
          proteinG: ing.grocery.proteinG ? Number(ing.grocery.proteinG) : null,
          carbsG: ing.grocery.carbsG ? Number(ing.grocery.carbsG) : null,
          fatG: ing.grocery.fatG ? Number(ing.grocery.fatG) : null,
        },
      })),
      createdAt: updatedMeal!.createdAt,
      updatedAt: updatedMeal!.updatedAt,
    });
  } catch (error) {
    console.error('Error updating meal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/meals/[id] - Delete meal
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const mealId = (await params).id;

    // Verify meal belongs to user
    const meal = await db.query.userMeals.findFirst({
      where: and(eq(userMeals.id, mealId as any), eq(userMeals.userId, userId as any)),
    });

    if (!meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    // Delete meal (cascade will delete ingredients)
    await db.delete(userMeals).where(eq(userMeals.id, mealId as any));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting meal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
