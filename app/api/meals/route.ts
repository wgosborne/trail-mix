import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { userMeals, mealIngredients, userGroceryInventory } from '@/schema/db';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { createMealSchema, updateMealSchema, formatValidationError } from '@/lib/validation';

// POST /api/meals - Create new meal
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();

    // Validate with Zod
    const validationResult = createMealSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = formatValidationError(validationResult.error);
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { mealName, description, ingredients } = validationResult.data;

    // Verify all groceries belong to this user
    const groceryIds = ingredients.map(i => i.groceryId);
    const groceries = await db.query.userGroceryInventory.findMany({
      where: and(eq(userGroceryInventory.userId, userId as any)),
    });
    const userGroceryIds = groceries.map(g => g.id);

    const hasUnauthorizedGrocery = groceryIds.some(id => !userGroceryIds.includes(id));
    if (hasUnauthorizedGrocery) {
      return NextResponse.json({ error: 'One or more groceries not found' }, { status: 404 });
    }

    // Create meal
    const mealResult = await db
      .insert(userMeals)
      .values({
        userId: userId as any,
        mealName: mealName.trim(),
        description: description ? description.trim() : null,
      })
      .returning();

    const meal = mealResult[0];

    // Create meal ingredients
    const ingredientResults = await db
      .insert(mealIngredients)
      .values(
        ingredients.map(ing => ({
          mealId: meal.id as any,
          groceryId: ing.groceryId as any,
          quantityUsed: ing.quantityUsed.toString() as any,
        }))
      )
      .returning();

    // Fetch ingredient details for response
    const ingredientDetails = await db.query.mealIngredients.findMany({
      where: eq(mealIngredients.mealId, meal.id as any),
      with: {
        grocery: true,
      },
    });

    return NextResponse.json(
      {
        id: meal.id,
        mealName: meal.mealName,
        description: meal.description,
        ingredients: ingredientDetails.map(ing => ({
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
        createdAt: meal.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating meal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/meals - List all user meals with ingredient details
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Fetch all meals for the user
    const meals = await db.query.userMeals.findMany({
      where: eq(userMeals.userId, userId as any),
      with: {
        ingredients: {
          with: {
            grocery: true,
          },
        },
      },
    });

    const formattedMeals = meals.map(meal => ({
      id: meal.id,
      mealName: meal.mealName,
      description: meal.description,
      ingredients: meal.ingredients.map(ing => ({
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
      createdAt: meal.createdAt,
      updatedAt: meal.updatedAt,
    }));

    return NextResponse.json(formattedMeals, { status: 200 });
  } catch (error) {
    console.error('Error fetching meals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
