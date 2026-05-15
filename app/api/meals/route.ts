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
    });

    // Fetch groceries for ingredient details
    const ingredientGroceries = await db.query.userGroceryInventory.findMany({
      where: eq(userGroceryInventory.userId, userId as any),
    });
    const groceryMap = new Map(ingredientGroceries.map(g => [g.id, g]));

    const formattedIngredients = ingredientDetails.map(ing => ({
      id: ing.id,
      groceryId: ing.groceryId,
      quantityUsed: Number(ing.quantityUsed),
      grocery: groceryMap.get(ing.groceryId as any),
    }));

    // Calculate nutrition totals - account for quantityBought
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    formattedIngredients.forEach((ing) => {
      if (ing.grocery) {
        const quantityBought = Number(ing.grocery.quantityBought) || 1;
        const caloriesPerUnit = (Number(ing.grocery.totalCalories) || 0) / quantityBought;
        const proteinPerUnit = (Number(ing.grocery.proteinG) || 0) / quantityBought;
        const carbsPerUnit = (Number(ing.grocery.carbsG) || 0) / quantityBought;
        const fatPerUnit = (Number(ing.grocery.fatG) || 0) / quantityBought;

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
        ingredients: formattedIngredients,
        nutrition: {
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
        },
        createdAt: meal.createdAt,
        updatedAt: meal.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating meal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/meals - List all user meals
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Fetch all meals for the user with their ingredients
    const meals = await db.query.userMeals.findMany({
      where: eq(userMeals.userId, userId as any),
      with: {
        ingredients: true,
      },
    });

    // Fetch groceries to get food names
    const groceries = await db.query.userGroceryInventory.findMany({
      where: eq(userGroceryInventory.userId, userId as any),
    });
    const groceryMap = new Map(groceries.map(g => [g.id, g]));

    const formattedMeals = meals.map(meal => {
      const ingredients = ((meal as any).ingredients || []).map((ing: any) => ({
        id: ing.id,
        groceryId: ing.groceryId,
        quantityUsed: Number(ing.quantityUsed),
        grocery: groceryMap.get(ing.groceryId as any),
      }));

      // Calculate nutrition totals - account for quantityBought
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      ingredients.forEach((ing: any) => {
        if (ing.grocery) {
          const quantityBought = Number(ing.grocery.quantityBought) || 1;
          const caloriesPerUnit = (Number(ing.grocery.totalCalories) || 0) / quantityBought;
          const proteinPerUnit = (Number(ing.grocery.proteinG) || 0) / quantityBought;
          const carbsPerUnit = (Number(ing.grocery.carbsG) || 0) / quantityBought;
          const fatPerUnit = (Number(ing.grocery.fatG) || 0) / quantityBought;

          totalCalories += caloriesPerUnit * Number(ing.quantityUsed);
          totalProtein += proteinPerUnit * Number(ing.quantityUsed);
          totalCarbs += carbsPerUnit * Number(ing.quantityUsed);
          totalFat += fatPerUnit * Number(ing.quantityUsed);
        }
      });

      return {
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
      };
    });

    return NextResponse.json(formattedMeals, { status: 200 });
  } catch (error) {
    console.error('Error fetching meals:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
